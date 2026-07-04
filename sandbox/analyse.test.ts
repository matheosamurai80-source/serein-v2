/**
 * Test sandbox — analyse navigateur + Unik (méthode BUILD, étape 3)
 * Reconstruction des lignes PDF, suggestions d'engagements, conseils Unik.
 * Lancer : npm run test:sandbox
 */
import { linesFromTextItems, buildSuggestions, analyseStats } from '@/lib/analyse/logic'
import { unikAdviceFor } from '@/lib/unik/logic'
import { parseTransactionsFromText } from '@/lib/pdf/parser'
import { scoreSubscriptions } from '@/lib/scoring/engine'

let failures = 0
function check(name: string, cond: boolean, detail = '') {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${!cond && detail ? ` — ${detail}` : ''}`)
  if (!cond) failures++
}

// ─── RECONSTRUCTION DES LIGNES PDF ──────────────────────────────────────────
// fragments dans le désordre, deux lignes (y=700 et y=680), avec fragments décalés
const items = [
  { str: '-13,49', x: 300, y: 700.8 },
  { str: '05/01/2026', x: 20, y: 700 },
  { str: 'PRLV SEPA NETFLIX.COM', x: 90, y: 700.4 },
  { str: 'PRLV SPOTIFY', x: 90, y: 680 },
  { str: '12/01/2026', x: 20, y: 680.6 },
  { str: '-10,99', x: 300, y: 679.9 },
  { str: '   ', x: 0, y: 660 },
]
const lines = linesFromTextItems(items)
check('Lignes reconstruites : 2 lignes, fragments recollés dans l\'ordre',
  lines.length === 2 && lines[0] === '05/01/2026 PRLV SEPA NETFLIX.COM -13,49',
  JSON.stringify(lines))
check('Haut de page en premier (y décroissant)', lines[1].includes('SPOTIFY'))

// ─── CHAÎNE COMPLÈTE : lignes → parseur → scoring → suggestions ─────────────
const releve = `
${lines.join('\n')}
05/02/2026 PRLV SEPA NETFLIX.COM -13,49
12/02/2026 PRLV SPOTIFY -10,99
05/03/2026 PRLV SEPA NETFLIX.COM -13,49
12/03/2026 PRLV SPOTIFY -10,99
15/03/2026 CB BOULANGERIE -4,50
`
const txs = parseTransactionsFromText(releve, 'browser')
const { subscriptions } = scoreSubscriptions(txs, 'browser')
const sugg = buildSuggestions(subscriptions, ['netflix'])
check('Pipeline navigateur : Netflix et Spotify détectés, pas la boulangerie',
  sugg.some(s => s.name === 'Netflix') && sugg.some(s => s.name === 'Spotify') && !sugg.some(s => s.name.includes('Boulangerie')))
check('Déjà suivi : Netflix marqué alreadyTracked (insensible à la casse)',
  sugg.find(s => s.name === 'Netflix')?.alreadyTracked === true
  && sugg.find(s => s.name === 'Spotify')?.alreadyTracked === false)
check('Catégorie → type de service : streaming → streaming',
  sugg.find(s => s.name === 'Netflix')?.service_type === 'streaming')
check('Montant = coût mensualisé positif', sugg.every(s => s.amount > 0))

const stats = analyseStats(txs, sugg)
check('Stats : compteurs cohérents (2 abonnements dont 1 nouveau)',
  stats.subscriptionCount === 2 && stats.newCount === 1 && stats.transactionCount === txs.length)
check('Stats : annuel = mensuel × 12', stats.annualTotal === Math.round(stats.monthlyTotal * 12 * 100) / 100)

// ─── CONSEILS UNIK ──────────────────────────────────────────────────────────
const base = { name: 'X', amount: 20, frequency: 'monthly' as const }
check('Télécom → L.224-39, résiliable à tout moment',
  unikAdviceFor({ ...base, service_type: 'telecom' })!.cancellableAnytime === true)
check('Énergie → L.224-15 sans frais', (() => {
  const a = unikAdviceFor({ ...base, service_type: 'energy' })!
  return a.cancellableAnytime && a.text.includes('L.224-15')
})())
check('Assurance → mention loi Hamon', unikAdviceFor({ ...base, service_type: 'insurance' })!.text.includes('Hamon'))
check('Streaming sans échéance → Chatel gratuit à tout moment',
  unikAdviceFor({ ...base, service_type: 'streaming' })!.cancellableAnytime === true)
check('Salle de sport AVEC échéance → agir avant la date (pas « à tout moment »)', (() => {
  const a = unikAdviceFor({ ...base, service_type: 'gym', cancellation_deadline: '2026-09-01' })!
  return !a.cancellableAnytime && a.text.includes('date limite')
})())
check('Loyer / crédit / impôts → pas de conseil générique (null)',
  unikAdviceFor({ ...base, service_type: 'rent' }) === null
  && unikAdviceFor({ ...base, service_type: 'loan' }) === null
  && unikAdviceFor({ ...base, service_type: 'tax' }) === null)

console.log(failures === 0 ? '\n✅ TOUS LES TESTS PASSENT' : `\n❌ ${failures} ÉCHEC(S)`)
process.exit(failures === 0 ? 0 : 1)
