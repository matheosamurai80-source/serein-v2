import { ApiError } from '@/lib/api/response'
import { requireUser } from './session'
import {
  DOCUMENTS_BUCKET, SIGNED_URL_TTL_SECONDS,
  validateDocumentFile, objectPathFor,
} from '@/lib/storage/documents'

// Service `uploads` : durcissement du dépôt de documents. Session + RLS
// bornent tout à l'utilisateur ; la validation MIME/taille et le chemin
// per-utilisateur viennent des helpers testés. Aucune logique dans la route.

const COLS = 'id, original_filename, bank_hint, status, transactions_count, error_message, created_at'

export interface IncomingDocument {
  bytes: ArrayBuffer
  type: string
  size: number
  filename: string
}

export async function listUploads() {
  const { supabase } = await requireUser()
  const { data, error } = await supabase
    .from('uploads')
    .select(COLS)
    .order('created_at', { ascending: false })
  if (error) throw new ApiError('INTERNAL_ERROR', 'Lecture des documents impossible.')
  return data ?? []
}

/** Dépose un document : validation → ligne `uploads` → objet Storage privé. */
export async function createUpload(doc: IncomingDocument, meta: { bank_hint?: string | null }) {
  const { supabase, userId } = await requireUser()

  const check = validateDocumentFile({ type: doc.type, size: doc.size })
  if (!check.ok) throw new ApiError(check.code, check.message)

  // 1) La ligne d'abord : son id nomme l'objet Storage (pas de colonne file_path).
  const { data: row, error: dbError } = await supabase
    .from('uploads')
    .insert({
      user_id: userId,
      original_filename: doc.filename.slice(0, 255),
      bank_hint: meta.bank_hint ?? null,
      status: 'pending',
    })
    .select(COLS)
    .single()
  if (dbError || !row) throw new ApiError('INTERNAL_ERROR', 'Création du document impossible.')

  // 2) L'objet ensuite, sous `${userId}/…`. Si l'upload échoue, on annule la ligne.
  const path = objectPathFor(userId, row.id)
  const { error: storageError } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .upload(path, doc.bytes, { contentType: 'application/pdf', upsert: false })
  if (storageError) {
    await supabase.from('uploads').delete().eq('id', row.id)
    throw new ApiError('STORAGE_ERROR', 'Enregistrement du fichier impossible.')
  }

  return row
}

/** Lien de téléchargement signé à durée courte pour un document de l'utilisateur. */
export async function createDownloadUrl(id: string) {
  const { supabase, userId } = await requireUser()

  const { data: row, error } = await supabase
    .from('uploads')
    .select('id')
    .eq('id', id)
    .maybeSingle()
  if (error) throw new ApiError('INTERNAL_ERROR', 'Lecture du document impossible.')
  if (!row) throw new ApiError('NOT_FOUND', 'Document introuvable.')

  const path = objectPathFor(userId, id)
  const { data: signed, error: signError } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS)
  if (signError || !signed) throw new ApiError('STORAGE_ERROR', 'Lien de téléchargement indisponible.')

  return { url: signed.signedUrl, expires_in: SIGNED_URL_TTL_SECONDS }
}

/** Supprime le document : objet Storage ET ligne de base (suppression coordonnée). */
export async function deleteUpload(id: string) {
  const { supabase, userId } = await requireUser()

  const { data: row, error } = await supabase
    .from('uploads')
    .select('id')
    .eq('id', id)
    .maybeSingle()
  if (error) throw new ApiError('INTERNAL_ERROR', 'Lecture du document impossible.')
  if (!row) throw new ApiError('NOT_FOUND', 'Document introuvable.')

  // On efface l'objet d'abord (tolère un objet déjà absent), puis la ligne.
  await supabase.storage.from(DOCUMENTS_BUCKET).remove([objectPathFor(userId, id)])
  const { error: delError } = await supabase.from('uploads').delete().eq('id', id)
  if (delError) throw new ApiError('INTERNAL_ERROR', 'Suppression du document impossible.')
}
