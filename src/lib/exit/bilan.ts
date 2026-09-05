/**
 * SEREIN — Bilan de sortie : une seule réponse à « je pars, et alors ? »
 *
 * Deux moteurs existent et ne se recouvrent pas. Ce module les compose au lieu
 * de les dupliquer, pour qu'il n'y ait jamais deux vérités juridiques dans
 * l'application :
 *
 *   computeResiliation()  → QUAND la porte s'ouvre + le courrier prêt à envoyer
 *   coutDeSortie()        → COMBIEN il en coûte de partir maintenant
 *
 * Règle : le calendrier et le courrier appartiennent à `resiliation/logic`,
 * l'argent appartient à `exit/cost`. Aucun des deux ne réimplémente l'autre.
 */
import { computeResiliation, type ResiliationInput, type ResiliationResult } from '@/lib/resiliation/logic'
import { coutDeSortie, type ExitInput, type ExitCost } from '@/lib/exit/cost'

export interface BilanSortie {
  /** Calendrier et courrier. */
  calendrier: ResiliationResult
  /** Argent. */
  cout: ExitCost
  /** La phrase à afficher en tête de carte, une seule. */
  phrase: string
  /** Vrai si partir maintenant coûte de l'argent. */
  coûteux: boolean
}

export function bilanDeSortie(
  resiliation: ResiliationInput,
  exit: ExitInput,
  today: string,
): BilanSortie {
  const calendrier = computeResiliation({ ...resiliation, today })
  const cout = coutDeSortie(exit, today)
  const coûteux = cout.verdict === 'penalite' && (cout.montant_du ?? 0) > 0

  // Une seule phrase : l'argent prime quand il y en a, sinon le calendrier.
  let phrase: string
  if (coûteux) {
    phrase = `Partir maintenant coûte environ ${cout.montant_du} €.`
  } else if (calendrier.status === 'depassee') {
    phrase = 'La fenêtre de cette année est passée. Rendez-vous à la prochaine échéance.'
  } else if (calendrier.status === 'critique' && calendrier.daysUntilDeadline !== null) {
    phrase = `Il reste ${calendrier.daysUntilDeadline} jours pour agir. C'est maintenant.`
  } else if (cout.verdict === 'libre' || cout.verdict === 'libre_avec_preavis') {
    phrase = 'Vous pouvez partir sans rien payer.'
  } else if (calendrier.status === 'inconnue' || cout.verdict === 'inconnu') {
    phrase = 'Il manque des informations pour vous répondre avec certitude.'
  } else {
    phrase = cout.resume
  }

  return { calendrier, cout, phrase, coûteux }
}
