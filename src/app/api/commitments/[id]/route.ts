import { handle, ok } from '@/lib/api/response'
import { parseBody, parseValue } from '@/lib/api/validate'
import { uuid } from '@/lib/validation/common'
import { UpdateCommitmentSchema } from '@/lib/validation/commitments'
import { updateCommitment, deleteCommitment } from '@/lib/services/commitments'

type Ctx = { params: Promise<{ id: string }> }

export async function PATCH(req: Request, { params }: Ctx) {
  return handle(async () => {
    const id = parseValue(uuid, (await params).id)
    const patch = await parseBody(UpdateCommitmentSchema, req)
    return ok(await updateCommitment(id, patch))
  })
}

export async function DELETE(_req: Request, { params }: Ctx) {
  return handle(async () => {
    const id = parseValue(uuid, (await params).id)
    await deleteCommitment(id)
    return ok({ id })
  })
}
