import { z } from 'zod'
export const CreateLeadSchema = z.object({ email: z.string().email().max(255).toLowerCase().trim(), choice: z.enum(['bank', 'pdf']), estimated_subscriptions: z.number().int().min(0).max(50), monthly_loss: z.number().min(0).max(99999), annual_loss: z.number().min(0).max(999999) })
export const UploadSchema = z.object({ lead_id: z.string().uuid().optional() })
export type CreateLeadInput = z.infer<typeof CreateLeadSchema>
export type UploadInput = z.infer<typeof UploadSchema>
