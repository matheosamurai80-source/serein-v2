// ─── ACCUEIL « À FAIRE » (logique pure) ─────────────────────────────────────
// Agrège les échéances de tous les services en 5 cartes triées par urgence.
// `aujourdhui` est TOUJOURS injecté (jamais Date.now() ici) → tests déterministes.
// Découplé des tables : le composant mappe ses lignes vers ces formes.

export type Urgence = 'retard' | 'critique' | 'bientot' | 'ok'
export type CarteType = 'resiliation' | 'facture' | 'garantie' | 'rappel'

export interface Carte {
  type: CarteType
  titre: string
  sousTitre: string
  urgence: Urgence
  joursRestants: number   // négatif = en retard
  lien: string
}

// Entrées (structurelles). Dates : 'AAAA-MM-JJ' ou ISO (on ne garde que le jour).
export interface AFaireCommitment {
  name: string
  provider?: string | null
  cancellation_deadline?: string | null
  cancellation_notice_days?: number | null
  anniversary_date?: string | null
  status?: string | null
}
export interface AFaireFacture {
  name: string
  amount?: number | null
  next_due_date?: string | null
  status?: string | null
}
export interface AFaireReminder {
  kind?: string
  message?: string | null
  scheduled_for?: string | null
  status?: string | null
}
export interface AFaireGarantie {
  name: string
  end?: string | null     // fin de garantie déjà calculée (warrantyEnd)
}
export interface AFaireData {
  commitments?: AFaireCommitment[]
  factures?: AFaireFacture[]
  reminders?: AFaireReminder[]
  garanties?: AFaireGarantie[]
}

const DAY = 86_400_000
const HORIZON = 30
const MAX_CARTES = 5
// Poids décroissant : résiliation > échéance à payer > fin de garantie > rappel.
const POIDS: Record<CarteType, number> = { resiliation: 4, facture: 3, garantie: 2, rappel: 1 }

const jour = (iso: string | null | undefined) => String(iso ?? '').slice(0, 10)
const estDate = (s: string | null | undefined) => /^\d{4}-\d{2}-\d{2}$/.test(jour(s))
const auMidiUTC = (d: string) => Date.parse(`${jour(d)}T00:00:00Z`)

function joursEntre(cible: string, aujourdhui: string): number {
  return Math.round((auMidiUTC(cible) - auMidiUTC(aujourdhui)) / DAY)
}
function ajouterJours(iso: string, n: number): string {
  const d = new Date(auMidiUTC(iso))
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}
function urgenceDe(j: number): Urgence {
  if (j < 0) return 'retard'
  if (j <= 7) return 'critique'
  if (j <= HORIZON) return 'bientot'
  return 'ok'
}
const KIND_LABEL: Record<string, string> = {
  cancellation_window: 'Fenêtre de résiliation', renewal: 'Renouvellement',
  payment_due: 'Paiement à venir', negotiation: 'Négociation', custom: 'Rappel',
}

// Score = criticité × proximité. Le retard flotte au-dessus de tout ; à jour
// égal, le poids du type départage.
function score(c: Carte): number {
  const prox = c.joursRestants < 0 ? 1000 - c.joursRestants : 100 - c.joursRestants
  return prox * 10 + POIDS[c.type]
}

/**
 * Construit la liste « À faire » (max 5 cartes) à partir des échéances des
 * services. Horizon : 30 jours à venir + tout ce qui est en retard (en tête).
 */
export function construireAFaire(donnees: AFaireData | null | undefined, aujourdhui: string): Carte[] {
  if (!estDate(aujourdhui)) return []
  const d = donnees ?? {}
  const cartes: Carte[] = []
  const ajouter = (type: CarteType, titre: string, sousTitre: string, joursRestants: number, lien: string) => {
    if (joursRestants > HORIZON) return // au-delà de l'horizon : exclu
    cartes.push({ type, titre, sousTitre, urgence: urgenceDe(joursRestants), joursRestants, lien })
  }

  // Fenêtre de résiliation (commitments)
  for (const c of d.commitments ?? []) {
    if (c.status && c.status !== 'active') continue
    const deadline = estDate(c.cancellation_deadline)
      ? jour(c.cancellation_deadline)
      : estDate(c.anniversary_date)
        ? ajouterJours(jour(c.anniversary_date), -(c.cancellation_notice_days ?? 0))
        : null
    if (!deadline) continue
    ajouter('resiliation', `Résilier ${c.name}`,
      `Fenêtre de résiliation${c.provider ? ` · ${c.provider}` : ''}`,
      joursEntre(deadline, aujourdhui), `/resiliation?service=${encodeURIComponent(c.name)}`)
  }

  // Échéance / facture à venir (factures_ponctuelles)
  const FACTURE_TERMINEE = new Set(['paid', 'payee', 'regle', 'done', 'annulee', 'cancelled'])
  for (const f of d.factures ?? []) {
    if (f.status && FACTURE_TERMINEE.has(f.status)) continue
    if (!estDate(f.next_due_date)) continue
    ajouter('facture', `Payer ${f.name}`,
      f.amount != null ? `${f.amount.toLocaleString('fr-FR')} € à régler` : 'Échéance à venir',
      joursEntre(jour(f.next_due_date), aujourdhui), '/rappels')
  }

  // Rappels (reminders) — uniquement ceux en attente
  for (const r of d.reminders ?? []) {
    if (r.status && r.status !== 'pending') continue
    if (!estDate(r.scheduled_for)) continue
    ajouter('rappel', r.message?.trim() || KIND_LABEL[r.kind ?? 'custom'] || 'Rappel',
      'Rappel', joursEntre(jour(r.scheduled_for), aujourdhui), '/rappels')
  }

  // Fin de garantie (équipement — localStorage, PAS de table). Uniquement à venir.
  for (const g of d.garanties ?? []) {
    if (!estDate(g.end)) continue
    const j = joursEntre(jour(g.end), aujourdhui)
    if (j < 0) continue // garantie déjà terminée : plus rien à faire
    ajouter('garantie', `Garantie ${g.name}`, 'Fin de garantie proche', j, '/garanties')
  }

  return cartes.sort((a, b) => score(b) - score(a)).slice(0, MAX_CARTES)
}
