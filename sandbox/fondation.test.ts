/**
 * Test sandbox — Brique 0 : fondation multiservice + garde-fous RGPD
 * (méthode BUILD, étape 3). Logique testée AVANT toute UI.
 * Lancer : npm run test:sandbox
 */
import { SERVICE_KEYS, activeServiceKeys, deleteConfirmed } from '@/lib/services/logic'

let failures = 0
function check(name: string, cond: boolean, detail = '') {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${!cond && detail ? ` — ${detail}` : ''}`)
  if (!cond) failures++
}

// ─── 1. SERVICES ACTIFS ─────────────────────────────────────────────────────
check('Aucune ligne → aucun service actif', activeServiceKeys([]).length === 0)
check('null / undefined → aucun service actif (pas de crash)',
  activeServiceKeys(null).length === 0 && activeServiceKeys(undefined).length === 0)

check('Un seul service actif → [serein]',
  JSON.stringify(activeServiceKeys([{ service_key: 'serein', status: 'active' }])) === '["serein"]')

check('Deux actifs → ordre canonique (serein avant paniermalin), peu importe l\'ordre en base',
  JSON.stringify(activeServiceKeys([
    { service_key: 'paniermalin', status: 'active' },
    { service_key: 'serein', status: 'active' },
  ])) === '["serein","paniermalin"]')

check('Statut inactive ignoré', activeServiceKeys([
  { service_key: 'serein', status: 'inactive' },
  { service_key: 'paniermalin', status: 'active' },
]).join() === 'paniermalin')

check('Clé inconnue en base → ignorée sans crash',
  activeServiceKeys([{ service_key: 'bidule', status: 'active' }]).length === 0)

check('Doublons en base → une seule fois',
  activeServiceKeys([
    { service_key: 'serein', status: 'active' },
    { service_key: 'serein', status: 'active' },
  ]).length === 1)

check('Les 4 services prévus existent : serein, paniermalin, apres, jarvis',
  JSON.stringify([...SERVICE_KEYS]) === '["serein","paniermalin","apres","jarvis"]')

// ─── 2. GARDE-FOU SUPPRESSION DE COMPTE ─────────────────────────────────────
check('« SUPPRIMER » exact → confirmé', deleteConfirmed('SUPPRIMER'))
check('Espaces autour tolérés', deleteConfirmed('  SUPPRIMER  '))
check('Minuscules refusées (acte délibéré exigé)', !deleteConfirmed('supprimer'))
check('Champ vide refusé', !deleteConfirmed(''))
check('Autre texte refusé', !deleteConfirmed('OUI'))

console.log(failures === 0 ? '\n✅ TOUS LES TESTS PASSENT' : `\n❌ ${failures} ÉCHEC(S)`)
process.exit(failures === 0 ? 0 : 1)
