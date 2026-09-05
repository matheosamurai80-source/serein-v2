import { generateCancellationLetter, type LetterInput, type GeneratedLetter } from '@/lib/letters/generator'
import type { RegimeResult } from '@/lib/letters/legal'
import { effectiveDeadline } from '@/lib/commitments/logic'

// ─── MOTEUR RÉSILIATION — composition régime + date butoir + courrier ────────
// Une seule fonction PURE qui branche ensemble les trois briques existantes :
//   1. le régime légal applicable        (detectLegalRegime, via le générateur)
//   2. la DATE BUTOIR pour agir           (effectiveDeadline : échéance − préavis)
//   3. le COURRIER prêt à envoyer         (generateCancellationLetter)
// Serein arme le client : il calcule et rédige, il n'envoie jamais à sa place.
// `today` est injectable → la logique reste déterministe et testable en sandbox.

export interface ResiliationInput extends LetterInput {
  /** Date d'échéance / de renouvellement du contrat (ISO AAAA-MM-JJ), si connue */
  echeanceDate?: string
  /** Préavis contractuel en jours si le contrat en impose un (sinon : préavis légal du régime) */
  contractNoticeDays?: number
  /** Date de référence du calcul (défaut : aujourd'hui). Injectable pour les tests. */
  today?: string
}

export type DeadlineStatus =
  /** Régime « résiliable à tout moment » : aucune fenêtre à rater. */
  | 'a_tout_moment'
  /** La date butoir est passée. */
  | 'depassee'
  /** Il reste 7 jours ou moins. */
  | 'critique'
  /** Il reste 30 jours ou moins. */
  | 'bientot'
  /** Il reste plus de 30 jours. */
  | 'ok'
  /** Échéance non fournie : impossible de calculer la date butoir. */
  | 'inconnue'

export interface ResiliationResult {
  regime: RegimeResult
  /** Date butoir pour agir (ISO), ou null quand il n'y a pas de fenêtre à rater. */
  deadline: string | null
  /** Jours restants avant la date butoir (négatif = dépassée), null si non calculable. */
  daysUntilDeadline: number | null
  status: DeadlineStatus
  /** Le courrier prêt à envoyer en recommandé. */
  letter: GeneratedLetter
}

const DAY = 86_400_000

/** Jours calendaires de `fromISO` à `toISO` (arrondi au jour supérieur). */
function daysBetween(fromISO: string, toISO: string): number {
  return Math.ceil((new Date(toISO).getTime() - new Date(fromISO).getTime()) / DAY)
}

/**
 * Compose le moteur existant en un seul résultat : régime détecté, date butoir
 * calculée et courrier rédigé. Aucune I/O, aucune date « magique » (today injecté).
 */
export function computeResiliation(input: ResiliationInput): ResiliationResult {
  const letter = generateCancellationLetter(input)
  const regime = letter.regime
  const todayISO = input.today ?? new Date().toISOString().slice(0, 10)

  // Régime « résiliable à tout moment » (télécom, énergie, Hamon, Chatel non avisé) :
  // il n'y a pas de date butoir à rater. Le courrier précise déjà la date d'effet.
  if (regime.cancellableNow) {
    return { regime, deadline: null, daysUntilDeadline: null, status: 'a_tout_moment', letter }
  }

  // Sinon il faut agir AVANT l'échéance : date butoir = échéance − préavis.
  // Préavis retenu : celui du contrat s'il est fourni, sinon le préavis légal du régime.
  const noticeDays = input.contractNoticeDays ?? regime.maxNoticeDays
  if (!input.echeanceDate || noticeDays == null) {
    return { regime, deadline: null, daysUntilDeadline: null, status: 'inconnue', letter }
  }

  const deadline = effectiveDeadline({
    name: input.serviceName,
    service_type: 'other',
    amount: null,
    frequency: 'yearly',
    anniversary_date: input.echeanceDate,
    cancellation_notice_days: noticeDays,
  })
  if (!deadline) {
    return { regime, deadline: null, daysUntilDeadline: null, status: 'inconnue', letter }
  }

  const days = daysBetween(todayISO, deadline)
  const status: DeadlineStatus =
    days < 0 ? 'depassee' : days <= 7 ? 'critique' : days <= 30 ? 'bientot' : 'ok'
  return { regime, deadline, daysUntilDeadline: days, status, letter }
}
