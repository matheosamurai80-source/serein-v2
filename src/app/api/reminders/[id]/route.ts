import { handle, ok } from '@/lib/api/response'
import { parseBody, parseValue } from '@/lib/api/validate'
import { uuid } from '@/lib/validation/common'
import { UpdateReminderSchema } from '@/lib/validation/reminders'
import { updateReminder, deleteReminder } from '@/lib/services/reminders'

type Ctx = { params: Promise<{ id: string }> }

export async function PATCH(req: Request, { params }: Ctx) {
  return handle(async () => {
    const id = parseValue(uuid, (await params).id)
    const patch = await parseBody(UpdateReminderSchema, req)
    return ok(await updateReminder(id, patch))
  })
}

export async function DELETE(_req: Request, { params }: Ctx) {
  return handle(async () => {
    const id = parseValue(uuid, (await params).id)
    await deleteReminder(id)
    return ok({ id })
  })
}
