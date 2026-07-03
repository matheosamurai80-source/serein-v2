/**
 * Test sandbox — Rappels (méthode BUILD, étape 3)
 * Planification depuis l'échéance, timing, « dû », tri.
 * Lancer : npm run test:sandbox
 */
import {
  buildReminderForCommitment, reminderTiming,
  daysUntil, isDue, sortReminders, DEFAULT_DAYS_BEFORE,
} from '@/lib/reminders/logic'

let failures = 0
function check(name: string, cond: boolean, detail = '') {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${!cond && detail ? ` — ${detail}` : ''}`)
  if (!cond) failures++
}

const TODAY = '2026-07-02'
const base = { name: 'Assurance auto AXA', service_type: 'insurance' as const, amount: 480, frequency: 'yearly' as const }

// ─── PLANIFICATION ──────────────────────────────────────────────────────────
const r1 = buildReminderForCommitment({ ...base, cancellation_deadline: '2026-09-01' }, { todayISO: TODAY })
check('Rappel planifié 14 j avant l\'échéance par défaut',
  r1?.scheduled_for.slice(0, 10) === '2026-08-18', r1?.scheduled_for)
check('Canal in_app et type cancellation_window', r1?.channel === 'in_app' && r1?.kind === 'cancellation_window')
check('Message mentionne le service et la date limite',
  !!r1 && r1.message.includes('AXA') && r1.message.includes('1 septembre 2026'))
check('DEFAULT_DAYS_BEFORE = 14', DEFAULT_DAYS_BEFORE === 14)

const r2 = buildReminderForCommitment({ ...base, cancellation_deadline: '2026-09-01' }, { daysBefore: 30, todayISO: TODAY })
check('Délai personnalisable (30 j avant → 02/08)', r2?.scheduled_for.slice(0, 10) === '2026-08-02')

// Échéance imminente : le rappel ne doit pas être planifié dans le passé
const r3 = buildReminderForCommitment({ ...base, cancellation_deadline: '2026-07-05' }, { todayISO: TODAY })
check('Échéance dans 3 j : rappel planifié aujourd\'hui (pas dans le passé)',
  r3?.scheduled_for.slice(0, 10) === TODAY, r3?.scheduled_for)

// Via anniversaire − préavis (pas de date explicite)
const r4 = buildReminderForCommitment({ ...base, anniversary_date: '2026-12-01', cancellation_notice_days: 60 }, { todayISO: TODAY })
check('Rappel calculé depuis anniversaire − préavis (02/10 − 14 j = 18/09)',
  r4?.scheduled_for.slice(0, 10) === '2026-09-18', r4?.scheduled_for)

check('Aucune échéance → aucun rappel (null)',
  buildReminderForCommitment({ ...base }, { todayISO: TODAY }) === null)

// ─── TIMING ─────────────────────────────────────────────────────────────────
check('Timing : hier → passé', reminderTiming('2026-07-01T09:00:00', TODAY) === 'passe')
check('Timing : aujourd\'hui → aujourdhui', reminderTiming('2026-07-02T09:00:00', TODAY) === 'aujourdhui')
check('Timing : demain → à venir', reminderTiming('2026-07-03T09:00:00', TODAY) === 'a_venir')
check('daysUntil : dans 16 jours', daysUntil('2026-07-18T09:00:00', TODAY) === 16)

// ─── « DÛ » ─────────────────────────────────────────────────────────────────
check('Rappel en attente et échu → dû', isDue({ scheduled_for: '2026-07-02T09:00:00', status: 'pending' }, TODAY))
check('Rappel en attente mais futur → pas encore dû',
  !isDue({ scheduled_for: '2026-07-20T09:00:00', status: 'pending' }, TODAY))
check('Rappel déjà lu → jamais dû', !isDue({ scheduled_for: '2026-06-01T09:00:00', status: 'read' }, TODAY))

// ─── TRI ────────────────────────────────────────────────────────────────────
const list = [
  { id: 'futur',  scheduled_for: '2026-07-20T09:00:00', status: 'pending' as const },
  { id: 'lu',     scheduled_for: '2026-06-01T09:00:00', status: 'read' as const },
  { id: 'du',     scheduled_for: '2026-07-01T09:00:00', status: 'pending' as const },
]
const sorted = sortReminders(list, TODAY)
check('Tri : le rappel dû passe en tête, le traité en dernier',
  sorted.map(r => r.id).join(',') === 'du,futur,lu', sorted.map(r => r.id).join(','))

console.log(failures === 0 ? '\n✅ TOUS LES TESTS PASSENT' : `\n❌ ${failures} ÉCHEC(S)`)
process.exit(failures === 0 ? 0 : 1)
