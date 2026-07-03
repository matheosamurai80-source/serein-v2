import {
  effectiveDeadline, urgencyOf, totalMonthly,
  type CommitmentLike, type Urgency,
} from '@/lib/commitments/logic'
import { isDue, sortReminders, type ReminderLike } from '@/lib/reminders/logic'

// ─── DASHBOARD — résumé (logique pure, testable) ────────────────────────────

export interface DashCommitment extends CommitmentLike { id: string }
export interface DashReminder extends ReminderLike { id: string; commitment_id: string; message?: string | null }

export interface NextDeadline {
  commitmentId: string
  name: string
  date: string
  urgency: Urgency
}

export interface DashboardSummary {
  monthlyTotal: number
  annualTotal: number
  activeCount: number
  cancelledCount: number
  dueRemindersCount: number
  upcomingReminders: DashReminder[]
  nextDeadline: NextDeadline | null
}

export function buildDashboardSummary(
  commitments: DashCommitment[],
  reminders: DashReminder[],
  todayISO?: string
): DashboardSummary {
  const active = commitments.filter(c => (c.status ?? 'active') === 'active')
  const monthlyTotal = totalMonthly(commitments)
  const annualTotal = Math.round(monthlyTotal * 12 * 100) / 100

  // Prochaine échéance de résiliation : la plus proche parmi les actifs
  const withDeadline = active
    .map(c => ({ c, d: effectiveDeadline(c) }))
    .filter((x): x is { c: DashCommitment; d: string } => !!x.d)
    .sort((a, b) => a.d.localeCompare(b.d))
  const first = withDeadline[0]
  const nextDeadline: NextDeadline | null = first
    ? { commitmentId: first.c.id, name: first.c.name ?? 'Engagement', date: first.d, urgency: urgencyOf(first.c, todayISO) ?? 'ok' }
    : null

  const pending = reminders.filter(r => (r.status ?? 'pending') === 'pending')
  const upcomingReminders = sortReminders(pending, todayISO).slice(0, 3)
  const dueRemindersCount = reminders.filter(r => isDue(r, todayISO)).length

  return {
    monthlyTotal,
    annualTotal,
    activeCount: active.length,
    cancelledCount: commitments.length - active.length,
    dueRemindersCount,
    upcomingReminders,
    nextDeadline,
  }
}
