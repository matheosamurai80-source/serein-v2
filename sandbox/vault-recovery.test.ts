/**
 * Test sandbox — restauration du coffre sur un nouvel appareil (méthode BUILD).
 * Prouve, SANS réseau, que « enveloppe + clé de secours » rouvre des données
 * scellées par un autre appareil. La crypto est réelle (Web Crypto de Node).
 * Lancer : npm run test:sandbox
 */
import { createVault, seal, open, unlock } from '@/lib/vault/crypto'
import { validateRecoveryKey, normalizeRecoveryKey, openDekWithRecovery } from '@/lib/vault/recovery'

let failures = 0
function check(name: string, cond: boolean, detail = '') {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${!cond && detail ? ` — ${detail}` : ''}`)
  if (!cond) failures++
}

async function main() {
  // ── 1. FORMAT DE LA CLÉ ───────────────────────────────────────────────────
  const { envelope, recoveryKey } = await createVault('secret-appareil-A')
  check('Clé générée reconnue comme valide', validateRecoveryKey(recoveryKey).ok, recoveryKey)
  check('Clé vide → refusée', !validateRecoveryKey('').ok)
  check('Clé bidon → refusée', !validateRecoveryKey('SEREIN-nope').ok)
  check('Minuscules + espaces tolérés (normalisation)',
    validateRecoveryKey(`  ${recoveryKey.toLowerCase()}  `).ok)
  check('Normalisation : majuscules, sans espaces',
    normalizeRecoveryKey(' serein-abcd ') === 'SEREIN-ABCD')

  // ── 2. LE SCÉNARIO MULTI-APPAREILS ────────────────────────────────────────
  // Appareil A : scelle des données sensibles avec sa DEK.
  const dekA = await unlock(envelope, 'secret-appareil-A')
  const sealed = await seal(dekA, { name: 'Assurance auto AXA', amount: 39.9 })

  // Appareil B : ne connaît QUE l'enveloppe (récupérée du serveur) + la clé de
  // secours. Il n'a jamais vu le secret d'appareil A.
  const dekB = await openDekWithRecovery(envelope, recoveryKey)
  const reouvert = await open<{ name: string; amount: number }>(dekB, sealed)
  check('Appareil B rouvre le NOM scellé par A', reouvert.name === 'Assurance auto AXA', reouvert.name)
  check('Appareil B rouvre le MONTANT scellé par A', reouvert.amount === 39.9, String(reouvert.amount))

  // ── 3. UNE MAUVAISE CLÉ NE DONNE RIEN ─────────────────────────────────────
  let refused = false
  try {
    await openDekWithRecovery(envelope, 'SEREIN-AAAA-AAAA-AAAA-AAAA-AAAA-AAAA')
  } catch { refused = true }
  check('Mauvaise clé de secours → refus (données protégées)', refused)

  // ── 4. L'ENVELOPPE SEULE NE SUFFIT PAS ────────────────────────────────────
  // (démontré par le fait que la mauvaise clé échoue ci-dessus : l'enveloppe est
  //  publique, c'est la clé qui déverrouille.)
  check('Enveloppe publique : sans la bonne clé, illisible', refused)

  console.log(failures === 0 ? '\n✅ RESTAURATION COFFRE : TOUS LES TESTS PASSENT' : `\n❌ ${failures} ÉCHEC(S)`)
  process.exit(failures === 0 ? 0 : 1)
}

void main()
