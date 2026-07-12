import { handle, ok } from '@/lib/api/response'
import { parseValue } from '@/lib/api/validate'
import { uuid } from '@/lib/validation/common'
import { deleteUpload } from '@/lib/services/uploads'

type Ctx = { params: Promise<{ id: string }> }

export async function DELETE(_req: Request, { params }: Ctx) {
  return handle(async () => {
    const id = parseValue(uuid, (await params).id)
    await deleteUpload(id)
    return ok({ id })
  })
}
