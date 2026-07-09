import type { z } from 'zod'
import { ApiError } from './response'

// Pont validation → réponse standard : une entrée invalide devient toujours une
// ApiError VALIDATION_ERROR (422), avec le détail Zod aplati dans `details`.
// Le type de retour est la sortie du schéma (défauts appliqués, champs requis).

/** Valide le corps JSON d'une requête ; lève VALIDATION_ERROR si invalide. */
export async function parseBody<S extends z.ZodTypeAny>(schema: S, req: Request): Promise<z.infer<S>> {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    throw new ApiError('VALIDATION_ERROR', 'Corps de requête JSON invalide.')
  }
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    throw new ApiError('VALIDATION_ERROR', 'Données invalides.', parsed.error.flatten())
  }
  return parsed.data
}

/** Valide une valeur isolée (ex. un paramètre de route) ; lève VALIDATION_ERROR. */
export function parseValue<S extends z.ZodTypeAny>(schema: S, value: unknown): z.infer<S> {
  const parsed = schema.safeParse(value)
  if (!parsed.success) {
    throw new ApiError('VALIDATION_ERROR', 'Paramètre invalide.', parsed.error.flatten())
  }
  return parsed.data
}
