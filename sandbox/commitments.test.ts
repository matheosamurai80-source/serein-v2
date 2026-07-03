/**
 * Test sandbox — page Engagements (méthode BUILD, étape 3)
 * Coût mensualisé, fenêtre de résiliation, urgence, tri, pont vers la lettre.
 * Lancer : npm run test:sandbox
 */
import {
  monthlyEquivalent, effectiveDeadline, urgencyOf,
  sortCommitments, totalMonthly, serviceTypeToCategory,
} from '@/lib/commitments/logic'

let failures = 0
function check(name: string, cond: boolean, detail = '') {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${!cond && detail ? ` — ${detail}` : ''}`)
  if (!cond) failures++
}

const TODAY = '2026-07-02'

// ─── COÛT MENSUALISÉ ────────────────────────────────────────────────────────
check('Mensuel 29 € → 29 €/mois', monthlyEquivalent(29, 'monthly') === 29)
check('Annuel 480 € → 40 €/mois', monthlyEquivalent(480, 'yearly') === 40)
check('Trimestriel 90 € → 30 €/mois', monthlyEquivalent(90, 'quarterly') === 30)
check('Hebdo 10 € → 43,33 €/mois', monthlyEquivalent(10, 'weekly') === 43.33)
check('Ponctuel → 0 €/mois (ne pèse pas dans le récurrent)', monthlyEquivalent(500, 'one_time') === 0)
check('Montant absent → 0', monthlyEquivalent(null, 'monthly') === 0)

// ─── FENÊTRE DE RÉSILIATION ─────────────────────────────────────────────────
const base = { name: 'X', service_type: 'other' as const, amount: 10, frequency: 'monthly' as const }
check('Date limite explicite prioritaire',
  effectiveDeadline({ ...base, cancellation_deadline: '2026-08-01', anniversary_date: '2026-12-01', cancellation_notice_days: 60 }) === '2026-08-01')
check('Sinon : anniversaire − préavis (01/12 − 60 j = 02/10)',
  effectiveDeadline({ ...base, anniversary_date: '2026-12-01', cancellation_notice_days: 60 }) === '2026-10-02')
check('Aucune info d\'échéance → null', effectiveDeadline(base) === null)

// ─── URGENCE ────────────────────────────────────────────────────────────────
check('Échéance dans 5 jours → critique', urgencyOf({ ...base, cancellation_deadline: '2026-07-07' }, TODAY) === 'critique')
check('Échéance dans 20 jours → bientôt', urgencyOf({ ...base, cancellation_deadline: '2026-07-22' }, TODAY) === 'bientot')
check('Échéance dans 3 mois → ok', urgencyOf({ ...base, cancellation_deadline: '2026-10-01' }, TODAY) === 'ok')
check('Échéance passée → dépassée', urgencyOf({ ...base, cancellation_deadline: '2026-06-01' }, TODAY) === 'depassee')
check('Pas d\'échéance → pas de badge (null)', urgencyOf(base, TODAY) === null)

// ─── TRI & TOTAL ────────────────────────────────────────────────────────────
const items = [
  { ...base, name: 'Sans échéance cher', amount: 100 },
  { ...base, name: 'Critique', amount: 15, cancellation_deadline: '2026-07-05' },
  { ...base, name: 'Bientôt', amount: 50, cancellation_deadline: '2026-07-25' },
  { ...base, name: 'Ok annuel', amount: 480, frequency: 'yearly' as const, cancellation_deadline: '2026-12-01' },
]
const sorted = sortCommitments(items, TODAY)
check('Tri : urgence d\'abord (critique > bientôt > ok), puis sans échéance',
  sorted.map(c => c.name).join(' | ') === 'Critique | Bientôt | Ok annuel | Sans échéance cher',
  sorted.map(c => c.name).join(' | '))
check('Total mensuel des actifs : 15 + 50 + 40 + 100 = 205 €', totalMonthly(items) === 205)
check('Les engagements résiliés ne comptent plus dans le total',
  totalMonthly([...items, { ...base, amount: 999, status: 'cancelled' }]) === 205)

// ─── PONT VERS LA LETTRE ────────────────────────────────────────────────────
check('Correspondance service → catégorie légale (assurance/énergie/télécom/sport)',
  serviceTypeToCategory('insurance') === 'insurance'
  && serviceTypeToCategory('energy') === 'utility'
  && serviceTypeToCategory('water') === 'utility'
  && serviceTypeToCategory('telecom') === 'telecom'
  && serviceTypeToCategory('gym') === 'fitness'
  && serviceTypeToCategory('loan') === 'other')

console.log(failures === 0 ? '\n✅ TOUS LES TESTS PASSENT' : `\n❌ ${failures} ÉCHEC(S)`)
process.exit(failures === 0 ? 0 : 1)
