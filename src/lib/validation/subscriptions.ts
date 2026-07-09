import { z } from 'zod'
import { dateOnly } from './common'

// Table live `subscriptions` (RLS : user_id = auth.uid()).
// `user_id` n'est JAMAIS accepté du client : il vient de la session serveur.
// Enums calqués sur les CHECK réels de la base.

export const SUBSCRIPTION_FREQUENCIES = ['weekly', 'monthly', 'quarterly', 'yearly'] as const
export const SUBSCRIPTION_STATUSES = ['active', 'cancelled', 'paused'] as const

export const CreateSubscriptionSchema = z.object({
  name: z.string().trim().min(1, 'Nom requis').max(200, 'Nom trop long'),
  amount: z.number({ invalid_type_error: 'Montant invalide' }).min(0, 'Montant négatif interdit').max(1_000_000),
  frequency: z.enum(SUBSCRIPTION_FREQUENCIES).default('monthly'),
  status: z.enum(SUBSCRIPTION_STATUSES).default('active'),
  category_id: z.string().uuid('Catégorie invalide').nullish(),
  next_charge_on: dateOnly.nullish(),
  source: z.string().trim().max(60).nullish(),
  occurrences: z.number().int().min(0).max(100_000).nullish(),
  last_seen: dateOnly.nullish(),
  confidence: z.number().min(0).max(1).nullish(),
  dormant: z.boolean().optional(),
  detected_automatically: z.boolean().optional(),
})

// Mise à jour : tous les champs deviennent optionnels, au moins un requis.
export const UpdateSubscriptionSchema = CreateSubscriptionSchema.partial().refine(
  obj => Object.keys(obj).length > 0,
  { message: 'Aucun champ à mettre à jour' },
)

export type CreateSubscriptionInput = z.infer<typeof CreateSubscriptionSchema>
export type UpdateSubscriptionInput = z.infer<typeof UpdateSubscriptionSchema>
