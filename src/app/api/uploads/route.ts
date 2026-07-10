import { handle, ok, ApiError } from '@/lib/api/response'
import { listUploads, createUpload } from '@/lib/services/uploads'

// Route → validation → auth → service → réponse standard. Aucune logique ici.

export async function GET() {
  return handle(async () => ok(await listUploads()))
}

export async function POST(req: Request) {
  return handle(async () => {
    const form = await req.formData().catch(() => {
      throw new ApiError('VALIDATION_ERROR', 'Requête multipart attendue.')
    })
    const file = form.get('file')
    if (!(file instanceof File)) throw new ApiError('VALIDATION_ERROR', 'Aucun fichier fourni.')

    const hint = form.get('bank_hint')
    const bank_hint = typeof hint === 'string' && hint.trim() ? hint.trim().slice(0, 120) : null

    const row = await createUpload(
      {
        bytes: await file.arrayBuffer(),
        type: file.type,
        size: file.size,
        filename: file.name || 'document.pdf',
      },
      { bank_hint },
    )
    return ok(row, 201)
  })
}
