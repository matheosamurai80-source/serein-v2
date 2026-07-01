import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'
import { RATE_LIMIT, UPLOAD_CONFIG } from '@/config'
import type { ApiResponse } from '@/types'

const limiter = rateLimit(RATE_LIMIT.upload)

export async function POST(req: NextRequest): Promise<NextResponse<ApiResponse<{ uploadId: string }>>> {
  const limited = limiter(req)
  if (limited) return limited as NextResponse<ApiResponse<{ uploadId: string }>>

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const leadId = formData.get('lead_id') as string | null

    // ── Validate file ──────────────────────────────────────────────────────
    if (!file) {
      return NextResponse.json({ success: false, error: 'Aucun fichier fourni.' }, { status: 400 })
    }

    if (!UPLOAD_CONFIG.allowedTypes.includes(file.type as 'application/pdf')) {
      return NextResponse.json({ success: false, error: 'Seuls les fichiers PDF sont acceptés.' }, { status: 400 })
    }

    if (file.size > UPLOAD_CONFIG.maxSizeBytes) {
      return NextResponse.json({ success: false, error: 'Fichier trop lourd (max 10 Mo).' }, { status: 400 })
    }

    const supabase = await createSupabaseServerClient()

    // ── Upload to Storage (server-side, service role) ──────────────────────
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const path = `${leadId ?? 'anon'}/${Date.now()}_${safeName}`
    const buffer = await file.arrayBuffer()

    const { error: storageError } = await supabase.storage
      .from(UPLOAD_CONFIG.bucket)
      .upload(path, buffer, {
        contentType: 'application/pdf',
        upsert: false,
      })

    if (storageError) {
      logger.error('Storage upload failed', new Error(storageError.message))
      return NextResponse.json({ success: false, error: 'Erreur upload. Réessayez.' }, { status: 500 })
    }

    // ── Insert upload record ───────────────────────────────────────────────
    const { data: uploadRecord, error: dbError } = await supabase
      .from('uploads')
      .insert({
        lead_id:   leadId ?? null,
        file_path: path,
        file_size: file.size,
        status:    'pending',
      })
      .select('id')
      .single()

    if (dbError) {
      logger.error('Upload record failed', new Error(dbError.message))
      return NextResponse.json({ success: false, error: 'Erreur base de données.' }, { status: 500 })
    }

    logger.info('Upload success', { path, size: file.size, uploadId: uploadRecord.id })

    return NextResponse.json(
      { success: true, data: { uploadId: uploadRecord.id as string } },
      { status: 201 }
    )
  } catch (err) {
    logger.error('Upload route error', err instanceof Error ? err : new Error(String(err)))
    return NextResponse.json({ success: false, error: 'Erreur inattendue.' }, { status: 500 })
  }
}

