import { handle, ok } from '@/lib/api/response'
import { parseBody } from '@/lib/api/validate'
import { ResiliationSchema } from '@/lib/validation/resiliation'
import { computeResiliation } from '@/lib/resiliation/logic'

// Route → Zod → moteur → réponse standard. STATELESS : rien n'est stocké ici,
// c'est un calcul pur (régime + date butoir + courrier). La date de référence
// est fixée par le SERVEUR (jamais reçue du client), pour un calcul fiable.

export const runtime = 'nodejs'

export async function POST(req: Request) {
  return handle(async () => {
    const input = await parseBody(ResiliationSchema, req)
    return ok(computeResiliation(input))
  })
}
