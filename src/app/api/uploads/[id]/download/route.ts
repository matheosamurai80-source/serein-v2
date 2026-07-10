import { handle, ok } from '@/lib/api/response'
import { parseValue } from '@/lib/api/validate'
import { uuid } from '@/lib/validation/common'
import { createDownloadUrl } from '@/lib/services/uploads'

type Ctx = { params: Promise<{ id: string }> }

// Renvoie une URL signée à durée courte (le fichier reste dans un bucket privé).
export async function GET(_req: Request, { params }: Ctx) {
  return handle(async () => {
    const id = parseValue(uuid, (await params).id)
    return ok(await createDownloadUrl(id))
  })
}
