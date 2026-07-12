import { z } from 'zod'

// Table live `uploads` (RLS : user_id = auth.uid()).
// Le fichier binaire lui-même ne transite pas par ce schéma : ici on ne valide
// que les métadonnées de l'enregistrement. `user_id` vient de la session.

export const UPLOAD_STATUSES = ['pending', 'processing', 'done', 'failed'] as const

export const CreateUploadSchema = z.object({
  original_filename: z.string().trim().max(255).nullish(),
  bank_hint: z.string().trim().max(120).nullish(),
  status: z.enum(UPLOAD_STATUSES).default('pending'),
  transactions_count: z.number().int().min(0).max(1_000_000).nullish(),
  error_message: z.string().trim().max(2000).nullish(),
})

export const UpdateUploadSchema = CreateUploadSchema.partial().refine(
  obj => Object.keys(obj).length > 0,
  { message: 'Aucun champ à mettre à jour' },
)

export type CreateUploadInput = z.infer<typeof CreateUploadSchema>
export type UpdateUploadInput = z.infer<typeof UpdateUploadSchema>
