// ─── DOCUMENTS OFFICIELS (prolonge Démarches) ───────────────────────────────
// Tu reçois un courrier de l'administration (amende, avis d'impôt, CAF…) : Serein
// reconnaît le type et te donne le LIEN OFFICIEL vers la solution (payer,
// contester, consulter). Informer + armer, jamais agir. Liens .gouv/officiels
// uniquement, zéro partenariat. Logique pure, testable en bac à sable.

export interface OfficialDoc {
  type: string
  label: string
  emoji: string
  url: string         // lien OFFICIEL principal
  action: string      // action principale
  url2?: string       // 2e lien officiel (ex. contester vs payer)
  action2?: string
  note: string        // repère utile (délai, espace en ligne…)
}

const deburr = (s: string) =>
  String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

// Ordre : motifs spécifiques AVANT les génériques. Clés courtes en \b (leçon
// SFR/MMA : jamais au milieu d'un mot).
const CATALOG: { match: RegExp; doc: OfficialDoc }[] = [
  {
    match: /\bamende|contravention|avis de contravention|\bantai\b|forfaitaire majoree?|exces de vitesse|stationnement (impaye|non paye)|radar/,
    doc: { type: 'amende', label: 'Amende / contravention', emoji: '🚓',
      url: 'https://www.amendes.gouv.fr', action: 'Payer l’amende',
      url2: 'https://www.antai.gouv.fr', action2: 'Contester',
      note: 'Montant souvent minoré si vous payez vite (ex. 90 € sous 15 j). Paiement sur amendes.gouv.fr ; toute contestation sur antai.gouv.fr.' },
  },
  {
    match: /taxe fonciere/,
    doc: { type: 'taxe_fonciere', label: 'Taxe foncière', emoji: '🏠', url: 'https://www.impots.gouv.fr',
      action: 'Payer / consulter dans votre espace', note: 'Paiement en ligne ou mensualisation depuis votre espace impots.gouv.fr.' },
  },
  {
    match: /taxe d.?habitation/,
    doc: { type: 'taxe_habitation', label: 'Taxe d’habitation', emoji: '🏠', url: 'https://www.impots.gouv.fr',
      action: 'Payer / consulter dans votre espace', note: 'Depuis votre espace impots.gouv.fr.' },
  },
  {
    match: /avis d.?imp[o]t|impot sur le revenu|declaration de revenus|\bdgfip\b|tresor public|prelevement a la source|centre des finances publiques/,
    doc: { type: 'impot', label: 'Impôt', emoji: '🏛️', url: 'https://www.impots.gouv.fr',
      action: 'Payer, échéancier ou réclamation', note: 'Tout se fait dans votre espace personnel impots.gouv.fr.' },
  },
  {
    match: /\bcaf\b|allocations familiales|\bapl\b|prime d.?activite|\brsa\b/,
    doc: { type: 'caf', label: 'CAF / allocations', emoji: '👨‍👩‍👧', url: 'https://www.caf.fr',
      action: 'Consulter / répondre en ligne', note: 'Déclarations et messages dans votre espace caf.fr.' },
  },
  {
    match: /assurance maladie|\bcpam\b|\bameli\b|feuille de soins|remboursement de soins/,
    doc: { type: 'ameli', label: 'Assurance Maladie', emoji: '🩺', url: 'https://www.ameli.fr',
      action: 'Consulter vos remboursements', note: 'Suivi et démarches dans votre compte ameli.fr.' },
  },
  {
    match: /\burssaf\b|cotisations sociales/,
    doc: { type: 'urssaf', label: 'URSSAF', emoji: '🧾', url: 'https://www.urssaf.fr',
      action: 'Déclarer / payer vos cotisations', note: 'Depuis votre compte urssaf.fr.' },
  },
  {
    match: /france travail|pole emploi|actualisation mensuelle/,
    doc: { type: 'france_travail', label: 'France Travail', emoji: '💼', url: 'https://www.francetravail.fr',
      action: 'Actualisation / démarches', note: 'Actualisez-vous et échangez depuis votre espace.' },
  },
  {
    match: /carte grise|certificat d.?immatriculation|\bants\b/,
    doc: { type: 'carte_grise', label: 'Carte grise (ANTS)', emoji: '🚗', url: 'https://immatriculation.ants.gouv.fr',
      action: 'Faire la démarche en ligne', note: 'Les démarches carte grise se font uniquement sur le site officiel ANTS.' },
  },
]

// Repli : un document officiel non catalogué → le portail service-public.
const FALLBACK: OfficialDoc = {
  type: 'autre', label: 'Document administratif', emoji: '📋', url: 'https://www.service-public.fr',
  action: 'Trouver la démarche officielle', note: 'Le portail officiel service-public.fr recense la marche à suivre.',
}

/**
 * Reconnaît un document officiel et renvoie le lien OFFICIEL vers la solution,
 * ou `null` si rien d'administratif n'est repéré. Passe `withFallback` à true
 * pour renvoyer le portail service-public plutôt que null.
 */
export function detectOfficialDoc(text: string, { withFallback = false } = {}): OfficialDoc | null {
  const t = deburr(text)
  for (const { match, doc } of CATALOG) if (match.test(t)) return doc
  // Indice « c'est administratif » sans type précis
  if (withFallback && /\b(prefecture|administration|service public|recommande|reference dossier|n[o°] de dossier)\b/.test(t)) return FALLBACK
  return null
}
