import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'
import { RATE_LIMIT, UPLOAD_CONFIG } from '@/config'
import type { ApiResponse } from '@/types'
const limiter = rateLimit(RATEE_LIMIT.upload)
export async function POST(req: NextRequest): Promise<NextResponse<ApiResponse<{ uploadId: string }>>> {
  const limited = limiter(req)
  if (limited) return limited as NextResponse<ApiResponse<{ uploadId: string }>>
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const leadId = formData.get('lead_id') as string | null
    if (!file) return NextResponse.json({ success: false, error: 'No file' }, { status: 400 })
    if (file.size > UPLOAD_CONFIG.maxSizeBytes) return NextResponse.json({ success: false, error: 'File too large' }, { status: 400 })
    const supabase = await createSupabaseServerClient()
    const path = `${leadId ?? 'anon'}/${Date.now()}_${file.name}`
    const { error: storageError } = await supabase.storage.from('pdfs').upload(path, await file.arrayBuffer(), { contentType: 'application/pdf' })
    if (storageError) return NextResponse.json({ success: false, error: 'Upload failed' }, { status: 500 })
    const { data: uploadRecord } = await supabase.from('uploads').insert({ lead_id: leadId, file_path: path, file_size: file.size, status: 'pending' }).select('id').single()
    return NextResponse.json({ success: true, data: { uploadId: uploadRecord?.id } }, { status: 201 })
  } catch (err) { logger.error('Upload error', err instanceof Error ? err : new Error(String(err))); return NextResponse.json({ success: false, error: 'Unexpected' }, { status: 500 }) }
}
