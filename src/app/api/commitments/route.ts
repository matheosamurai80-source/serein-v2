import { handle, ok } from '@/lib/api/response'
import { parseBody } from '@/lib/api/validate'
import { CreateCommitmentSchema } from '@/lib/validation/commitments'
import { listCommitments, createCommitment } from '@/lib/services/commitments'

// Route → Zod → auth → service → réponse standard. Aucune logique métier ici.

export async function GET() {
  return handle(async () => ok(await listCommitments()))
}

export async function POST(req: Request) {
  return handle(async () => {
    const input = await parseBody(CreateCommitmentSchema, req)
    return ok(await createCommitment(input), 201)
  })
}
