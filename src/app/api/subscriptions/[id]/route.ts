import { handle, ok } from '@/lib/api/response'
import { parseBody, parseValue } from '@/lib/api/validate'
import { uuid } from '@/lib/validation/common'
import { UpdateSubscriptionSchema } from '@/lib/validation/subscriptions'
import { updateSubscription, deleteSubscription } from '@/lib/services/subscriptions'

type Ctx = { params: Promise<{ id: string }> }

export async function PATCH(req: Request, { params }: Ctx) {
  return handle(async () => {
    const id = parseValue(uuid, (await params).id)
    const patch = await parseBody(UpdateSubscriptionSchema, req)
    return ok(await updateSubscription(id, patch))
  })
}

export async function DELETE(_req: Request, { params }: Ctx) {
  return handle(async () => {
    const id = parseValue(uuid, (await params).id)
    await deleteSubscription(id)
    return ok({ id })
  })
}
