import type { Subscription } from '@/types'

// ─── DÉTECTION → LIGNES `subscriptions` (logique pure, testable) ─────────────
// Le moteur de scoring parle en `monthly_cost` + fréquence ('weekly'|'monthly'|
// 'annual'). La table `subscriptions` veut le VRAI montant du prélèvement et une
// fréquence ∈ weekly|monthly|quarterly|yearly. On convertit ici, on repère les
// abonnements « dormants » (plus vus depuis longtemps), et on dédoublonne par nom.

export type DetectedInput = Pick<
  Subscription,
  'merchant' | 'monthly_cost' | 'frequency' | 'occurrences' | 'confidence' | 'last_seen'
>

export interface DetectedSubscriptionRow {
  name: string
  amount: number
  frequency: 'weekly' | 'monthly' | 'quarterly' | 'yearly'
  source: 'statement'
  occurrences: number
  last_seen: string | null
  confidence: number
  dormant: boolean
  detected_automatically: true
}

/** Nombre de jours sans prélèvement au-delà duquel un abonnement est « dormant ». */
export const DORMANT_AFTER_DAYS = 60

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

/** Fréquence du moteur → fréquence de la table (`annual` devient `yearly`). */
export function mapDetectionFrequency(f: Subscription['frequency']): DetectedSubscriptionRow['frequency'] {
  return f === 'annual' ? 'yearly' : f
}

/**
 * Montant réel du prélèvement. Le moteur normalise l'annuel en mensuel
 * (`monthly_cost = avgAmount / 12`) ; on reconstruit le montant par échéance.
 */
export function chargeAmount(sub: Pick<Subscription, 'monthly_cost' | 'frequency'>): number {
  const raw = sub.frequency === 'annual' ? sub.monthly_cost * 12 : sub.monthly_cost
  return Math.round(raw * 100) / 100
}

/** Vrai si `last_seen` est plus vieux que le seuil dormant (dates AAAA-MM-JJ). */
export function isDormant(lastSeen: string | null, todayISO: string, thresholdDays = DORMANT_AFTER_DAYS): boolean {
  if (!lastSeen || !ISO_DATE.test(lastSeen)) return false
  const days = (Date.parse(todayISO) - Date.parse(lastSeen)) / 86_400_000
  return days > thresholdDays
}

/** Convertit une détection en ligne prête à enregistrer. */
export function toDetectedRow(sub: DetectedInput, opts: { todayISO: string }): DetectedSubscriptionRow {
  const last_seen = ISO_DATE.test(sub.last_seen) ? sub.last_seen : null
  return {
    name: sub.merchant.trim(),
    amount: chargeAmount(sub),
    frequency: mapDetectionFrequency(sub.frequency),
    source: 'statement',
    occurrences: sub.occurrences,
    last_seen,
    confidence: sub.confidence,
    dormant: isDormant(last_seen, opts.todayISO),
    detected_automatically: true,
  }
}

/**
 * Prépare le lot à enregistrer : conversion + retrait des noms déjà connus
 * (insensible à la casse) pour ne pas créer de doublons à chaque analyse.
 */
export function buildDetectedRows(
  detected: DetectedInput[],
  existingNames: string[],
  opts: { todayISO: string },
): DetectedSubscriptionRow[] {
  const known = new Set(existingNames.map(n => n.toLowerCase().trim()))
  const seen = new Set<string>()
  const rows: DetectedSubscriptionRow[] = []
  for (const d of detected) {
    const key = d.merchant.toLowerCase().trim()
    if (!key || known.has(key) || seen.has(key)) continue
    seen.add(key)
    rows.push(toDetectedRow(d, opts))
  }
  return rows
}
