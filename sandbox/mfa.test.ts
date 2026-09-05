/**
 * Test sandbox — double authentification 2FA/TOTP (méthode BUILD, étape 3)
 * Logique pure : format du code, décision « challenge requis », état des
 * facteurs, messages d'erreur. AUCUN réseau (Supabase fait la crypto TOTP).
 * Lancer : npm run test:sandbox
 */
import {
  normalizeTotpCode, validateTotpCode, mfaStepFromAAL,
  verifiedTotpId, unverifiedTotpIds, isMfaEnabled, friendlyMfaError,
  type FactorLike,
} from '@/lib/auth/mfa'

let failures = 0
function check(name: string, cond: boolean, detail = '') {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${!cond && detail ? ` — ${detail}` : ''}`)
  if (!cond) failures++
}

// ─── 1. FORMAT DU CODE ──────────────────────────────────────────────────────
check('Code « 123 456 » (espace collé) → nettoyé en « 123456 »', normalizeTotpCode('123 456') === '123456')
check('6 chiffres → valide', validateTotpCode('123456').ok)
check('« 123 456 » (avec espace) → valide après nettoyage', validateTotpCode('123 456').ok)
check('Vide → refusé avec message', !validateTotpCode('').ok && !!validateTotpCode('').error)
check('5 chiffres → refusé', !validateTotpCode('12345').ok)
check('7 chiffres → refusé', !validateTotpCode('1234567').ok)
check('Lettres → refusé', !validateTotpCode('12a456').ok)

// ─── 2. FAUT-IL DEMANDER UN 2e FACTEUR ? ────────────────────────────────────
check('aal1 → aal2 (compte 2FA, connexion mot de passe) → challenge',
  mfaStepFromAAL({ currentLevel: 'aal1', nextLevel: 'aal2' }) === 'challenge')
check('aal1 → aal1 (compte sans 2FA) → aucune étape',
  mfaStepFromAAL({ currentLevel: 'aal1', nextLevel: 'aal1' }) === 'none')
check('aal2 → aal2 (déjà passé le 2e facteur) → aucune étape',
  mfaStepFromAAL({ currentLevel: 'aal2', nextLevel: 'aal2' }) === 'none')
check('Niveaux absents → aucune étape (fail-safe : ne bloque pas la connexion)',
  mfaStepFromAAL({}) === 'none')

// ─── 3. ÉTAT DES FACTEURS ───────────────────────────────────────────────────
const enrolled: FactorLike[] = [{ id: 'f-1', status: 'verified', factor_type: 'totp' }]
const pending: FactorLike[] = [{ id: 'f-2', status: 'unverified', factor_type: 'totp' }]
const mixed: FactorLike[] = [...enrolled, ...pending, { id: 'f-3', status: 'unverified' }]

check('Facteur vérifié → 2FA active (id remonté)', verifiedTotpId(enrolled) === 'f-1' && isMfaEnabled(enrolled))
check('Aucun facteur → 2FA inactive', verifiedTotpId([]) === null && !isMfaEnabled([]))
check('Facteur non confirmé seul → 2FA inactive', !isMfaEnabled(pending))
check('Facteurs non confirmés listés pour nettoyage', JSON.stringify(unverifiedTotpIds(mixed)) === JSON.stringify(['f-2', 'f-3']))
check('null/undefined tolérés (fail-safe)', verifiedTotpId(null) === null && unverifiedTotpIds(undefined).length === 0)

// ─── 4. ERREURS EN FRANÇAIS ─────────────────────────────────────────────────
check('« Invalid TOTP code » → message clair en français',
  friendlyMfaError('Invalid TOTP code entered').toLowerCase().includes('incorrect'))
check('« rate limit » → invite à patienter', friendlyMfaError('MFA rate limit exceeded').toLowerCase().includes('patientez'))
check('Message inconnu → repli sans jargon opaque', friendlyMfaError(undefined).length > 0)

console.log(failures === 0 ? '\n✅ DOUBLE AUTHENTIFICATION : TOUS LES TESTS PASSENT' : `\n❌ ${failures} ÉCHEC(S)`)
process.exit(failures === 0 ? 0 : 1)
