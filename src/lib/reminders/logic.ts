import { effectiveDeadline, type CommitmentLike } from '@/lib/commitments/logic'

// ─── RAPPELS — logique métier (table reminders, schéma v5) ──────────────────
// La promesse de Serein : prévenir AVANT que la fenêtre de résiliation ne se
// referme. Un rappel = une échéance d'engagement + un délai d'anticipation.

export type ReminderKind = 'cancellation_window' | 'renewal' | 'payment_due' | 'negotiation' | 'custom'
export type ReminderChannel = 'in_app' | 'email' | 'sms'
export type ReminderStatus = 'pending' | 'sent' | 'failed' | 'cancelled' | 'read'
export type ReminderTiming = 'passe' | 'aujourdhui' | 'a_venir'

export const DEFAULT_DAYS_BEFORE = 14

export interface ReminderDraft {
  kind: ReminderKind
  channel: ReminderChannel
  scheduled_for: string   // ISO datetime
  message: string
}

export interface ReminderLike {
  scheduled_for: string
  status?: ReminderStatus
}

const startOfDay = (iso?: string) => {
  const d = iso ? new Date(iso) : new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

/** Message par défaut, en langage simple. */
export function defaultReminderMessage(name: string, deadlineISO: string): string {
  const d = new Date(deadlineISO).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
  return `Fenêtre de résiliation de « ${name} » : à faire avant le ${d}. La lettre est prête dans Serein.`
}

/**
 * Construit un rappel pour un engagement, planifié `daysBefore` jours avant sa
 * date limite. Si cette date est déjà passée, le rappel est planifié pour
 * aujourd'hui (il doit alerter tout de suite). Renvoie null sans échéance.
 */
export function buildReminderForCommitment(
  c: CommitmentLike & { name: string },
  opts?: { daysBefore?: number; todayISO?: string }
): ReminderDraft | null {
  const deadline = effectiveDeadline(c)
  if (!deadline) return null
  const daysBefore = opts?.daysBefore ?? DEFAULT_DAYS_BEFORE
  const target = startOfDay(deadline)
  target.setDate(target.getDate() - daysBefore)
  const today = startOfDay(opts?.todayISO)
  const scheduled = target < today ? today : target
  scheduled.setHours(9, 0, 0, 0)
  return {
    kind: 'cancellation_window',
    channel: 'in_app',
    scheduled_for: scheduled.toISOString(),
    message: defaultReminderMessage(c.name, deadline),
  }
}

/** Position dans le temps (granularité jour). */
export function reminderTiming(scheduledForISO: string, todayISO?: string): ReminderTiming {
  const s = startOfDay(scheduledForISO).getTime()
  const t = startOfDay(todayISO).getTime()
  if (s < t) return 'passe'
  if (s === t) return 'aujourdhui'
  return 'a_venir'
}

/** Nombre de jours avant le rappel (négatif si passé). */
export function daysUntil(scheduledForISO: string, todayISO?: string): number {
  return Math.round((startOfDay(scheduledForISO).getTime() - startOfDay(todayISO).getTime()) / 86_400_000)
}

/** Un rappel « dû » = en attente et dont l'heure est atteinte → à afficher en alerte. */
export function isDue(r: ReminderLike, todayISO?: string): boolean {
  const status = r.status ?? 'pending'
  if (status !== 'pending') return false
  return reminderTiming(r.scheduled_for, todayISO) !== 'a_venir'
}

const STATUS_RANK: Record<ReminderStatus, number> = {
  pending: 0, sent: 1, failed: 1, read: 2, cancelled: 3,
}

/** Tri : dûs en attente d'abord, puis à venir par date, traités en dernier. */
export function sortReminders<T extends ReminderLike>(items: T[], todayISO?: string): T[] {
  return [...items].sort((a, b) => {
    const da = isDue(a, todayISO) ? 0 : 1
    const db = isDue(b, todayISO) ? 0 : 1
    if (da !== db) return da - db
    const ra = STATUS_RANK[a.status ?? 'pending']
    const rb = STATUS_RANK[b.status ?? 'pending']
    if (ra !== rb) return ra - rb
    return new Date(a.scheduled_for).getTime() - new Date(b.scheduled_for).getTime()
  })
}
