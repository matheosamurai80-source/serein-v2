/**
 * Test sandbox — Socle Storage / uploads durci (Brique 2)
 * Logique de sécurité pure (sans Supabase) : validation MIME/taille,
 * chemin per-utilisateur, garde de propriété, TTL court.
 * Lancer : npm run test:sandbox
 */
import {
  validateDocumentFile, objectPathFor, isOwnedPath,
  DOCUMENTS_BUCKET, MAX_DOCUMENT_BYTES, ALLOWED_DOCUMENT_MIME, SIGNED_URL_TTL_SECONDS,
} from '@/lib/storage/documents'

let failures = 0
function check(name: string, cond: boolean, detail = '') {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${!cond && detail ? ` — ${detail}` : ''}`)
  if (!cond) failures++
}

// ─── CONSTANTES DE DURCISSEMENT ─────────────────────────────────────────────
check('Bucket privé unique = bank-statements', DOCUMENTS_BUCKET === 'bank-statements')
check('Limite de taille = 10 Mo', MAX_DOCUMENT_BYTES === 10 * 1024 * 1024)
check('MIME autorisés = PDF uniquement', ALLOWED_DOCUMENT_MIME.length === 1 && ALLOWED_DOCUMENT_MIME[0] === 'application/pdf')
check('TTL des URL signées court (≤ 300 s)', SIGNED_URL_TTL_SECONDS > 0 && SIGNED_URL_TTL_SECONDS <= 300)

// ─── VALIDATION MIME / TAILLE ───────────────────────────────────────────────
check('PDF de taille normale accepté', validateDocumentFile({ type: 'application/pdf', size: 1024 }).ok)
check('Type non-PDF rejeté', !validateDocumentFile({ type: 'image/png', size: 1024 }).ok)
check('Fichier vide rejeté', !validateDocumentFile({ type: 'application/pdf', size: 0 }).ok)
check('Fichier trop lourd (> 10 Mo) rejeté', !validateDocumentFile({ type: 'application/pdf', size: MAX_DOCUMENT_BYTES + 1 }).ok)
check('Fichier pile à 10 Mo accepté', validateDocumentFile({ type: 'application/pdf', size: MAX_DOCUMENT_BYTES }).ok)
const bad = validateDocumentFile({ type: 'text/plain', size: 10 })
check('Échec renvoie code VALIDATION_ERROR + message', !bad.ok && bad.code === 'VALIDATION_ERROR' && bad.message.length > 0)

// ─── CHEMIN PER-UTILISATEUR ─────────────────────────────────────────────────
const uid = 'user-123'
const rid = 'up-456'
check('Chemin toujours préfixé par l\'utilisateur', objectPathFor(uid, rid) === 'user-123/up-456.pdf')
check('objectPathFor exige un userId', (() => { try { objectPathFor('', rid); return false } catch { return true } })())
check('objectPathFor exige un uploadId', (() => { try { objectPathFor(uid, ''); return false } catch { return true } })())

// ─── GARDE DE PROPRIÉTÉ (anti-fuite) ────────────────────────────────────────
check('isOwnedPath : chemin de l\'utilisateur reconnu', isOwnedPath(uid, objectPathFor(uid, rid)))
check('isOwnedPath : chemin d\'un autre rejeté', !isOwnedPath(uid, 'autre-user/up-456.pdf'))
check('isOwnedPath : tentative de traversée rejetée', !isOwnedPath(uid, '../autre-user/secret.pdf'))
check('isOwnedPath : userId vide rejeté', !isOwnedPath('', 'anything/x.pdf'))

console.log(failures === 0 ? '\n✅ SOCLE STORAGE : TOUS LES TESTS PASSENT' : `\n❌ ${failures} ÉCHEC(S)`)
process.exit(failures === 0 ? 0 : 1)
