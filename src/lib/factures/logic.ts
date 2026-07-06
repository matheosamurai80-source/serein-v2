import { buildReminderForCommitment, type ReminderDraft } from '@/lib/reminders/logic'
import { urgencyOf, type Urgency } from '@/lib/commitments/logic'

// ─── FACTURES PONCTUELLES (1-2×/an : eau, taxe foncière, assurance annuelle) ─
// Deux modes de rappel, au choix PAR facture :
//   MODE A « interval » : intervalle en mois + date de départ → la prochaine
//     échéance est CALCULÉE et se redéclenche automatiquement après passage.
//   MODE B « manual »   : l'utilisateur saisit chaque date lui-même → la date
//     reste FIGÉE tant qu'il ne la modifie pas (même passée).

export type FactureMode = 'interval' | 'manual'

export interface FactureLike {
  name: string
  amount: number | null
  mode: FactureMode
  /** Mode A : date de départ (ISO) */
  start_date: string | null
  /** Mode A : intervalle en mois (ex. 6 = deux fois par an) */
  interval_months: number | null
  /** Échéance courante (ISO) — calculée en A, saisie en B */
  next_due_date: string | null
  /** Jours de préavis avant le rappel */
  notice_days: number | null
}

function dateOnly(iso: string): Date {
  const d = new Date(iso)
  d.setHours(0, 0, 0, 0)
  return d
}

/** Ajoute des mois en bornant au dernier jour du mois (31 janv + 1 mois = 28/29 févr). */
export function addMonthsClamped(iso: string, months: number): string {
  const d = dateOnly(iso)
  const day = d.getDate()
  const target = new Date(d.getFullYear(), d.getMonth() + months, 1)
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate()
  target.setDate(Math.min(day, lastDay))
  // Format local (pas toISOString : décalerait d'un jour à l'est de UTC)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${target.getFullYear()}-${pad(target.getMonth() + 1)}-${pad(target.getDate())}`
}

/**
 * Prochaine échéance d'une facture.
 * Mode A : plus petite date « départ + k × intervalle » ≥ aujourd'hui.
 * Mode B : la date saisie, telle quelle (jamais recalculée).
 */
export function nextDueDate(f: FactureLike, todayISO?: string): string | null {
  if (f.mode === 'manual') return f.next_due_date

  if (!f.interval_months || f.interval_months < 1) return null
  // L'ancre est l'échéance stockée si elle existe (ex. « Payée ✓ » l'a déjà
  // avancée) — sinon la date de départ. On n'avance que si elle est passée.
  const anchor = f.next_due_date ?? f.start_date
  if (!anchor) return null
  const today = dateOnly(todayISO ?? new Date().toISOString()).getTime()
  let due = anchor
  // Sécurité : jamais plus de 400 itérations (33 ans d'échéances mensuelles)
  for (let k = 0; k < 400 && dateOnly(due).getTime() < today; k++) {
    due = addMonthsClamped(due, f.interval_months)
  }
  return due
}

/** En mode A, l'échéance stockée se remet à jour après passage ; en B, jamais. */
export function refreshedDueDate(f: FactureLike, todayISO?: string): string | null {
  return f.mode === 'interval' ? nextDueDate(f, todayISO) : f.next_due_date
}

/** Une facture vue comme un engagement, pour RÉUTILISER urgence + rappels. */
function asCommitmentLike(f: FactureLike, todayISO?: string) {
  return {
    name: f.name,
    service_type: 'other' as const,
    amount: f.amount,
    frequency: 'one_time' as const,
    anniversary_date: null,
    cancellation_deadline: refreshedDueDate(f, todayISO),
    cancellation_notice_days: null,
  }
}

/** Urgence de la facture (même échelle que les abonnements). */
export function factureUrgency(f: FactureLike, todayISO?: string): Urgency | null {
  return urgencyOf(asCommitmentLike(f, todayISO), todayISO)
}

/**
 * Brouillon de rappel — MÊME mécanisme que les abonnements
 * (buildReminderForCommitment), avec le préavis choisi par l'utilisateur.
 */
export function factureReminderDraft(f: FactureLike, todayISO?: string): ReminderDraft | null {
  const draft = buildReminderForCommitment(asCommitmentLike(f, todayISO), {
    daysBefore: f.notice_days ?? 14,
    ...(todayISO ? { todayISO } : {}),
  })
  if (!draft) return null
  return { ...draft, message: `${f.name} — facture à régler vers le ${frDate(refreshedDueDate(f, todayISO)!)}. Préparez le paiement.` }
}

function frDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

/** Validation du formulaire (avant tout enregistrement). */
export function validateFacture(f: Partial<FactureLike>): string | null {
  if (!f.name?.trim()) return 'Donnez un nom à la facture.'
  if (f.mode === 'interval') {
    if (!f.start_date) return 'Mode « fréquence » : indiquez la date de départ.'
    if (!f.interval_months || f.interval_months < 1 || f.interval_months > 60)
      return 'Mode « fréquence » : intervalle entre 1 et 60 mois.'
  } else if (f.mode === 'manual') {
    if (!f.next_due_date) return 'Mode « dates fixes » : indiquez la prochaine échéance.'
  } else {
    return 'Choisissez un mode de rappel.'
  }
  if (f.notice_days != null && (f.notice_days < 0 || f.notice_days > 365))
    return 'Préavis entre 0 et 365 jours.'
  return null
}
