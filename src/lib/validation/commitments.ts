import { z } from 'zod'
import { dateOnly } from './common'

// Table live `commitments` — le CŒUR du schéma v5 (RLS : user_id = auth.uid()).
// `user_id` n'est JAMAIS accepté du client : il vient de la session serveur.
// Enums calqués sur les CHECK réels de la base (vérifiés le 2026-07-09).

export const COMMITMENT_SERVICE_TYPES = [
  'insurance', 'energy', 'water', 'telecom', 'streaming', 'gym', 'tax', 'loan', 'rent', 'other',
] as const
export const COMMITMENT_FREQUENCIES = ['weekly', 'monthly', 'quarterly', 'yearly', 'one_time'] as const
export const COMMITMENT_STATUSES = ['active', 'cancelled', 'paused', 'expired'] as const
export const COMMITMENT_IMPORTANCES = ['low', 'normal', 'high', 'critical'] as const

const CommitmentFields = z.object({
  // Coffre chiffré : une ligne scellée n'envoie plus son nom en clair.
  // `name` reste requis pour les lignes non chiffrées (rétrocompatibilité).
  name: z.string().trim().min(1, 'Nom requis').max(200, 'Nom trop long').nullish(),
  service_type: z.enum(COMMITMENT_SERVICE_TYPES).default('other'),
  amount: z.number().min(0, 'Montant négatif interdit').max(1_000_000).nullish(),
  frequency: z.enum(COMMITMENT_FREQUENCIES).default('monthly'),
  status: z.enum(COMMITMENT_STATUSES).default('active'),
  importance: z.enum(COMMITMENT_IMPORTANCES).default('normal'),
  provider: z.string().trim().max(200).nullish(),
  category_id: z.string().uuid('Catégorie invalide').nullish(),
  start_date: dateOnly.nullish(),
  anniversary_date: dateOnly.nullish(),
  commitment_end_date: dateOnly.nullish(),
  next_due_date: dateOnly.nullish(),
  cancellation_deadline: dateOnly.nullish(),
  cancellation_notice_days: z.number().int().min(0).max(3650).nullish(),
  detected_automatically: z.boolean().optional(),
  notes: z.string().trim().max(2000).nullish(),
  // ── Coffre chiffré (Brique 8b) ──
  // Blob scellé sur l'appareil. Le serveur le stocke sans jamais pouvoir le lire.
  iv: z.string().trim().max(64).nullish(),
  ciphertext: z.string().trim().max(200_000).nullish(),
})

export const CreateCommitmentSchema = CommitmentFields.refine(
  o => (o.name != null && o.name !== '') || (o.iv != null && o.ciphertext != null),
  { message: 'Un engagement doit porter un nom, ou un contenu chiffré.' },
)

// Mise à jour : tous les champs deviennent optionnels, au moins un requis.
export const UpdateCommitmentSchema = CommitmentFields.partial().refine(
  obj => Object.keys(obj).length > 0,
  { message: 'Aucun champ à mettre à jour' },
)

export type CreateCommitmentInput = z.infer<typeof CreateCommitmentSchema>
export type UpdateCommitmentInput = z.infer<typeof UpdateCommitmentSchema>
