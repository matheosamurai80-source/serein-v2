/**
 * SEREIN — Brique 8, sandbox : le coffre branché sur les engagements.
 *
 * Option C retenue : la clé vit sur l'appareil (aucune phrase à retaper),
 * doublée d'une clé de secours imprimable pour changer d'appareil.
 *
 * On teste la logique métier AVANT toute UI, méthode BUILD.
 */
import { createVault, unlock, seal, open } from '../src/lib/vault/crypto'
import { serverProjection, tierOf } from '../src/lib/vault/tiers'

let pass = 0
let fail = 0
function check(label: string, ok: boolean) {
  if (ok) { pass++; console.log(`PASS  ${label}`) }
  else { fail++; console.log(`FAIL  ${label}`) }
}

// ─── Le secret d'appareil : ce que l'option C stocke localement ────────────
const DEVICE_KEY = 'serein.vault.device'
const ENVELOPE_KEY = 'serein.vault.envelope'
const store = new Map<string, string>()

function generateDeviceSecret(): string {
  const b = crypto.getRandomValues(new Uint8Array(32))
  return Buffer.from(b).toString('base64')
}

/** Premier lancement : on crée le coffre et on garde le secret sur l'appareil. */
async function initVault() {
  const deviceSecret = generateDeviceSecret()
  const { envelope, recoveryKey } = await createVault(deviceSecret)
  store.set(DEVICE_KEY, deviceSecret)
  store.set(ENVELOPE_KEY, JSON.stringify(envelope))
  return { recoveryKey }
}

/** Ouverture silencieuse au démarrage : aucune saisie utilisateur. */
async function openVaultSilently() {
  const secret = store.get(DEVICE_KEY)
  const raw = store.get(ENVELOPE_KEY)
  if (!secret || !raw) return null
  return unlock(JSON.parse(raw), secret)
}

// ─── Le contrat de données réel, tiré de CommitmentRow ─────────────────────
type Commitment = {
  id: string
  provider: string
  amount: number
  contract_ref: string
  notes: string
  service_type: string
  due_date: string
}
const ENGAGEMENT: Commitment = {
  id: 'c7f1e0aa',
  provider: 'AXA France',
  amount: 61.4,
  contract_ref: 'AUTO-2025-4471',
  notes: 'Résilier avant le déménagement',
  service_type: 'assurance_auto',
  due_date: '2026-09-15',
}

/** Ce qui part vers /api/commitments : clair minimal + blob scellé. */
async function toServer(dek: CryptoKey, row: Commitment) {
  const secret: Record<string, unknown> = {}
  for (const k of Object.keys(row)) {
    if (tierOf(`commitment.${k}`).tier === 'coffre') secret[k] = row[k as keyof Commitment]
  }
  const sealed = await seal(dek, secret)
  const payload: Record<string, unknown> = { iv: sealed.iv, ciphertext: sealed.ciphertext }
  for (const k of Object.keys(row)) {
    if (tierOf(`commitment.${k}`).tier === 'serveur') payload[k] = row[k as keyof Commitment]
  }
  return payload
}

/** Ce que l'app reconstitue à la lecture. */
async function fromServer(dek: CryptoKey, payload: Record<string, unknown>): Promise<Commitment> {
  const secret = await open<Partial<Commitment>>(dek, {
    iv: payload.iv as string,
    ciphertext: payload.ciphertext as string,
  })
  const { iv: _iv, ciphertext: _ct, ...clair } = payload
  return { ...clair, ...secret } as Commitment
}

async function main() {
  console.log('=== A. OUVERTURE SANS FRICTION (option C) ===')
  const { recoveryKey } = await initVault()
  const dek = await openVaultSilently()
  check('Le coffre s\'ouvre sans rien demander à l\'utilisateur', dek !== null)
  check('Une clé de secours est remise à la création', recoveryKey.startsWith('SEREIN-'))
  check('Le secret d\'appareil est bien conservé localement', store.has(DEVICE_KEY))

  console.log('\n=== B. ALLER-RETOUR SUR UN VRAI ENGAGEMENT ===')
  const payload = await toServer(dek!, ENGAGEMENT)
  const relu = await fromServer(dek!, payload)
  const identique = (Object.keys(ENGAGEMENT) as (keyof Commitment)[])
    .every(k => relu[k] === ENGAGEMENT[k])
  check('L\'engagement revient identique après un tour serveur', identique && Object.keys(relu).length === Object.keys(ENGAGEMENT).length)
  check('Le montant est exact au centime', relu.amount === 61.4)

  console.log('\n=== C. CE QUI PART VERS LE SERVEUR ===')
  const brut = JSON.stringify(payload)
  check('Le fournisseur n\'apparaît nulle part', !brut.includes('AXA'))
  check('Le montant n\'apparaît nulle part', !brut.includes('61.4'))
  check('Le n° de contrat n\'apparaît nulle part', !brut.includes('AUTO-2025-4471'))
  check('Les notes n\'apparaissent nulle part', !brut.includes('déménagement'))
  check('L\'échéance reste lisible (alertes)', payload.due_date === '2026-09-15')
  check('La catégorie reste lisible (régime juridique)', payload.service_type === 'assurance_auto')

  console.log('\n=== D. CHANGEMENT D\'APPAREIL ===')
  const envelope = JSON.parse(store.get(ENVELOPE_KEY)!)
  const dekAilleurs = await unlock(envelope, recoveryKey)
  const reluAilleurs = await fromServer(dekAilleurs, payload)
  check('La clé de secours rouvre les données sur un autre appareil', reluAilleurs.provider === 'AXA France')

  let refus = false
  try { await unlock(envelope, 'SEREIN-AAAA-BBBB-CCCC-DDDD-EEEE-FFFF') } catch { refus = true }
  check('Une mauvaise clé de secours est refusée', refus)

  let refusDevice = false
  try { await unlock(envelope, generateDeviceSecret()) } catch { refusDevice = true }
  check('Un autre secret d\'appareil est refusé', refusDevice)

  console.log('\n=== E. PERTE DE L\'APPAREIL SANS CLÉ DE SECOURS ===')
  store.delete(DEVICE_KEY)
  const perdu = await openVaultSilently()
  check('Sans le secret d\'appareil, le coffre ne s\'ouvre pas (promesse tenue)', perdu === null)
  check('Le blob reste illisible — les données sont définitivement perdues', !JSON.stringify(payload).includes('AXA'))

  console.log('\n=== F. FAIL-SAFE ===')
  check('Un champ inconnu est classé coffre par défaut', tierOf('commitment.iban_du_client').tier === 'coffre')

  console.log('\n=== APERÇU DE LA LIGNE EN BASE ===')
  console.log(JSON.stringify(serverProjection('commitment', ENGAGEMENT as never, { iv: payload.iv as string, ciphertext: payload.ciphertext as string }), null, 2))

  console.log(`\n=== RÉSULTAT : ${pass} PASS / ${fail} FAIL ===`)
  if (fail > 0) process.exit(1)
}

void main()
