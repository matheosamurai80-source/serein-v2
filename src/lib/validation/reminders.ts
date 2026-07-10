import { z } from 'zod'
import { isoDateTime } from './common'

// Table live `reminders` (RLS : user_id = auth.uid()).
// Depuis la Brique 5 : un rappel cible un engagement (commitment_id) OU une
// facture ponctuelle (facture_id) — au moins l'un des deux (CHECK en base).
// `user_id` vient toujours de la session serveur, jamais du payload.

export const REMINDER_KINDS = ['cancellation_window', 'renewal', 'payment_due', 'negotiation', 'custom'] as const
export const REMINDER_CHANNELS = ['in_app', 'email', 'sms'] as const
export const REMINDER_STATUSES = ['pending', 'sent', 'failed', 'cancelled', 'read'] as const

// Base sans contrainte croisée (réutilisable pour la mise à jour partielle).
const ReminderShape = z.object({
  commitment_id: z.string().uuid('Engagement invalide').nullish(),
  facture_id: z.string().uuid('Facture invalide').nullish(),
  kind: z.enum(REMINDER_KINDS).default('cancellation_window'),
  scheduled_for: isoDateTime,
  channel: z.enum(REMINDER_CHANNELS).default('in_app'),
  message: z.string().trim().max(1000).nullish(),
  status: z.enum(REMINDER_STATUSES).default('pending'),
})

// Au moins une cible : engagement OU facture.
const hasTarget = (o: { commitment_id?: string | null; facture_id?: string | null }) =>
  Boolean(o.commitment_id) || Boolean(o.facture_id)
const TARGET_MSG = { message: 'Un rappel doit viser un engagement ou une facture.', path: ['commitment_id'] }

export const CreateReminderSchema = ReminderShape.refine(hasTarget, TARGET_MSG)

// Mise à jour : champs optionnels ; si les deux cibles sont fournies, au moins
// une doit rester non vide. On garde aussi la règle « au moins un champ ».
export const UpdateReminderSchema = ReminderShape.partial()
  .refine(obj => Object.keys(obj).length > 0, { message: 'Aucun champ à mettre à jour' })
  .refine(
    obj => !('commitment_id' in obj) && !('facture_id' in obj) ? true : hasTarget(obj),
    TARGET_MSG,
  )

export type CreateReminderInput = z.infer<typeof CreateReminderSchema>
export type UpdateReminderInput = z.infer<typeof UpdateReminderSchema>
