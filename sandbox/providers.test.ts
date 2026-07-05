/**
 * Test sandbox — annuaire des services résiliation + pré-remplissage contrat
 * (méthode BUILD, étape 3). Moins de saisie manuelle : le prestataire choisi
 * remplit l'adresse, et un contrat PDF (lu localement) remplit la référence.
 * Lancer : npm run test:sandbox
 */
import {
  PROVIDERS, providerById, findProvider, providersForCategory, extractContractInfo,
} from '@/lib/letters/providers'

let failures = 0
function check(name: string, cond: boolean, detail = '') {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${!cond && detail ? ` — ${detail}` : ''}`)
  if (!cond) failures++
}

// ─── 1. ANNUAIRE ────────────────────────────────────────────────────────────
check('Annuaire : au moins 15 prestataires couvrant 5 catégories', (() => {
  const cats = new Set(PROVIDERS.map(p => p.category))
  return PROVIDERS.length >= 15 && cats.size >= 5
})())

check('Annuaire : chaque entrée a un destinataire ET une adresse non vides',
  PROVIDERS.every(p => p.service.trim().length > 3 && p.address.trim().length > 8 && p.aliases.length > 0))

check('Annuaire : ids uniques', new Set(PROVIDERS.map(p => p.id)).size === PROVIDERS.length)

check('providerById : orange → Orange, inconnu → null',
  providerById('orange')?.name === 'Orange' && providerById('xyz') === null)

check('providersForCategory : les assureurs sont bien classés assurance', (() => {
  const ins = providersForCategory('insurance')
  return ins.length >= 5 && ins.every(p => p.category === 'insurance')
})())

// ─── 2. RECHERCHE PAR NOM LIBRE ─────────────────────────────────────────────
check('findProvider : « Freebox » → Free', findProvider('Freebox')?.id === 'free')
check('findProvider : « AXA assurance auto » → AXA', findProvider('AXA assurance auto')?.id === 'axa')
check('findProvider : « basic fit » (sans tiret) → Basic-Fit', findProvider('basic fit')?.id === 'basicfit')
check('findProvider : « CANAL PLUS » → Canal+', findProvider('CANAL PLUS')?.id === 'canal')
check('findProvider : nom inconnu → null (pas de faux positif)', findProvider('Boulangerie Dupont') === null)
check('findProvider : requête trop courte → null', findProvider('ax') === null)

// ─── 3. PRÉ-REMPLISSAGE DEPUIS UN CONTRAT ───────────────────────────────────
const contratAssurance = `
CONDITIONS PARTICULIÈRES
AXA France IARD — Contrat d'assurance automobile
N° de contrat : 78KJ4512A
Souscripteur : Julien Peltier
Échéance principale : 1er mars
`
const info1 = extractContractInfo(contratAssurance)
check('Contrat AXA : prestataire détecté + n° de contrat extrait',
  info1.provider?.id === 'axa' && info1.contractRef === '78KJ4512A',
  JSON.stringify(info1.contractRef))

const facture = `Facture Orange - Livebox Up Fibre
Référence client : A1B2C3D4E
Montant prélevé : 42,99 €`
const info2 = extractContractInfo(facture)
check('Facture Orange : « Référence client » reconnue',
  info2.provider?.id === 'orange' && info2.contractRef === 'A1B2C3D4E')

const sansRef = 'Un document quelconque sans numéro utile, signé chez EDF.'
const info3 = extractContractInfo(sansRef)
check('Document sans référence : prestataire seul, ref null',
  info3.provider?.id === 'edf' && info3.contractRef === null)

check('Document sans rien de connu : tout est null', (() => {
  const i = extractContractInfo('Recette de la tarte aux pommes, four à 180°.')
  return i.provider === null && i.contractRef === null
})())

console.log(failures === 0 ? '\n✅ TOUS LES TESTS PASSENT' : `\n❌ ${failures} ÉCHEC(S)`)
process.exit(failures === 0 ? 0 : 1)
