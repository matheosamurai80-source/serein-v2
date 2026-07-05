import type { ServiceType } from '@/lib/commitments/logic'
import { effectiveDeadline, monthlyEquivalent, type CommitmentFrequency } from '@/lib/commitments/logic'

// ─── OFFRES DE RÉFÉRENCE DU MARCHÉ ──────────────────────────────────────────
// Serein INFORME : « vous payez X, une offre comparable existe à Y ».
// Il ne souscrit jamais, ne touche aucune commission, ne recommande aucun
// fournisseur en particulier — tarifs INDICATIFS (référence 2026-07), à
// vérifier chez le fournisseur. C'est le client qui décide (limite ORIAS).

export interface MarketOffer {
  provider: string
  name: string
  monthly: number
  note: string
}

/** Forfaits mobiles d'entrée de gamme (sans engagement) — indicatif 2026. */
export const MOBILE_OFFERS: MarketOffer[] = [
  { provider: 'Free Mobile', name: 'Forfait 2 €', monthly: 2,    note: '2 h d\'appels · 50 Mo (0 € pour les abonnés Freebox)' },
  { provider: 'Prixtel',     name: 'Le petit',    monthly: 5.99, note: 'forfait ajustable ~30 Go' },
  { provider: 'RED by SFR',  name: 'Forfait 5G',  monthly: 7.99, note: '~100 Go, sans engagement' },
  { provider: 'B&You',       name: 'B&You 100 Go', monthly: 7.99, note: 'sans engagement' },
]

/** Box internet fibre d'entrée de gamme — indicatif 2026. */
export const BOX_OFFERS: MarketOffer[] = [
  { provider: 'Free',      name: 'Freebox Révolution Light', monthly: 19.99, note: 'fibre, sans engagement' },
  { provider: 'Sosh',      name: 'La Boîte Sosh',            monthly: 19.99, note: 'fibre, sans engagement' },
  { provider: 'B&You',     name: 'Pure fibre',               monthly: 23.99, note: 'fibre 2 Gb/s, sans engagement' },
  { provider: 'RED by SFR', name: 'RED box fibre',           monthly: 24.99, note: 'sans engagement' },
]

/** Seuil qui sépare un forfait mobile d'une box dans une même catégorie télécom. */
const MOBILE_MAX_MONTHLY = 18

/** Formules streaming avec publicité — indicatif 2026. */
export const STREAMING_ADS_OFFERS: MarketOffer[] = [
  { provider: 'Netflix',  name: 'Essentiel avec pub', monthly: 5.99, note: 'avec publicité' },
  { provider: 'Disney+',  name: 'Standard avec pub',  monthly: 5.99, note: 'avec publicité' },
]

/** Salles de sport d'entrée de gamme — indicatif 2026. */
export const GYM_OFFERS: MarketOffer[] = [
  { provider: 'Basic-Fit',    name: 'Comfort',   monthly: 24.99, note: 'sans engagement selon formule' },
  { provider: 'Fitness Park', name: 'Essentiel', monthly: 29.95, note: 'accès multi-clubs' },
]

export interface OfferComparison {
  /** Meilleure offre de référence pour ce type de dépense */
  best: MarketOffer
  /** Économie estimée par mois (0 si l'offre actuelle est déjà mieux) */
  savingMonthly: number
  savingAnnual: number
  /** true = plus d'engagement connu (échéance passée ou aucune) */
  probablyFree: boolean
  /** Phrase prête à afficher, dans la limite légale */
  message: string
}

export interface OfferInput {
  service_type: ServiceType
  amount: number | null
  frequency: CommitmentFrequency
  anniversary_date?: string | null
  cancellation_deadline?: string | null
  cancellation_notice_days?: number | null
}

function round2(n: number): number { return Math.round(n * 100) / 100 }

