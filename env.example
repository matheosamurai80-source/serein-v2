import type { Transaction, Subscription, Insight, RiskLevel, Frequency } from '@/types'
import { SCORING } from '@/config'

const TOLERANCE = 0.15
const MIN_OCCURRENCES = 2

// ─── HELPERS ───────────────────────────────────────────────────────────────
function daysBetween(d1: Date, d2: Date): number {
  return Math.abs(d2.getTime() - d1.getTime()) / 86_400_000
}

function detectFrequency(avgDays: number): Frequency | null {
  if (avgDays >= 5  && avgDays <= 9)   return 'weekly'
  if (avgDays >= 25 && avgDays <= 35)  return 'monthly'
  if (avgDays >= 340 && avgDays <= 390) return 'annual'
  return null
}

function amountSimilar(a: number, b: number): boolean {
  const max = Math.max(a, b)
  return max === 0 ? true : Math.abs(a - b) / max <= TOLERANCE
}

// ─── RECURRENCE DETECTION ──────────────────────────────────────────────────
function detectRecurrence(txs: Omit<Transaction, 'id'>[]): {
  frequency: Frequency
  avgAmount: number
  confidence: number
  firstSeen: string
  lastSeen: string
} | null {
  if (txs.length < MIN_OCCURRENCES) return null

  const sorted = [...txs].sort((a, b) =>
    new Date(a.date).getTime() - new Date(b.date).getTime()
  )

  const intervals: number[] = []
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]
    const curr = sorted[i]
    if (!prev || !curr) continue
    if (amountSimilar(curr.amount, sorted[0]?.amount ?? 0)) {
      intervals.push(daysBetween(new Date(prev.date), new Date(curr.date)))
    }
  }

  if (intervals.length === 0) return null

  const avgDays = intervals.reduce((a, b) => a + b, 0) / intervals.length
  const frequency = detectFrequency(avgDays)
  if (!frequency) return null

  const avgAmount = txs.reduce((sum, t) => sum + t.amount, 0) / txs.length
  const stdDev = Math.sqrt(
    intervals.reduce((sum, v) => sum + Math.pow(v - avgDays, 2), 0) / intervals.length
  )
  const regularity = Math.max(0, 1 - stdDev / avgDays)
  const occurrenceBonus = Math.min(1, txs.length / 8)
  const confidence = Math.min(1, regularity * 0.6 + occurrenceBonus * 0.4)

  return {
    frequency,
    avgAmount: Math.round(avgAmount * 100) / 100,
    confidence: Math.round(confidence * 100) / 100,
    firstSeen: sorted[0]?.date ?? '',
    lastSeen: sorted[sorted.length - 1]?.date ?? '',
  }
}

// ─── USELESS SCORE ─────────────────────────────────────────────────────────
function computeUselessScore(params: {
  ageMonths: number
  isDuplicate: boolean
  monthlyCost: number
  occurrences: number
}): number {
  const { ageMonths, isDuplicate, monthlyCost } = params
  let score = 0
  if (ageMonths > SCORING.threshold.oldMonths)   score += SCORING.weights.age
  if (isDuplicate)                               score += SCORING.weights.duplicate
  if (monthlyCost > SCORING.threshold.highCost)  score += SCORING.weights.highCost
  score += SCORING.weights.lowUsage * 0.5 // base assumption
  return Math.min(100, score)
}

function getRiskLevel(score: number): RiskLevel {
  if (score >= 70) return 'high'
  if (score >= 40) return 'medium'
  return 'low'
}

function buildWhy(params: {
  merchant: string
  ageMonths: number
  isDuplicate: boolean
  category: string
  monthlyCost: number
}): string {
  const parts: string[] = []
  if (params.ageMonths > 6)
    parts.push(`Actif depuis ${params.ageMonths} mois sans variation détectée`)
  if (params.isDuplicate)
    parts.push(`Doublon probable avec un autre service ${params.category}`)
  if (params.monthlyCost > SCORING.threshold.highCost)
    parts.push(`Coût élevé (${params.monthlyCost}€/mois) pour cette catégorie`)
  return parts.length > 0 ? parts.join('. ') + '.' : 'Abonnement récurrent détecté.'
}

// ─── MAIN ENGINE ───────────────────────────────────────────────────────────
export function scoreSubscriptions(
  transactions: Omit<Transaction, 'id'>[],
  uploadId: string
): {
  subscriptions: Omit<Subscription, 'id'>[]
  insight: Omit<Insight, 'id' | 'upload_id' | 'created_at'>
} {
  // Group by merchant
  const groups = new Map<string, Omit<Transaction, 'id'>[]>()
  for (const tx of transactions) {
    const key = tx.merchant.toLowerCase()
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(tx)
  }

  const subscriptions: Omit<Subscription, 'id'>[] = []

  for (const [, txs] of groups) {
    if (!txs[0]) continue
    const rec = detectRecurrence(txs)
    if (!rec || rec.confidence < 0.3) continue

    const firstDate = new Date(rec.firstSeen)
    const ageMonths = Math.floor(daysBetween(firstDate, new Date()) / 30)

    // Check duplicate category
    const sameCategory = subscriptions.filter(s => s.category === txs[0]?.category)
    const isDuplicate = sameCategory.length > 0

    const monthlyCost = rec.frequency === 'annual'
      ? Math.round(rec.avgAmount / 12 * 100) / 100
      : rec.avgAmount

    const score = computeUselessScore({
      ageMonths,
      isDuplicate,
      monthlyCost,
      occurrences: txs.length,
    })

    subscriptions.push({
      upload_id:    uploadId,
      merchant:     txs[0].merchant,
      category:     txs[0].category,
      monthly_cost: monthlyCost,
      frequency:    rec.frequency,
      occurrences:  txs.length,
      confidence:   rec.confidence,
      score_useless: score,
      risk_level:   getRiskLevel(score),
      why:          buildWhy({
        merchant:    txs[0].merchant,
        ageMonths,
        isDuplicate,
        category:    txs[0].category,
        monthlyCost,
      }),
      first_seen: rec.firstSeen,
      last_seen:  rec.lastSeen,
    })
  }

  // Sort by score desc
  subscriptions.sort((a, b) => b.score_useless - a.score_useless)

  // Compute insight
  const useless = subscriptions.filter(s => s.score_useless >= SCORING.threshold.useless)
  const monthlyLoss = Math.round(useless.reduce((sum, s) => sum + s.monthly_cost, 0) * 100) / 100
  const annualLoss = Math.round(monthlyLoss * 12 * 100) / 100
  const totalSpent = subscriptions.reduce((sum, s) => sum + s.monthly_cost, 0)
  const sereinIndex = totalSpent > 0
    ? Math.max(0, Math.round(100 - (monthlyLoss / totalSpent) * 100))
    : 100

  return {
    subscriptions,
    insight: {
      total_subscriptions: subscriptions.length,
      unused_estimated:    useless.length,
      monthly_loss:        monthlyLoss,
      annual_loss:         annualLoss,
      serein_index:        sereinIndex,
    },
  }
}
