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
    if (!parsed.success) return NextResponse.json({ success: false, error: 'Invalid' }, { status: 400 })
    const { upload_id } = parsed.data
    const supabase = await createSupabaseServerClient()
    const { data: upload } = await supabase.from('uploads').select('*').eq('id', upload_id).single()
    if (!upload) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
    await supabase.from('uploads').update({ status: 'processing' }).eq('id', upload_id)
    const { data: fileData } = await supabase.storage.from('pdfs').download(upload.file_path as string)
    if (!fileData) return NextResponse.json({ success: false, error: 'Download failed' }, { status: 500 })
    const pdfText = await extractTextFromPdf(Buffer.from(await fileData.arrayBuffer()))
    const transactions = parseTransactionsFromText(pdfText, upload_id)
    if (!transactions.length) { await supabase.from('uploads').update({ status: 'error' }).eq('id', upload_id); return NextResponse.json({ success: false, error: 'No transactions' }, { status: 422 }) }
    const { subscriptions, insight } = scoreSubscriptions(transactions, upload_id)
    if (transactions.length) await supabase.from('transactions').insert(transactions)
    if (subscriptions.length) await supabase.from('subscriptions').insert(subscriptions)
    await supabase.from('insights').insert({ ...insight, upload_id })
    await supabase.from('uploads').update({ status: 'done', result: insight }).eq('id', upload_id)
    return NextResponse.json({ success: true, data: { insight, subscriptions } })
  } catch (err) { logger.error('Analyze error', err instanceof Error ? err : new Error(String(err))); return NextResponse.json({ success: false, error: 'Error' }, { status: 500 }) }
}
