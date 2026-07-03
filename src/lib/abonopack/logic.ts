import { monthlyEquivalent, urgencyOf, type CommitmentLike, type ServiceType } from '@/lib/commitments/logic'

// ─── ABONOPACK — score de vigilance & synthèse d'économies ─────────────────
// Chaque point du score est EXPLICABLE (liste de raisons en français).
// Les économies annoncées sont uniquement celles qu'on peut chiffrer
// honnêtement : les doublons (tout sauf le moins cher de chaque catégorie).
// Serein recommande — le client décide (limite ORIAS).

export type VigilanceLevel = 'faible' | 'moderee' | 'elevee'

export interface ScoredCommitment {
  id: string
  name: string
  service_type: ServiceType
  monthly: number
  score: number
  level: VigilanceLevel
  reasons: string[]
}

export interface AbonopackSummary {
  items: ScoredCommitment[]          // actifs, triés du plus vigilant au moins
  globalScore: number                // 0-100, pondéré par le coût mensuel
  globalLevel: VigilanceLevel
  duplicatesMonthly: number          // € récupérables/mois en supprimant les doublons
  duplicatesAnnual: number
  duplicateNames: string[]           // les doublons candidats à résiliation
  toReviewCount: number              // items en vigilance élevée
}

type Input = CommitmentLike & { id: string; name: string; status?: string }

export function levelOf(score: number): VigilanceLevel {
  if (score >= 60) return 'elevee'
  if (score >= 35) return 'moderee'
  return 'faible'
}

const SERVICE_LABELS: Record<ServiceType, string> = {
  insurance: 'assurance', energy: 'énergie', water: 'eau', telecom: 'télécom',
  streaming: 'streaming', gym: 'sport', loan: 'crédit', rent: 'loyer',
  tax: 'impôts', other: 'divers',
}

/** Score de vigilance 0-100 d'un engagement, avec les raisons de chaque point. */
export function vigilanceOf(c: Input, actives: Input[], todayISO?: string): ScoredCommitment {
  const monthly = monthlyEquivalent(c.amount, c.frequency)
  const reasons: string[] = []
  let score = 0

  const u = urgencyOf(c, todayISO)
  if (u === 'critique')      { score += 35; reasons.push('Fenêtre de résiliation sous 7 jours') }
  else if (u === 'bientot')  { score += 25; reasons.push('Fenêtre de résiliation sous 30 jours') }
  else if (u === 'depassee') { score += 15; reasons.push('Échéance passée — reconduction probable') }
  else if (u === 'ok')       { score += 5 }
  else                       { score += 20; reasons.push('Échéance de résiliation inconnue (angle mort)') }

  if (monthly > 30)      { score += 25; reasons.push(`Coût élevé : ${monthly.toLocaleString('fr-FR')} €/mois`) }
  else if (monthly > 15) { score += 15; reasons.push(`Coût notable : ${monthly.toLocaleString('fr-FR')} €/mois`) }

  const sameType = actives.filter(x => x.service_type === c.service_type)
  if (sameType.length >= 2) {
    score += 25
    reasons.push(`Doublon possible : ${sameType.length} services ${SERVICE_LABELS[c.service_type as ServiceType] ?? c.service_type}`)
  }

  if (c.frequency === 'yearly') { score += 10; reasons.push('Renouvellement annuel en une seule fois') }

  score = Math.min(100, score)
  return {
    id: c.id, name: c.name,
    service_type: c.service_type as ServiceType,
    monthly, score, level: levelOf(score), reasons,
  }
}

/** Synthèse Abonopack sur les engagements actifs. */
export function buildAbonopack(commitments: Input[], todayISO?: string): AbonopackSummary {
  const actives = commitments.filter(c => (c.status ?? 'active') === 'active')
  const items = actives
    .map(c => vigilanceOf(c, actives, todayISO))
    .sort((a, b) => b.score - a.score || b.monthly - a.monthly)

  // Score global pondéré par le coût (un gros abonnement risqué pèse plus)
  const totalWeight = items.reduce((s, i) => s + Math.max(i.monthly, 1), 0)
  const globalScore = items.length
    ? Math.round(items.reduce((s, i) => s + i.score * Math.max(i.monthly, 1), 0) / totalWeight)
    : 0

  // Doublons : dans chaque catégorie à ≥ 2 actifs, tout sauf le moins cher
  // est chiffré comme récupérable.
  let duplicatesMonthly = 0
  const duplicateNames: string[] = []
  const byType = new Map<string, ScoredCommitment[]>()
  for (const i of items) {
    if (!byType.has(i.service_type)) byType.set(i.service_type, [])
    byType.get(i.service_type)!.push(i)
  }
  for (const [, group] of byType) {
    if (group.length < 2) continue
    const sorted = [...group].sort((a, b) => a.monthly - b.monthly)
    for (const extra of sorted.slice(1)) {
      duplicatesMonthly += extra.monthly
      duplicateNames.push(extra.name)
    }
  }
  duplicatesMonthly = Math.round(duplicatesMonthly * 100) / 100

  return {
    items,
    globalScore,
    globalLevel: levelOf(globalScore),
    duplicatesMonthly,
    duplicatesAnnual: Math.round(duplicatesMonthly * 12 * 100) / 100,
    duplicateNames,
    toReviewCount: items.filter(i => i.level === 'elevee').length,
  }
}
