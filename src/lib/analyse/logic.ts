import type { Transaction, Subscription, TransactionCategory } from '@/types'
import type { ServiceType } from '@/lib/commitments/logic'

// ─── ANALYSE DE RELEVÉ DANS LE NAVIGATEUR ───────────────────────────────────
// Le relevé ne quitte JAMAIS l'appareil : extraction (pdfjs) + parseur +
// scoring tournent côté client. Serein détecte et suggère ; le client
// choisit ce qu'il ajoute à ses engagements (limite ORIAS).

export interface TextItem { str: string; x: number; y: number }

/**
 * Reconstruit les lignes d'une page PDF depuis les fragments de texte de
 * pdfjs : regroupement par ordonnée (tolérance), tri haut → bas puis
 * gauche → droite.
 */
export function linesFromTextItems(items: TextItem[], tolerance = 2): string[] {
  const rows: { y: number; items: TextItem[] }[] = []
  for (const it of items) {
    if (!it.str.trim()) continue
    const row = rows.find(r => Math.abs(r.y - it.y) <= tolerance)
    if (row) row.items.push(it)
    else rows.push({ y: it.y, items: [it] })
  }
  return rows
    .sort((a, b) => b.y - a.y) // en PDF, y croît vers le haut
    .map(r => r.items.sort((a, b) => a.x - b.x).map(i => i.str).join(' ').replace(/\s+/g, ' ').trim())
    .filter(Boolean)
}

// ─── SUGGESTIONS D'ENGAGEMENTS ──────────────────────────────────────────────

const CATEGORY_TO_SERVICE: Record<TransactionCategory, ServiceType> = {
  streaming: 'streaming', saas: 'other', telecom: 'telecom',
  insurance: 'insurance', utility: 'energy', fitness: 'gym',
  press: 'other', other: 'other',
}

export interface CommitmentSuggestion {
  name: string
  service_type: ServiceType
  /** coût ramené au mois (fréquence stockée en mensuel) */
  amount: number
  occurrences: number
  risk_level: Subscription['risk_level']
  why: string
  alreadyTracked: boolean
  /**
   * Marchand RECONNU (enseigne d'abonnement identifiée : Netflix, Orange, EDF…),
   * par opposition à une opération « Autre » (achat ponctuel, commerçant inconnu).
   * Sert à ne montrer que les vrais abonnements par défaut, et à masquer le bruit.
   */
  recognized: boolean
}

/**
 * Transforme les abonnements détectés par le moteur de scoring en
 * suggestions d'engagements, en marquant ceux déjà suivis (même nom).
 */
export function buildSuggestions(
  subscriptions: Omit<Subscription, 'id'>[],
  existingNames: string[]
): CommitmentSuggestion[] {
  const existing = new Set(existingNames.map(n => n.trim().toLowerCase()))
  return subscriptions.map(s => ({
    name: s.merchant,
    service_type: CATEGORY_TO_SERVICE[s.category] ?? 'other',
    amount: s.monthly_cost,
    occurrences: s.occurrences,
    risk_level: s.risk_level,
    why: s.why,
    alreadyTracked: existing.has(s.merchant.trim().toLowerCase()),
    recognized: s.category !== 'other', // catégorie précise = enseigne identifiée
  }))
}

/** Statistiques d'analyse affichées à l'utilisateur. */
export function analyseStats(transactions: Omit<Transaction, 'id'>[], suggestions: CommitmentSuggestion[]) {
  const monthly = Math.round(suggestions.reduce((s, x) => s + x.amount, 0) * 100) / 100
  return {
    transactionCount: transactions.length,
    subscriptionCount: suggestions.length,
    newCount: suggestions.filter(s => !s.alreadyTracked).length,
    monthlyTotal: monthly,
    annualTotal: Math.round(monthly * 12 * 100) / 100,
  }
}
