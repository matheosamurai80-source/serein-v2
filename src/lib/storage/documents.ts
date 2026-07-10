// ─── SOCLE STORAGE — DOCUMENTS (relevés / contrats) ─────────────────────────
// Règles de durcissement, isolées et testables SANS Supabase :
//  • bucket privé unique `bank-statements` (jamais public) ;
//  • un document vit toujours sous le préfixe de son propriétaire : `${userId}/…`
//    (la RLS Storage impose déjà foldername[1] = auth.uid(), on le garantit
//    aussi côté code = défense en profondeur) ;
//  • seuls les PDF ≤ 10 Mo sont acceptés (miroir des limites du bucket) ;
//  • les liens de téléchargement sont des URL signées à durée courte.

export const DOCUMENTS_BUCKET = 'bank-statements'
export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024 // 10 Mo
export const ALLOWED_DOCUMENT_MIME = ['application/pdf'] as const
/** Durée de vie d'un lien de téléchargement signé (secondes). Volontairement court. */
export const SIGNED_URL_TTL_SECONDS = 60

export type FileMeta = { type: string; size: number }
export type ValidationResult =
  | { ok: true }
  | { ok: false; code: 'VALIDATION_ERROR'; message: string }

/** Valide le type MIME et la taille d'un document avant tout accès au Storage. */
export function validateDocumentFile(file: FileMeta): ValidationResult {
  if (!ALLOWED_DOCUMENT_MIME.includes(file.type as (typeof ALLOWED_DOCUMENT_MIME)[number])) {
    return { ok: false, code: 'VALIDATION_ERROR', message: 'Seuls les fichiers PDF sont acceptés.' }
  }
  if (file.size <= 0) {
    return { ok: false, code: 'VALIDATION_ERROR', message: 'Fichier vide.' }
  }
  if (file.size > MAX_DOCUMENT_BYTES) {
    return { ok: false, code: 'VALIDATION_ERROR', message: 'Fichier trop lourd (max 10 Mo).' }
  }
  return { ok: true }
}

/**
 * Chemin de l'objet Storage d'un document. Toujours préfixé par l'utilisateur,
 * un fichier par enregistrement `uploads` (nom = id de la ligne) : reconstituable
 * sans stocker de colonne `file_path`, et impossible à faire fuiter chez autrui.
 */
export function objectPathFor(userId: string, uploadId: string): string {
  if (!userId) throw new Error('objectPathFor: userId requis')
  if (!uploadId) throw new Error('objectPathFor: uploadId requis')
  return `${userId}/${uploadId}.pdf`
}

/** Vrai si le chemin appartient bien au dossier de l'utilisateur (garde anti-fuite). */
export function isOwnedPath(userId: string, path: string): boolean {
  return Boolean(userId) && path.startsWith(`${userId}/`)
}
