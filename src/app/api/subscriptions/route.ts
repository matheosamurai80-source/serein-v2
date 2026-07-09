import { handle, ok } from '@/lib/api/response'
import { parseBody } from '@/lib/api/validate'
import { CreateSubscriptionSchema } from '@/lib/validation/subscriptions'
import { listSubscriptions, createSubscription } from '@/lib/services/subscriptions'

// Route → Zod → auth → service → réponse standard. Aucune logique métier ici.

export async function GET() {
  return handle(async () => ok(await listSubscriptions()))
}

export async function POST(req: Request) {
  return handle(async () => {
    const input = await parseBody(CreateSubscriptionSchema, req)
    return ok(await createSubscription(input), 201)
  })
}
