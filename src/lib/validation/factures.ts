import { z } from 'zod'
import { dateOnly } from './common'

// Table live `factures_ponctuelles` (RLS : user_id = auth.uid()).
// Enums et règles calqués sur les CHECK réels (vérifiés le 2026-07-09) :
//  • mode ∈ interval|manual, status ∈ active|archived
//  • interval_months 1..60, notice_days 0..365
//  • mode 'interval' → start_date ET interval_months requis
//  • mode 'manual'   → next_due_date requis
// `user_id` vient toujours de la session serveur.

export const FACTURE_MODES = ['interval', 'manual'] as const
export const FACTURE_STATUSES = ['active', 'archived'] as const

const FactureShape = z.object({
  name: z.string().trim().min(1, 'Nom requis').max(200, 'Nom trop long'),
  amount: z.number().min(0, 'Montant négatif interdit').max(1_000_000).nullish(),
  mode: z.enum(FACTURE_MODES),
  start_date: dateOnly.nullish(),
  interval_months: z.number().int().min(1).max(60).nullish(),
  next_due_date: dateOnly.nullish(),
  notice_days: z.number().int().min(0).max(365).default(14),
  status: z.enum(FACTURE_STATUSES).default('active'),
})

// Cohérence du mode (miroir des CHECK `mode_interval_complet` / `mode_manual_complet`).
const modeComplete = (o: {
  mode?: string
  start_date?: string | null
  interval_months?: number | null
  next_due_date?: string | null
}) => {
  if (o.mode === 'interval') return Boolean(o.start_date) && o.interval_months != null
  if (o.mode === 'manual') return Boolean(o.next_due_date)
  return true
}
const MODE_MSG = { message: 'Champs de date/fréquence manquants pour ce mode.', path: ['mode'] }

export const CreateFactureSchema = FactureShape.refine(modeComplete, MODE_MSG)

// Mise à jour partielle : la règle de mode ne s'applique que si `mode` est fourni.
export const UpdateFactureSchema = FactureShape.partial()
  .refine(obj => Object.keys(obj).length > 0, { message: 'Aucun champ à mettre à jour' })
  .refine(obj => !('mode' in obj) ? true : modeComplete(obj), MODE_MSG)

export type CreateFactureInput = z.infer<typeof CreateFactureSchema>
export type UpdateFactureInput = z.infer<typeof UpdateFactureSchema>
