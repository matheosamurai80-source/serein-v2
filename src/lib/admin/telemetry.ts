/**
 * SEREIN — Journal d'usage.
 *
 * On enregistre QUE quelqu'un a utilisé une fonction. Jamais ce qu'il y a mis.
 *
 * Le nom de la fonction est choisi dans une liste blanche fermée : si un
 * appelant invente un nom (ou y glisse une donnée), rien n'est écrit. C'est le
 * même principe fail-safe que le coffre, inversé : au coffre, l'inconnu est
 * chiffré par défaut ; ici, l'inconnu n'est pas journalisé du tout.
 *
 * Le journal est purgé au-delà de 90 jours côté base.
 */

/** Liste fermée. Ajouter une entrée est un acte délibéré. */
export const ACTIONS = [
  'engagement_ajoute',
  'engagement_modifie',
  'engagement_supprime',
  'abonnement_detecte',
  'releve_analyse',
  'lettre_generee',
  'lettre_telechargee',
  'cout_sortie_consulte',
  'rappel_cree',
  'facture_ajoutee',
  'garantie_ajoutee',
  'panier_partage',
  'cle_secours_notee',
  'coffre_cree',
  'export_donnees',
  'compte_supprime',
] as const

export type Action = typeof ACTIONS[number]

const SET = new Set<string>(ACTIONS)

/** Vrai seulement pour un nom de la liste blanche. */
export function estActionConnue(action: string): action is Action {
  return SET.has(action)
}

/**
 * Métadonnées autorisées : uniquement des valeurs non identifiantes.
 * Un montant, un nom de fournisseur ou une note n'ont rien à faire ici —
 * ils sont dans le coffre, et doivent y rester.
 */
const META_AUTORISEES = new Set(['service_type', 'source', 'resultat'])

/** Longueur au-delà de laquelle une valeur devient suspecte (donnée déguisée). */
const META_MAX = 32

export function nettoyerMeta(meta: Record<string, unknown> | undefined): Record<string, string> | null {
  if (!meta) return null
  const propre: Record<string, string> = {}
  for (const [k, v] of Object.entries(meta)) {
    if (!META_AUTORISEES.has(k)) continue
    if (typeof v !== 'string' && typeof v !== 'number') continue
    const s = String(v)
    if (s.length === 0 || s.length > META_MAX) continue
    propre[k] = s
  }
  return Object.keys(propre).length > 0 ? propre : null
}

export interface EvenementJournal {
  action: Action
  metadata: Record<string, string> | null
}

/**
 * Prépare l'événement, ou renvoie null s'il ne doit pas être écrit.
 * Fonction pure : c'est elle qu'on teste, pas l'appel réseau.
 */
export function preparerEvenement(
  action: string,
  meta?: Record<string, unknown>,
): EvenementJournal | null {
  if (!estActionConnue(action)) return null
  return { action, metadata: nettoyerMeta(meta) }
}
