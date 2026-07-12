/**
 * Test sandbox — Serein résiliation : liens en ligne (Brique retour Juju)
 * Les services web ont un lien de résiliation en ligne ; assurance/énergie
 * restent par lettre. Logique pure (annuaire des prestataires).
 * Lancer : npm run test:sandbox
 */
import { PROVIDERS, providerById, findProvider } from '@/lib/letters/providers'

let failures = 0
function check(name: string, cond: boolean, detail = '') {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${!cond && detail ? ` — ${detail}` : ''}`)
  if (!cond) failures++
}

const isHttps = (u?: string) => { try { return new URL(String(u)).protocol === 'https:' } catch { return false } }

// ─── Services en ligne : lien de résiliation présent ────────────────────────
for (const id of ['netflix', 'spotify', 'canal', 'basicfit', 'orange', 'sfr', 'free', 'bouygues']) {
  const p = providerById(id)
  check(`${id} : lien de résiliation en ligne (https)`, !!p && isHttps(p.cancelUrl))
}

// ─── Assurance / énergie : par lettre (pas de lien en ligne) ────────────────
for (const id of ['axa', 'maif', 'macif', 'edf', 'engie', 'totalenergies', 'allianz']) {
  const p = providerById(id)
  check(`${id} : pas de lien en ligne (résiliation par lettre)`, !!p && p.cancelUrl === undefined)
}

// ─── Tous les cancelUrl présents sont en https ──────────────────────────────
check('Tous les cancelUrl définis sont en https',
  PROVIDERS.every(p => p.cancelUrl === undefined || isHttps(p.cancelUrl)))

// ─── Détection par nom libre (le lien suit) ─────────────────────────────────
check('« Netflix » saisi librement → lien en ligne trouvé', isHttps(findProvider('Netflix')?.cancelUrl))
check('« mon abo AXA » → pas de lien en ligne (lettre)', findProvider('AXA')?.cancelUrl === undefined)

console.log(failures === 0 ? '\n✅ RÉSILIATION EN LIGNE : TOUS LES TESTS PASSENT' : `\n❌ ${failures} ÉCHEC(S)`)
process.exit(failures === 0 ? 0 : 1)
