/**
 * Test sandbox — résumé du dashboard (logique pure, sans réseau).
 * Lancer : npm run test:sandbox
 */
import { buildDashboardSummary, type DashCommitment, type DashReminder } from '@/lib/dashboard/logic'

let failures = 0
function check(name: string, cond: boolean, detail = '') {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${!cond && detail ? ` — ${detail}` : ''}`)
  if (!cond) failures++
}

const TODAY = '2026-07-02'

const commitments: DashCommitment[] = [
  { id: 'c1', name: 'Assurance auto AXA', service_type: 'insurance', amount: 480, frequency: 'yearly', cancellation_deadline: '2026-07-06', status: 'active' },   // 40 €/mois, échéance 4j → critique
  { id: 'c2', name: 'Box Orange', service_type: 'telecom', amount: 29.9, frequency: 'monthly', status: 'active' },                                                 // 29,90 €/mois, pas d'échéance
  { id: 'c3', name: 'Salle de sport', service_type: 'gym', amount: 30, frequency: 'monthly', cancellation_deadline: '2026-09-01', status: 'active' },              // 30 €/mois, échéance lointaine
  { id: 'c4', name: 'Vieux mag', service_type: 'press', amount: 10, frequency: 'monthly', status: 'cancelled' },                                                   // résilié → hors total
]

const reminders: DashReminder[] = [
  { id: 'r1', commitment_id: 'c1', scheduled_for: '2026-07-01T09:00:00', status: 'pending' },  // échu → dû
  { id: 'r2', commitment_id: 'c3', scheduled_for: '2026-08-18T09:00:00', status: 'pending' },  // à venir
  { id: 'r3', commitment_id: 'c1', scheduled_for: '2026-06-01T09:00:00', status: 'read' },     // traité
]

const s = buildDashboardSummary(commitments, reminders, TODAY)

check('Total mensuel des actifs : 40 + 29,90 + 30 = 99,9 €', s.monthlyTotal === 99.9, `${s.monthlyTotal}`)
check('Total annuel = mensuel × 12', s.annualTotal === Math.round(99.9 * 12 * 100) / 100, `${s.annualTotal}`)
check('3 engagements actifs', s.activeCount === 3)
check('1 engagement résilié', s.cancelledCount === 1)
check('1 rappel dû (échu et en attente)', s.dueRemindersCount === 1)
check('Rappels à venir : les pending triés, dû en tête', s.upcomingReminders[0]?.id === 'r1' && s.upcomingReminders.length === 2)
check('Prochaine échéance = la plus proche (AXA, 06/07)', s.nextDeadline?.commitmentId === 'c1' && s.nextDeadline?.date === '2026-07-06')
check('Urgence de la prochaine échéance = critique (≤ 7 j)', s.nextDeadline?.urgency === 'critique')

// Cas vide : aucun engagement
const empty = buildDashboardSummary([], [], TODAY)
check('Dashboard vide : totaux à 0, pas d\'échéance', empty.monthlyTotal === 0 && empty.activeCount === 0 && empty.nextDeadline === null)

console.log(failures === 0 ? '\n✅ TOUS LES TESTS PASSENT' : `\n❌ ${failures} ÉCHEC(S)`)
process.exit(failures === 0 ? 0 : 1)
