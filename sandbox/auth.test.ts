/**
 * Test sandbox — auth (validation + messages d'erreur), sans réseau.
 * Lancer : npm run test:sandbox
 */
import {
  validateCredentials, friendlyAuthError,
  validateEmail, validateNewPassword, friendlyResetError,
} from '@/lib/auth/logic'

let failures = 0
function check(name: string, cond: boolean, detail = '') {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${!cond && detail ? ` — ${detail}` : ''}`)
  if (!cond) failures++
}

// ─── VALIDATION ─────────────────────────────────────────────────────────────
check('E-mail vide → refusé', !validateCredentials('', 'motdepasse1').ok)
check('E-mail invalide → refusé', !validateCredentials('pasunemail', 'motdepasse1').ok)
check('Mot de passe vide → refusé', !validateCredentials('a@b.fr', '').ok)
check('Mot de passe < 8 → refusé avec message clair', (() => {
  const r = validateCredentials('a@b.fr', 'court')
  return !r.ok && r.error!.includes('8 caractères')
})())
check('E-mail + mot de passe valides → accepté', validateCredentials('juju@exemple.fr', 'motdepasse1').ok)
check('Espaces autour de l\'e-mail tolérés', validateCredentials('  juju@exemple.fr  ', 'motdepasse1').ok)

// ─── MESSAGES D'ERREUR ──────────────────────────────────────────────────────
check('« Invalid login credentials » → message FR',
  friendlyAuthError('Invalid login credentials') === 'E-mail ou mot de passe incorrect.')
check('« Email not confirmed » → invite à confirmer',
  friendlyAuthError('Email not confirmed').includes('confirmer'))
check('« User already registered » → invite à se connecter',
  friendlyAuthError('User already registered').includes('existe déjà'))
check('Inscriptions désactivées → message actionnable',
  friendlyAuthError('Signups not allowed for this instance').includes('inscriptions'))
check('Erreur inconnue → message générique non vide',
  friendlyAuthError('boom').length > 0 && friendlyAuthError(undefined).length > 0)

// ─── MOT DE PASSE OUBLIÉ — DEMANDE (e-mail seul) ────────────────────────────
check('Demande : e-mail vide → refusé', !validateEmail('').ok)
check('Demande : e-mail invalide → refusé', !validateEmail('pasunemail').ok)
check('Demande : e-mail valide (espaces tolérés) → accepté', validateEmail('  juju@exemple.fr  ').ok)

// ─── MOT DE PASSE OUBLIÉ — NOUVEAU MOT DE PASSE ─────────────────────────────
check('Nouveau MDP vide → refusé', !validateNewPassword('', '').ok)
check('Nouveau MDP < 8 → refusé avec message', (() => {
  const r = validateNewPassword('court', 'court')
  return !r.ok && r.error!.includes('8 caractères')
})())
check('Confirmation différente → refusé', (() => {
  const r = validateNewPassword('motdepasse1', 'motdepasse2')
  return !r.ok && r.error!.includes('correspondent')
})())
check('Nouveau MDP valide + confirmé → accepté', validateNewPassword('motdepasse1', 'motdepasse1').ok)

// ─── MOT DE PASSE OUBLIÉ — ERREURS FR ───────────────────────────────────────
check('Lien expiré → invite à redemander',
  friendlyResetError('Token has expired or is invalid').includes('expiré'))
check('« same password » → invite à en choisir un autre',
  friendlyResetError('New password should be different from the old password').includes('différent'))
check('Trop de demandes → invite à patienter',
  friendlyResetError('For security purposes rate limit exceeded').includes('Réessayez'))
check('Erreur reset inconnue → message non vide',
  friendlyResetError('boom').length > 0 && friendlyResetError(undefined).length > 0)

console.log(failures === 0 ? '\n✅ TOUS LES TESTS PASSENT' : `\n❌ ${failures} ÉCHEC(S)`)
process.exit(failures === 0 ? 0 : 1)
