/**
 * Test sandbox — logique métier Serein (méthode BUILD, étape 3)
 * Parseur de relevés + moteur de scoring, sans UI ni base de données.
 * Lancer : npm run test:sandbox
 */
import { parseTransactionsFromText } from '@/lib/pdf/parser'
import { scoreSubscriptions } from '@/lib/scoring/engine'
import { SCORING } from '@/config'
import type { Transaction } from '@/types'

let failures = 0
function check(name: string, cond: boolean, detail = '') {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${!cond && detail ? ` — ${detail}` : ''}`)
  if (!cond) failures++
}

// ─── 1. PARSEUR ─────────────────────────────────────────────────────────────
const sampleStatement = `
RELEVÉ DE COMPTE — JANVIER 2026
05/01/2026 PRLV SEPA NETFLIX.COM -17,99
12/01/2026 PRLV SEPA SPOTIFY AB -10,99
15/01/2026 CB BOULANGERIE DUPONT -4,50
TOTAL DES OPÉRATIONS
`
const parsed = parseTransactionsFromText(sampleStatement, 'upload-test')
check('Parseur : 3 transactions extraites', parsed.length === 3, `obtenu ${parsed.length}`)
const netflix = parsed.find(t => t.merchant === 'Netflix')
check('Parseur : Netflix reconnu (catégorie streaming)', netflix?.category === 'streaming')
check('Parseur : montant français "17,99" → 17.99', netflix?.amount === 17.99, `obtenu ${netflix?.amount}`)
check('Parseur : date DD/MM/YYYY → ISO', netflix?.date === '2026-01-05', `obtenu ${netflix?.date}`)

// ─── 2. MOTEUR DE SCORING ───────────────────────────────────────────────────
type Tx = Omit<Transaction, 'id'>
const tx = (merchant: string, category: Tx['category'], amount: number, date: string): Tx => ({
  upload_id: 'upload-test', date, amount,
  label: merchant, normalized_label: merchant.toLowerCase(), merchant, category,
})

const monthly = (merchant: string, category: Tx['category'], amount: number, fromISO: string, months: number): Tx[] => {
  const out: Tx[] = []
  const d = new Date(fromISO)
  for (let i = 0; i < months; i++) {
    out.push(tx(merchant, category, amount, new Date(d.getFullYear(), d.getMonth() + i, d.getDate()).toISOString().slice(0, 10)))
  }
  return out
}

const fixtures: Tx[] = [
  // Netflix : 13 mois, 17,99 €/mois → vieux (>6 mois) + coût élevé (>15 €)
  ...monthly('Netflix', 'streaming', 17.99, '2025-06-05', 13),
  // Spotify : 5 mois, 10,99 €/mois → doublon streaming, coût modéré
  ...monthly('Spotify', 'streaming', 10.99, '2026-02-12', 5),
  // Amazon Prime : annuel, 69,90 €/an × 2 ans
  tx('Amazon Prime', 'streaming', 69.9, '2025-05-01'),
  tx('Amazon Prime', 'streaming', 69.9, '2026-05-01'),
  // Achat ponctuel : ne doit PAS être détecté comme abonnement
  tx('Boulangerie', 'other', 4.5, '2026-03-15'),
  // Intervalles irréguliers : ne doit PAS être détecté
  tx('Garage', 'other', 120, '2025-08-03'),
  tx('Garage', 'other', 118, '2025-10-27'),
]

const { subscriptions, insight } = scoreSubscriptions(fixtures, 'upload-test')
const byName = (n: string) => subscriptions.find(s => s.merchant === n)

check('Scoring : achat ponctuel exclu', !byName('Boulangerie'))
check('Scoring : intervalles irréguliers exclus', !byName('Garage'))
check('Scoring : Netflix détecté en mensuel', byName('Netflix')?.frequency === 'monthly')
check('Scoring : Netflix vieux + cher → risque élevé (score ≥ 60)',
  (byName('Netflix')?.score_useless ?? 0) >= SCORING.threshold.useless,
  `score ${byName('Netflix')?.score_useless}`)
check('Scoring : abonnement annuel → coût mensualisé ≈ 5,83 €',
  Math.abs((byName('Amazon Prime')?.monthly_cost ?? 0) - 5.83) < 0.01,
  `obtenu ${byName('Amazon Prime')?.monthly_cost}`)
check('Scoring : doublon de catégorie signalé dans le "pourquoi"',
  subscriptions.filter(s => s.category === 'streaming').some(s => s.why.includes('Doublon')))
check('Scoring : tri par score décroissant',
  subscriptions.every((s, i) => i === 0 || (subscriptions[i - 1]?.score_useless ?? 0) >= s.score_useless))

// ─── 3. COHÉRENCE DE L'INSIGHT ──────────────────────────────────────────────
check('Insight : perte annuelle = perte mensuelle × 12',
  insight.annual_loss === Math.round(insight.monthly_loss * 12 * 100) / 100)
check('Insight : indice Serein borné [0, 100]',
  insight.serein_index >= 0 && insight.serein_index <= 100, `obtenu ${insight.serein_index}`)
check('Insight : compte des abonnements inutiles cohérent',
  insight.unused_estimated === subscriptions.filter(s => s.score_useless >= SCORING.threshold.useless).length)

// ─── 4. CHAÎNE COMPLÈTE parseur → scoring ───────────────────────────────────
const pipeline = scoreSubscriptions(parsed, 'upload-test')
check('Pipeline : parseur → scoring sans erreur', pipeline.insight.serein_index >= 0)

console.log(failures === 0 ? '\n✅ TOUS LES TESTS PASSENT' : `\n❌ ${failures} ÉCHEC(S)`)
process.exit(failures === 0 ? 0 : 1)
