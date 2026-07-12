import { handle, ok } from '@/lib/api/response'
import { parseBody } from '@/lib/api/validate'
import { CreateReminderSchema } from '@/lib/validation/reminders'
import { listReminders, createReminder } from '@/lib/services/reminders'

// Route → Zod → auth → service → réponse standard. Aucune logique métier ici.

export async function GET() {
  return handle(async () => ok(await listReminders()))
}

export async function POST(req: Request) {
  return handle(async () => {
    const input = await parseBody(CreateReminderSchema, req)
    return ok(await createReminder(input), 201)
  })
}
