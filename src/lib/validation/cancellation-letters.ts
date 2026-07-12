import { z } from 'zod'

// Table live `cancellation_letters` (RLS : user_id = auth.uid()).
// Limite légale : Serein GÉNÈRE la lettre, le client l'envoie lui-même.
// `content` est le texte de la lettre ; `user_id` vient de la session.

export const LETTER_TYPES = ['standard', 'chatel', 'hamon', 'negotiation'] as const

export const CreateCancellationLetterSchema = z.object({
  letter_type: z.enum(LETTER_TYPES).default('standard'),
  content: z.string().trim().min(50, 'Contenu de lettre trop court').max(20_000),
  commitment_id: z.string().uuid('Engagement invalide').nullish(),
})

export type CreateCancellationLetterInput = z.infer<typeof CreateCancellationLetterSchema>
