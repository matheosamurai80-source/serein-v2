import { handle, ok } from '@/lib/api/response'
import { parseBody, parseValue } from '@/lib/api/validate'
import { uuid } from '@/lib/validation/common'
import { UpdateFactureSchema } from '@/lib/validation/factures'
import { updateFacture, deleteFacture } from '@/lib/services/factures'

type Ctx = { params: Promise<{ id: string }> }

export async function PATCH(req: Request, { params }: Ctx) {
  return handle(async () => {
    const id = parseValue(uuid, (await params).id)
    const patch = await parseBody(UpdateFactureSchema, req)
    return ok(await updateFacture(id, patch))
  })
}

export async function DELETE(_req: Request, { params }: Ctx) {
  return handle(async () => {
    const id = parseValue(uuid, (await params).id)
    await deleteFacture(id)
    return ok({ id })
  })
}
