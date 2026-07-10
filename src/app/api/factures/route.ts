import { handle, ok } from '@/lib/api/response'
import { parseBody } from '@/lib/api/validate'
import { CreateFactureSchema } from '@/lib/validation/factures'
import { listFactures, createFacture } from '@/lib/services/factures'

// Route → Zod → auth → service → réponse standard. Aucune logique métier ici.

export async function GET() {
  return handle(async () => ok(await listFactures()))
}

export async function POST(req: Request) {
  return handle(async () => {
    const input = await parseBody(CreateFactureSchema, req)
    return ok(await createFacture(input), 201)
  })
}
