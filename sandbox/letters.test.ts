/**
 * Test sandbox — générateur de lettres de résiliation (méthode BUILD, étape 3)
 * Détection du régime légal + contenu de la lettre, sans UI.
 * Lancer : npm run test:sandbox
 */
import { detectLegalRegime } from '@/lib/letters/legal'
import { generateCancellationLetter } from '@/lib/letters/generator'
import { mapRegimeToLetterType, buildLetterRow } from '@/lib/letters/db'

let failures = 0
function check(name: string, cond: boolean, detail = '') {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${!cond && detail ? ` — ${detail}` : ''}`)
  if (!cond) failures++
}

const monthsAgo = (n: number) => {
  const d = new Date()
  d.setMonth(d.getMonth() - n)
  return d.toISOString().slice(0, 10)
}

// ─── 1. DÉTECTION DU RÉGIME LÉGAL ───────────────────────────────────────────
check('Télécom → L.224-39, résiliable maintenant, préavis ≤ 10 j', (() => {
  const r = detectLegalRegime({ category: 'telecom' })
  return r.regime === 'telecom' && r.cancellableNow && r.maxNoticeDays === 10 && r.article.includes('L.224-39')
})())

check('Énergie → L.224-15, sans frais, effet immédiat', (() => {
  const r = detectLegalRegime({ category: 'utility' })
  return r.regime === 'energie' && r.cancellableNow && r.maxNoticeDays === 0 && r.article.includes('L.224-15')
})())

check('Assurance 14 mois → Loi Hamon (L.113-15-2)', (() => {
  const r = detectLegalRegime({ category: 'insurance', subscribedAt: monthsAgo(14) })
  return r.regime === 'hamon' && r.cancellableNow && r.article.includes('L.113-15-2')
})())

check('Assurance 6 mois → Loi Chatel assurance (L.113-15-1)', (() => {
  const r = detectLegalRegime({ category: 'insurance', subscribedAt: monthsAgo(6) })
  return r.regime === 'chatel_assurance' && r.article.includes('L.113-15-1')
})())

check('Assurance 6 mois SANS avis d\'échéance → résiliable maintenant', (() => {
  const r = detectLegalRegime({ category: 'insurance', subscribedAt: monthsAgo(6), renewalNoticeReceived: false })
  return r.regime === 'chatel_assurance' && r.cancellableNow
})())

check('Streaming sans info de reconduction → Loi Chatel conso (L.215-1), gratuit', (() => {
  const r = detectLegalRegime({ category: 'streaming', renewalNoticeReceived: false })
  return r.regime === 'chatel_conso' && r.cancellableNow && r.maxNoticeDays === 0
})())

check('SaaS avec info de reconduction reçue → droit commun (préavis contractuel)', (() => {
  const r = detectLegalRegime({ category: 'saas', renewalNoticeReceived: true })
  return r.regime === 'droit_commun' && !r.cancellableNow
})())

// ─── 2. CONTENU DE LA LETTRE ────────────────────────────────────────────────
const letter = generateCancellationLetter({
  category: 'telecom',
  serviceName: 'Orange Livebox',
  senderName: 'Julien Peltier',
  senderAddress: '10 rue de la Paix, 60000 Beauvais',
  providerName: 'Orange — Service Résiliation',
  providerAddress: 'TSA 10008, 59878 Lille Cedex 9',
  contractRef: 'CL-123456',
  subscribedAt: monthsAgo(18),
})

check('Lettre : objet mentionne le service', letter.subject.includes('Orange Livebox'))
check('Lettre : article légal cité dans le corps', letter.body.includes('L.224-39'))
check('Lettre : mention recommandé avec accusé de réception', letter.body.includes('recommandée avec accusé de réception'))
check('Lettre : référence client reprise', letter.body.includes('CL-123456'))
check('Lettre : coordonnées expéditeur et destinataire présentes',
  letter.body.includes('Julien Peltier') && letter.body.includes('TSA 10008'))
check('Lettre : demande de confirmation écrite et d\'arrêt des prélèvements',
  letter.body.includes('confirmer par écrit') && letter.body.includes('prélèvement'))
check('Lettre : délai d\'effet télécom (10 jours) énoncé', letter.body.includes('dix (10) jours'))

// Chaque régime produit une phrase d'effet distincte et une lettre complète
const base = {
  serviceName: 'Test', senderName: 'A B', senderAddress: 'adr',
  providerName: 'P', providerAddress: 'adrP',
}
const regimes = [
  generateCancellationLetter({ ...base, category: 'utility' }).regime.regime,
  generateCancellationLetter({ ...base, category: 'insurance', subscribedAt: monthsAgo(24) }).regime.regime,
  generateCancellationLetter({ ...base, category: 'fitness', renewalNoticeReceived: false }).regime.regime,
  generateCancellationLetter({ ...base, category: 'press', renewalNoticeReceived: true }).regime.regime,
]
check('Générateur : 4 régimes distincts couverts par la même API',
  JSON.stringify(regimes) === JSON.stringify(['energie', 'hamon', 'chatel_conso', 'droit_commun']),
  JSON.stringify(regimes))


// ─── SAUVEGARDE : correspondance régime → letter_type (schéma v5) ───────────
check('Mapping : hamon → hamon, chatel_* → chatel, reste → standard',
  mapRegimeToLetterType('hamon') === 'hamon'
  && mapRegimeToLetterType('chatel_assurance') === 'chatel'
  && mapRegimeToLetterType('chatel_conso') === 'chatel'
  && mapRegimeToLetterType('telecom') === 'standard'
  && mapRegimeToLetterType('energie') === 'standard'
  && mapRegimeToLetterType('droit_commun') === 'standard')

const row = buildLetterRow({ userId: 'u-123', regime: letter.regime, content: letter.body })
check('Ligne construite : user_id + letter_type valide + contenu complet',
  row.user_id === 'u-123' && ['standard','chatel','hamon','negotiation'].includes(row.letter_type)
  && row.content.includes('L.224-39') && !('commitment_id' in row))
check('Sans utilisateur → erreur claire (pas d\'échec SQL opaque)', (() => {
  try { buildLetterRow({ userId: '', regime: letter.regime, content: letter.body }); return false }
  catch (e) { return (e as Error).message.includes('connexion requise') }
})())
check('Contenu trop court → refusé avant l\'insert', (() => {
  try { buildLetterRow({ userId: 'u-123', regime: letter.regime, content: 'trop court' }); return false }
  catch { return true }
})())

console.log(failures === 0 ? '\n✅ TOUS LES TESTS PASSENT' : `\n❌ ${failures} ÉCHEC(S)`)
process.exit(failures === 0 ? 0 : 1)
