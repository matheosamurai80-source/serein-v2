import { z } from 'zod'
import { isoDateTime } from './common'

// Table live `reminders` (RLS : user_id = auth.uid()).
// La base impose commitment_id NOT NULL : le schéma le reflète (requis).
// `user_id` vient toujours de la session serveur, jamais du payload.

export const REMINDER_KINDS = ['cancellation_window', 'renewal', 'payment_due', 'negotiation', 'custom'] as const
export const REMINDER_CHANNELS = ['in_app', 'email', 'sms'] as const
export const REMINDER_STATUSES = ['pending', 'sent', 'failed', 'cancelled', 'read'] as const

export const CreateReminderSchema = z.object({
  commitment_id: z.string().uuid('Engagement invalide'),
  facture_id: z.string().uuid('Facture invalide').nullish(),
  kind: z.enum(REMINDER_KINDS).default('cancellation_window'),
  scheduled_for: isoDateTime,
  channel: z.enum(REMINDER_CHANNELS).default('in_app'),
  message: z.string().trim().max(1000).nullish(),
  status: z.enum(REMINDER_STATUSES).default('pending'),
})

// Mise à jour : typiquement le statut, mais tout champ mutable est accepté.
export const UpdateReminderSchema = CreateReminderSchema.partial().refine(
  obj => Object.keys(obj).length > 0,
  { message: 'Aucun champ à mettre à jour' },
)

export type CreateReminderInput = z.infer<typeof CreateReminderSchema>
export type UpdateReminderInput = z.infer<typeof UpdateReminderSchema>