/** Le client est-il vraisemblablement libre de changer (plus d'engagement) ? */
export function probablyFreeToSwitch(c: OfferInput, todayISO?: string): boolean {
  const deadline = effectiveDeadline({
    name: '', service_type: c.service_type, amount: c.amount, frequency: c.frequency,
    anniversary_date: c.anniversary_date ?? null,
    cancellation_deadline: c.cancellation_deadline ?? null,
    cancellation_notice_days: c.cancellation_notice_days ?? null,
  })
  if (!deadline) return true // aucun engagement connu
  const today = todayISO ? new Date(todayISO) : new Date()
  return new Date(deadline).getTime() < today.getTime()
}

/**
 * Compare un engagement télécom aux offres de référence du marché.
 * Retourne null si la catégorie n'est pas comparable ou si le montant manque.
 */
export function compareToMarket(c: OfferInput, todayISO?: string): OfferComparison | null {
  const monthly = monthlyEquivalent(c.amount, c.frequency)
  if (monthly <= 0) return null

  const pool =
    c.service_type === 'telecom' ? (monthly <= MOBILE_MAX_MONTHLY ? MOBILE_OFFERS : BOX_OFFERS)
    : c.service_type === 'streaming' ? STREAMING_ADS_OFFERS
    : c.service_type === 'gym' ? GYM_OFFERS
    : null
  if (!pool) return null

  const best = pool.reduce((a, b) => (a.monthly <= b.monthly ? a : b))
  const savingMonthly = round2(Math.max(0, monthly - best.monthly))
  if (savingMonthly < 1) return null // pas de leçon pour 50 centimes
  const probablyFree = probablyFreeToSwitch(c, todayISO)
  const freedom = probablyFree
    ? 'Vous n\'êtes probablement plus engagé : vous pouvez changer quand vous voulez.'
    : 'Vérifiez votre date de fin d\'engagement avant de changer.'
  return {
    best,
    savingMonthly,
    savingAnnual: round2(savingMonthly * 12),
    probablyFree,
    message:
      `Vous payez ${monthly.toLocaleString('fr-FR')} €/mois. Offre comparable : `
      + `${best.provider} ${best.name} à ${best.monthly.toLocaleString('fr-FR')} €/mois `
      + `(${best.note}) → jusqu'à ${round2(savingMonthly * 12).toLocaleString('fr-FR')} €/an d'économie. `
      + `${freedom} Tarif indicatif — c'est vous qui décidez.`,
  }
}

/**
 * Conseil énergie : le montant mensuel dépend de la consommation, on ne peut
 * pas promettre un prix — on donne le repère officiel et le bon réflexe.
 */
export function energyAdvice(c: OfferInput): string | null {
  if (c.service_type !== 'energy') return null
  return (
    'Électricité : prix repère ~0,20 €/kWh (tarif réglementé). Des offres indexées font '
    + '5 à 15 % de moins — comparez sur comparateur.energie-info.fr (comparateur public officiel, neutre). '
    + 'Un contrat d\'énergie se résilie à tout moment, sans frais (L.224-15) : le nouveau fournisseur '
    + 's\'occupe du changement, sans coupure.'
  )
}

/**
 * Conseil assurance : les tarifs dépendent du profil, pas de chiffre promis —
 * on rappelle le droit (Hamon) et le bon réflexe (comparer à garanties égales).
 */
export function insuranceAdvice(c: OfferInput): string | null {
  if (c.service_type !== 'insurance') return null
  return (
    'Assurance : après 1 an de contrat, résiliable à tout moment sans frais (loi Hamon) — '
    + 'le nouvel assureur s\'occupe des démarches. Les écarts de prix atteignent souvent 20 à 30 % '
    + 'à garanties égales : faites établir 2 ou 3 devis avant l\'échéance. C\'est vous qui décidez.'
  )
}

/** Point d'entrée unique pour la carte d'un engagement. */
export function offerLineFor(c: OfferInput, todayISO?: string): string | null {
  const cmp = compareToMarket(c, todayISO)
  if (cmp) return cmp.message
  return energyAdvice(c) ?? insuranceAdvice(c)
}
