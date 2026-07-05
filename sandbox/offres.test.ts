/**
 * Test sandbox — détection sur relevé réel d'UN mois + offres de référence
 * (méthode BUILD, étape 3). Retours utilisateur du 2026-07-05 :
 * « la lecture du relevé ne détecte pas les abonnements » et
 * « pas de proposition d'offre… vous payez 5,99 chez Orange, payez 2 chez Free ».
 * Lancer : npm run test:sandbox
 */
import { parseTransactionsFromText } from '@/lib/pdf/parser'
import { scoreSubscriptions } from '@/lib/scoring/engine'
import { buildSuggestions } from '@/lib/analyse/logic'
import { compareToMarket, energyAdvice, offerLineFor, probablyFreeToSwitch } from '@/lib/offres/logic'

let failures = 0
function check(name: string, cond: boolean, detail = '') {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${!cond && detail ? ` — ${detail}` : ''}`)
  if (!cond) failures++
}

// ─── 1. RELEVÉ RÉEL D'UN SEUL MOIS : chaque abonnement n'apparaît qu'1 fois ──
const releveUnMois = `
RELEVÉ DE COMPTE — JANVIER 2026
Solde au 01/01/2026 1 523,80
03/01/2026 PRLV SEPA NETFLIX.COM -13,49 1 510,31
05.01 CARTE SPOTIFY AB STOCKHOLM 10,99 EUR
07/01 PRELEVEMENT ORANGE SA-FACTURE MOBILE 5,99 1 493,33
10/01/2026 PRLV SEPA EDF CLIENTS PARTICULIERS -68,40
12/01/2026 PRLV SEPA BASIC-FIT FRANCE -29,99
15/01/2026 CB BOULANGERIE DUPONT -4,50
18/01/2026 VIR SEPA SALAIRE +2 400,00
20/01/2026 PRLV SEPA LOYER AGENCE IMMO 650,00
TOTAL DES OPÉRATIONS 783,36
`
const txs = parseTransactionsFromText(releveUnMois, 'test')

check('Parseur : lignes solde/total ignorées', !txs.some(t => /solde|total/i.test(t.label)))
check('Parseur : date sans année « 05.01 » acceptée', txs.some(t => t.merchant === 'Spotify'))
check('Parseur : colonne solde en fin de ligne → montant débit retenu (Netflix 13,49)',
  txs.find(t => t.merchant === 'Netflix')?.amount === 13.49,
  String(txs.find(t => t.merchant === 'Netflix')?.amount))
check('Parseur : Orange 5,99 malgré le solde 1 493,33 sur la ligne',
  txs.find(t => t.merchant === 'Orange')?.amount === 5.99,
  String(txs.find(t => t.merchant === 'Orange')?.amount))
check('Parseur : montants à séparateur de milliers non confondus',
  !txs.some(t => t.amount > 2000 && t.merchant !== 'Salaire'))

const { subscriptions } = scoreSubscriptions(txs, 'test')
const names = subscriptions.map(s => s.merchant)
check('1 mois : Netflix, Spotify, Orange, EDF, Basic-Fit détectés à 1 occurrence',
  ['Netflix', 'Spotify', 'Orange', 'EDF', 'Basic-Fit'].every(n => names.includes(n)),
  JSON.stringify(names))
check('1 mois : le loyer (PRLV) est proposé aussi', names.includes('Loyer'))
check('1 mois : la boulangerie (CB ponctuel) reste exclue', !names.includes('Boulangerie'))
check('1 mois : le salaire (virement) reste exclu', !names.some(n => /salaire/i.test(n)))

const sugg = buildSuggestions(subscriptions, [])
check('Suggestions : Orange → type télécom, EDF → énergie',
  sugg.find(s => s.name === 'Orange')?.service_type === 'telecom'
  && sugg.find(s => s.name === 'EDF')?.service_type === 'energy')

// La détection multi-mois reste plus fiable que le repli à 1 occurrence
const deuxMois = parseTransactionsFromText(releveUnMois + `
03/02/2026 PRLV SEPA NETFLIX.COM -13,49
`, 'test')
const multi = scoreSubscriptions(deuxMois, 'test').subscriptions.find(s => s.merchant === 'Netflix')
check('2 occurrences mensuelles → confiance supérieure au repli 1 occurrence',
  (multi?.confidence ?? 0) > 0.5, String(multi?.confidence))

// ─── 2. OFFRES DE RÉFÉRENCE (télécom) ───────────────────────────────────────
const orange599 = {
  service_type: 'telecom' as const, amount: 5.99, frequency: 'monthly' as const,
  anniversary_date: null, cancellation_deadline: null, cancellation_notice_days: null,
}
const cmp = compareToMarket(orange599, '2026-07-05')
check('Orange 5,99 €/mois → Free Mobile 2 € proposé', cmp?.best.provider === 'Free Mobile')
check('Économie : 3,99 €/mois soit 47,88 €/an',
  cmp?.savingMonthly === 3.99 && cmp?.savingAnnual === 47.88,
  JSON.stringify([cmp?.savingMonthly, cmp?.savingAnnual]))
check('Sans échéance connue → « probablement plus engagé »', cmp?.probablyFree === true)
check('Message : mentionne le tarif indicatif ET « c\'est vous qui décidez » (limite ORIAS)',
  Boolean(cmp?.message.includes('indicatif') && cmp?.message.includes('vous qui décidez')))

// Box (montant > 18 €) → offres box, pas forfait mobile
const box = compareToMarket({ ...orange599, amount: 42.99 }, '2026-07-05')
check('Box 42,99 € → comparée aux box fibre (≈20 €), pas au forfait 2 €',
  (box?.best.monthly ?? 0) >= 19 && (box?.savingAnnual ?? 0) > 250,
  JSON.stringify(box?.best))

// Encore engagé → prudence dans le message
const engage = compareToMarket({ ...orange599, cancellation_deadline: '2026-12-01' }, '2026-07-05')
check('Échéance future → message de prudence (vérifier l\'engagement)',
  engage?.probablyFree === false && engage.message.includes('Vérifiez'))
check('Échéance passée → libre de changer',
  probablyFreeToSwitch({ ...orange599, cancellation_deadline: '2026-01-01' }, '2026-07-05'))

// Déjà moins cher que le marché → pas de leçon
check('Forfait à 2 € → aucune proposition (rien à gagner)',
  compareToMarket({ ...orange599, amount: 2 }, '2026-07-05') === null)

// ─── 3. ÉNERGIE : repère officiel, pas de fausse promesse ───────────────────
const edf = { service_type: 'energy' as const, amount: 68.4, frequency: 'monthly' as const }
check('Énergie : renvoie vers le comparateur public officiel (energie-info)',
  energyAdvice(edf)?.includes('energie-info') === true)
check('Énergie : rappelle la résiliation sans frais L.224-15',
  energyAdvice(edf)?.includes('L.224-15') === true)
check('offerLineFor : télécom → comparaison, énergie → repère, assurance → rien',
  offerLineFor(orange599) !== null
  && offerLineFor(edf) !== null
  && offerLineFor({ service_type: 'insurance', amount: 42, frequency: 'monthly' }) === null)

console.log(failures === 0 ? '\n✅ TOUS LES TESTS PASSENT' : `\n❌ ${failures} ÉCHEC(S)`)
process.exit(failures === 0 ? 0 : 1)
