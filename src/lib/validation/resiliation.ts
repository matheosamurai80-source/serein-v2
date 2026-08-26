import { z } from 'zod'
import { dateOnly } from './common'

// Entrée de la route /api/resiliation. Le serveur ne fait JAMAIS confiance au
// client : type de contrat + coordonnées + dates sont validés ici avant d'être
// passés au moteur. La date de calcul (« today ») n'est PAS acceptée du client —
// c'est toujours le serveur qui la fixe.

export const RESILIATION_CATEGORIES = [
  'streaming', 'saas', 'telecom', 'insurance', 'fitness', 'utility', 'press', 'other',
] as const

export const ResiliationSchema = z.object({
  category: z.enum(RESILIATION_CATEGORIES),
  serviceName: z.string().trim().min(1, 'Service requis').max(200, 'Nom trop long'),
  senderName: z.string().trim().min(1, 'Nom requis').max(200, 'Nom trop long'),
  senderAddress: z.string().trim().min(1, 'Adresse requise').max(400, 'Adresse trop longue'),
  providerName: z.string().trim().min(1, 'Prestataire requis').max(200, 'Nom trop long'),
  providerAddress: z.string().trim().min(1, 'Adresse du prestataire requise').max(400, 'Adresse trop longue'),
  contractRef: z.string().trim().max(120, 'Référence trop longue').optional(),
  subscribedAt: dateOnly.optional(),
  renewalNoticeReceived: z.boolean().optional(),
  echeanceDate: dateOnly.optional(),
  contractNoticeDays: z.number().int().min(0).max(3650).optional(),
})

export type ResiliationRequest = z.infer<typeof ResiliationSchema>
