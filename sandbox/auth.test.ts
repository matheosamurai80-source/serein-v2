/**
 * Test sandbox — auth (validation + messages d'erreur), sans réseau.
 * Lancer : npm run test:sandbox
 */
import { validateCredentials, friendlyAuthError } from '@/lib/auth/logic'

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

console.log(failures === 0 ? '\n✅ TOUS LES TESTS PASSENT' : `\n❌ ${failures} ÉCHEC(S)`)
process.exit(failures === 0 ? 0 : 1)
