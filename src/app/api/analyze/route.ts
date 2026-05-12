import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { parseTransactionsFromText } from '@/lib/pdf/parser'
import { scoreSubscriptions } from '@/lib/scoring/engine'
import { extractTextFromPdf } from '@/lib/pdf/extract'
import { rateLimit } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'
import { RATE_LIMIT } from '@/config'
import type { ApiResponse, AnalysisResult } from '@/types'

const limiter = rateLimit(RATE_LIMIT.analyze)
const AnalyzeSchema = z.object({ upload_id: z.string().uuid() })

export const runtime = 'nodejs'
export const maxDuration = 30

export async function POST(req: NextRequest): Promise<NextResponse<ApiResponse<AnalysisResult>>> {
  const limited = limiter(req)
  if (limited) return limited as NextResponse<ApiResponse<AnalysisResult>>

  try {
    const body: unknown = await req.json()
    const parsed = AnalyzeSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ success: false, error: 'upload_id invalide.' }, { status: 400 })

    const { upload_id } = parsed.data
    const supabase = await createSupabaseServerClient()

    const { data: upload, error: uploadError } = await supabase.from('uploads').select('*').eq('id', upload_id).single()
    if (uploadError || !upload) return NextResponse.json({ success: false, error: 'Upload introuvable.' }, { status: 404 })

    await supabase.from('uploads').update({ status: 'processing' }).eq('id', upload_id)

    const { data: fileData, error: downloadError } = await supabase.storage.from('pdfs').download(upload.file_path as string)
    if (downloadError || !fileData) {
      await supabase.from('uploads').update({ status: 'error', error_msg: 'Download failed' }).eq('id', upload_id)
      return NextResponse.json({ success: false, error: 'Impossible de lire le fichier.' }, { status: 500 })
    }

    const buffer = Buffer.from(await fileData.arrayBuffer())
    const pdfText = await extractTextFromPdf(buffer)

    const transactions = parseTransactionsFromText(pdfText, upload_id)
    if (transactions.length === 0) {
      await supabase.from('uploads').update({ status: 'error', error_msg: 'No transactions found' }).eq('id', upload_id)
      return NextResponse.json({ success: false, error: 'Aucune transaction détectée dans ce PDF.' }, { status: 422 })
    }

    const { subscriptions, insight } = scoreSubscriptions(transactions, upload_id)

    if (transactions.length > 0) await supabase.from('transactions').insert(transactions)
    if (subscriptions.length > 0) await supabase.from('subscriptions').insert(subscriptions)

    await supabase.from('insights').insert({ ...insight, upload_id })
    await supabase.from('uploads').update({ status: 'done', result: insight }).eq('id', upload_id)

    logger.info('Analysis complete', { upload_id, transactions: transactions.length })
    return NextResponse.json({ success: true, data: { insight, subscriptions } })
  } catch (err) {
    logger.error('Analyze route error', err instanceof Error ? err : new Error(String(err)))
    return NextResponse.json({ success: false, error: 'Erreur analyse.' }, { status: 500 })
  }
}
