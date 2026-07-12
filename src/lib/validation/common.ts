import { z } from 'zod'

// Fragments réutilisés par les schémas. Alignés sur les types Postgres réels :
// `date` → 'YYYY-MM-DD', `timestamptz` → ISO 8601.

/** Chaîne de date calendaire (colonne Postgres `date`). */
export const dateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date attendue au format AAAA-MM-JJ')

/** Horodatage ISO 8601 (colonne Postgres `timestamptz`). */
export const isoDateTime = z
  .string()
  .datetime({ offset: true, message: 'Horodatage ISO 8601 attendu' })

/** UUID d'un enregistrement ciblé (paramètre de route). */
export const uuid = z.string().uuid('Identifiant invalide')
