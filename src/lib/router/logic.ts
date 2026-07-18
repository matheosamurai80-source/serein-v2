// ─── ROUTEUR UNIVERSEL (clé de voûte du bouton « + ») ───────────────────────
// L'utilisateur ne choisit jamais un service : il transfère un document, et le
// routeur décide où il va. Fonction PURE (le texte vient de l'OCR en amont),
// testable en bac à sable AVANT toute UI. Un nouveau service = une règle en
// plus ici, zéro écran en plus (cf. SEREIN-PLAN-FUSION.md).

export type DocType = 'courses' | 'abonnement' | 'demarche' | 'inconnu'
export type RoutableType = Exclude<DocType, 'inconnu'>

// Le routeur classe ; c'est le service ciblé qui exploite le contenu.
export const ROUTE_TO_SERVICE: Record<RoutableType, 'paniermalin' | 'serein' | 'apres'> = {
  courses: 'paniermalin',
  abonnement: 'serein',
  demarche: 'apres',
}

const deburr = (s: string): string =>
  String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

// Signaux pondérés par classe (motifs SANS accent : le texte est « deburré »).
const SIGNALS: Record<RoutableType, [RegExp, number][]> = {
  courses: [
    [/ticket de caisse/, 3],
    [/\bticket\b/, 1.5],
    [/\bcaisse\b/, 1.5],
    [/carte de fidelite|\bfidelite\b/, 1.5],
    [/>>/, 2], // en-tête de rayon (« >> EPICERIE »)
    [/\b(carrefour|leclerc|lidl|intermarche|auchan|super\s?u|magasins?\s?u|monoprix|aldi|casino|franprix|cora|geant)\b/, 2],
    [/\/kg\b|prix au kg|\/l\b/, 1.5],
    [/\barticles?\b[^\n]*\d/, 1],
    [/rendu monnaie|especes|\bcb\s?emv\b/, 1.5],
  ],
  abonnement: [
    [/\bfacture\b/, 2.5],
    [/\bprelevement\b/, 2.5],
    [/\bech[ea]ance\b/, 1.2],
    [/\babonnement\b/, 2.5],
    [/mensualite|\bmensuel\b/, 1.5],
    [/montant (a payer|du|total|de la facture)/, 1.5],
    [/\biban\b/, 1.2],
    [/reference client|numero client|n[o°]\s?client/, 1.5],
    [/\bcontrat\b/, 0.8],
    [/\b(netflix|spotify|canal\+?|disney\+?|deezer|prime video|amazon prime)\b/, 2],
    [/\b(edf|engie|total\s?energies?|orange|sfr|free|bouygues|sosh|red by sfr)\b/, 2],
    [/date limite de paiement|a (regler|payer) avant/, 1.5],
    [/\bttc\b/, 0.3],
  ],
  demarche: [
    [/resiliation|resilier/, 2.5],
    [/\bpreavis\b/, 2.5],
    [/revalorisation|augmentation (tarifaire|de (votre )?cotisation)|hausse (de|des) (tarif|prix|cotisation)/, 2.5],
    [/\bdeces\b|succession|\bdefunt\b|ayants? droit/, 3],
    [/demenagement|changement d.?adresse/, 2.5],
    [/lettre recommandee|accuse de reception|recommande avec/, 1.5],
    [/madame,? monsieur/, 1],
    [/veuillez agreer/, 1.5],
    [/nous vous informons|prend effet le|a compter du/, 0.8],
    // Documents officiels (administration) → traités comme des démarches.
    [/\bamende\b|contravention|\bantai\b|forfaitaire majoree?|exces de vitesse|infraction/, 3],
    [/avis d.?imp[o]t|taxe fonciere|taxe d.?habitation|\bdgfip\b|impots\.gouv|prelevement a la source/, 3],
    [/\bcaf\b|\burssaf\b|\bameli\b|assurance maladie|france travail|pole emploi/, 2.5],
    [/\bprefecture\b|service-public|amendes\.gouv|certificat d.?immatriculation|\bants\b/, 1.5],
  ],
}

// Bonus structurel « courses » : un ticket aligne plusieurs lignes « … 3,57 ».
function priceLineBoost(texte: string): number {
  const lines = String(texte ?? '').split('\n')
  let n = 0
  for (const l of lines) if (/\d{1,3}[.,]\d{2}\s*(?:€|eur)?\s*\d{0,2}\s*$/i.test(l.trim())) n++
  return Math.min(n * 0.4, 3) // plafonné : un courrier peut citer 1-2 montants
}

/** Score de chaque classe routable (debug + réglage). Jamais négatif. */
export function scoreDocument(texte: string): Record<RoutableType, number> {
  const t = deburr(texte)
  const scores = { courses: 0, abonnement: 0, demarche: 0 } as Record<RoutableType, number>
  for (const cls of Object.keys(SIGNALS) as RoutableType[]) {
    for (const [re, w] of SIGNALS[cls]) if (re.test(t)) scores[cls] += w
  }
  scores.courses += priceLineBoost(texte)
  return scores
}

// ─── ORIENTATION : où atterrit le document, et comment le présenter ─────────
export interface Destination {
  type: DocType
  service: string   // libellé du service ('' si inconnu)
  emoji: string
  href: string      // page cible ('' si inconnu → l'utilisateur choisit)
  headline: string  // ce qu'on a reconnu, en clair
  cta: string       // libellé du bouton d'action
}

const DESTINATIONS: Record<DocType, Destination> = {
  courses: {
    type: 'courses', service: 'Courses', emoji: '🧺', href: '/paniermalin',
    headline: 'On dirait un ticket de caisse.', cta: 'Ajouter à mes courses',
  },
  abonnement: {
    type: 'abonnement', service: 'Abonnements', emoji: '💳', href: '/analyse',
    headline: 'On dirait une facture ou un prélèvement.', cta: 'Détecter l’abonnement',
  },
  demarche: {
    type: 'demarche', service: 'Démarches', emoji: '📮', href: '/resiliation',
    headline: 'On dirait un courrier à traiter (résiliation, hausse, décès…).', cta: 'Préparer la démarche',
  },
  inconnu: {
    type: 'inconnu', service: '', emoji: '🤔', href: '',
    headline: 'Je ne suis pas sûr de ce document.', cta: '',
  },
}

/** Type → destination (service, page cible, libellés). Pure, pour l'UI du « + ». */
export function describeDestination(type: DocType): Destination {
  return DESTINATIONS[type] ?? DESTINATIONS.inconnu
}

const THRESHOLD = 2 // en dessous : trop faible → inconnu
const MARGIN = 0.5 // écart mini avec le 2e : sinon trop ambigu → inconnu

/**
 * Route un document (texte OCR) vers son type.
 * `courses` | `abonnement` | `demarche`, ou `inconnu` si trop faible/ambigu
 * (mieux vaut demander à l'utilisateur que router au mauvais endroit).
 */
export function routerDocument(texte: string): DocType {
  const scores = scoreDocument(texte)
  const ranked = (Object.entries(scores) as [RoutableType, number][])
    .sort((a, b) => b[1] - a[1])
  const [topType, topScore] = ranked[0]
  const secondScore = ranked[1]?.[1] ?? 0
  if (topScore < THRESHOLD) return 'inconnu'
  if (topScore - secondScore < MARGIN) return 'inconnu'
  return topType
}
