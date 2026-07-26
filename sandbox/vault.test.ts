/**
 * SEREIN — Coffre chiffré (fourni par Juju, adapté à la chaîne de tests).
 * Chiffrement à enveloppe + classification coffre/serveur. Lancer : npm run test:sandbox
 */
import { createVault, unlock, changePassphrase, seal, open, generateRecoveryKey } from '@/lib/vault/crypto'
import { serverProjection, tierSummary, tierOf } from '@/lib/vault/tiers'

let pass = 0, fail = 0
function check(name: string, actual: unknown, expected: unknown): void {
  const ok = actual === expected
  if (ok) pass++; else fail++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`)
  if (!ok) console.log(`      attendu: ${String(expected)} | obtenu: ${String(actual)}`)
}

const PASSPHRASE = 'chaise-orage-menthe-42'
const RECORD = {
  provider: 'AXA France',
  amount: 61.4,
  contract_ref: 'AUTO-2025-4471',
  notes: 'Résilier avant le déménagement',
  service_type: 'assurance_auto',
  due_date: '2026-09-15',
  id: 'c7f1e0aa',
}

async function main() {
  console.log('\n=== A. COFFRE ===')
  const { envelope, recoveryKey } = await createVault(PASSPHRASE)
  check('Clé de secours au bon format', /^SEREIN-([A-Z2-9]{4}-){5}[A-Z2-9]{4}$/.test(recoveryKey), true)
  check('Enveloppe ne contient pas la phrase', JSON.stringify(envelope).includes(PASSPHRASE), false)
  check('Enveloppe ne contient pas la clé de secours', JSON.stringify(envelope).includes(recoveryKey), false)
  check('Itérations KDF conformes', envelope.iterations, 600_000)

  const dek = await unlock(envelope, PASSPHRASE)
  const sealed = await seal(dek, RECORD)
  const reopened = await open<typeof RECORD>(dek, sealed)
  check('Aller-retour intact', reopened.contract_ref, RECORD.contract_ref)
  check('Montant préservé', reopened.amount, RECORD.amount)

  let wrongRejected = false
  try { await unlock(envelope, 'mauvaise-phrase') } catch { wrongRejected = true }
  check('Mauvaise phrase rejetée', wrongRejected, true)

  const dekRec = await unlock(envelope, recoveryKey)
  check('Clé de secours ouvre le coffre', (await open<typeof RECORD>(dekRec, sealed)).provider, 'AXA France')

  console.log('\n=== B. RÉSISTANCE ===')
  const tampered = { ...sealed, ciphertext: sealed.ciphertext.slice(0, -4) + 'AAAA' }
  let tamperRejected = false
  try { await open(dek, tampered) } catch { tamperRejected = true }
  check('Chiffré altéré rejeté (authentification GCM)', tamperRejected, true)

  const s2 = await seal(dek, RECORD)
  check('Deux scellements du même contenu diffèrent (IV aléatoire)', s2.ciphertext === sealed.ciphertext, false)

  const rotated = await changePassphrase(envelope, PASSPHRASE, 'nouvelle-phrase-longue-99')
  check('Ancienne phrase ne fonctionne plus', await unlock(rotated, PASSPHRASE).then(() => false).catch(() => true), true)
  check('Nouvelle phrase ouvre le coffre', (await open<typeof RECORD>(await unlock(rotated, 'nouvelle-phrase-longue-99'), sealed)).provider, 'AXA France')
  check('Clé de secours inchangée après rotation', (await open<typeof RECORD>(await unlock(rotated, recoveryKey), sealed)).provider, 'AXA France')

  console.log('\n=== C. LA PROMESSE EST-ELLE VRAIE ? ===')
  const stored = serverProjection('commitment', RECORD, sealed)
  const storedStr = JSON.stringify(stored)
  check('Serveur ne voit pas le fournisseur', storedStr.includes('AXA'), false)
  check('Serveur ne voit pas le montant', storedStr.includes('61.4'), false)
  check('Serveur ne voit pas la référence contrat', storedStr.includes('AUTO-2025-4471'), false)
  check('Serveur ne voit pas les notes', storedStr.includes('déménagement'), false)
  check('Serveur voit l\'échéance (nécessaire aux alertes)', storedStr.includes('2026-09-15'), true)
  check('Serveur voit la catégorie (régime juridique)', storedStr.includes('assurance_auto'), true)

  const summary = tierSummary('commitment', Object.keys(RECORD))
  check('4 champs au coffre', summary.coffre, 4)
  check('3 champs serveur', summary.serveur, 3)
  check('Champ inconnu → coffre par défaut', tierOf('commitment.nimporte_quoi').tier, 'coffre')

  console.log('\n=== CE QUE LE SERVEUR VOIT RÉELLEMENT ===')
  console.log(JSON.stringify(stored, null, 2))
  console.log('\n=== CLÉ DE SECOURS (exemple) ===\n   ' + generateRecoveryKey())

  console.log(`\n=== RÉSULTAT : ${pass} PASS / ${fail} FAIL ===`)
  if (fail > 0) process.exit(1)
}

main()
