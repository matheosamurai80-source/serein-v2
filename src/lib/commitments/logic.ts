import type { TransactionCategory } from '@/types'

// ─── ENGAGEMENTS — logique métier (table commitments, schéma v5) ────────────
// La valeur de la page : prévenir AVANT la fenêtre de résiliation et ramener
// chaque coût à un montant mensuel comparable.

export type ServiceType =
  | 'insurance' | 'energy' | 'water' | 'telecom' | 'streaming'
  | 'gym' | 'tax' | 'loan' | 'rent' | 'other'

export type CommitmentFrequency = 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'one_time'
export type Urgency = 'depassee' | 'critique' | 'bientot' | 'ok'

export interface CommitmentLike {
  name: string
  service_type: ServiceType
  amount: number | null
  frequency: CommitmentFrequency
  anniversary_date?: string | null
  cancellation_deadline?: string | null
  cancellation_notice_days?: number | null
  status?: string
}

/** Coût ramené au mois (les ponctuels ne pèsent pas dans le récurrent). */
export function monthlyEquivalent(amount: number | null, frequency: CommitmentFrequency): number {
  if (!(amount != null && amount > 0)) return 0
  switch (frequency) {
    case 'weekly':    return Math.round(amount * 52 / 12 * 100) / 100
    case 'monthly':   return amount
    case 'quarterly': return Math.round(amount / 3 * 100) / 100
    case 'yearly':    return Math.round(amount / 12 * 100) / 100
    case 'one_time':  return 0
  }
}

/**
 * Date limite effective pour résilier :
 * la date explicite si elle existe, sinon anniversaire − préavis.
 */
export function effectiveDeadline(c: CommitmentLike): string | null {
  if (c.cancellation_deadline) return c.cancellation_deadline
  if (c.anniversary_date && c.cancellation_notice_days != null) {
    const d = new Date(c.anniversary_date)
    d.setDate(d.getDate() - c.cancellation_notice_days)
    return d.toISOString().slice(0, 10)
  }
  return null
}

/** Urgence par rapport à la fenêtre de résiliation. */
export function urgencyOf(c: CommitmentLike, todayISO?: string): Urgency | null {
  const deadline = effectiveDeadline(c)
  if (!deadline) return null
  const today = todayISO ? new Date(todayISO) : new Date()
  const days = Math.ceil((new Date(deadline).getTime() - today.getTime()) / 86_400_000)
  if (days < 0) return 'depassee'
  if (days <= 7) return 'critique'
  if (days <= 30) return 'bientot'
  return 'ok'
}

const URGENCY_RANK: Record<Urgency, number> = { critique: 0, bientot: 1, ok: 2, depassee: 3 }

/** Tri : le plus urgent d'abord, puis le plus cher. */
export function sortCommitments<T extends CommitmentLike>(items: T[], todayISO?: string): T[] {
  return [...items].sort((a, b) => {
    const ua = urgencyOf(a, todayISO); const ub = urgencyOf(b, todayISO)
    const ra = ua ? URGENCY_RANK[ua] : 4; const rb = ub ? URGENCY_RANK[ub] : 4
    if (ra !== rb) return ra - rb
    return monthlyEquivalent(b.amount, b.frequency) - monthlyEquivalent(a.amount, a.frequency)
  })
}

/** Total mensuel des engagements actifs. */
export function totalMonthly(items: CommitmentLike[]): number {
  return Math.round(items
    .filter(c => (c.status ?? 'active') === 'active')
    .reduce((sum, c) => sum + monthlyEquivalent(c.amount, c.frequency), 0) * 100) / 100
}

/** Pont vers le générateur de lettres : type de service → catégorie légale. */
export function serviceTypeToCategory(t: ServiceType): TransactionCategory {
  switch (t) {
    case 'insurance': return 'insurance'
    case 'energy':
    case 'water':     return 'utility'
    case 'telecom':   return 'telecom'
    case 'streaming': return 'streaming'
    case 'gym':       return 'fitness'
    default:          return 'other'
  }
}
