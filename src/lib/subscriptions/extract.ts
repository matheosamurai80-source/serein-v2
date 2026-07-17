// ─── EXTRACTION D'UN ABONNEMENT DEPUIS UN DOCUMENT (le « + » → subscriptions) ─
// Le routeur a reconnu un « abonnement » (facture / prélèvement). Ici on tire du
// texte un brouillon prêt à créer dans la table `subscriptions` : nom du service,
// montant du prélèvement, fréquence. Fonction PURE (le texte vient de l'OCR),
// testable en bac à sable. L'utilisateur confirme/corrige avant l'enregistrement.

export type SubscriptionFrequency = 'weekly' | 'monthly' | 'quarterly' | 'yearly'

export interface SubscriptionDraft {
  name: string
  amount: number
  frequency: SubscriptionFrequency
}

const deburr = (s: string): string =>
  String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

// Fournisseurs connus → nom canonique propre (sur texte déburré).
const PROVIDERS: [RegExp, string][] = [
  [/netflix/, 'Netflix'], [/spotify/, 'Spotify'], [/disney/, 'Disney+'],
  [/canal ?\+?/, 'Canal+'], [/deezer/, 'Deezer'], [/amazon prime|prime video/, 'Amazon Prime'],
  [/youtube/, 'YouTube Premium'], [/\bapple\b/, 'Apple'], [/microsoft|office 365/, 'Microsoft'],
  [/\bedf\b/, 'EDF'], [/engie/, 'Engie'], [/total ?energ/, 'TotalEnergies'],
  [/\borange\b/, 'Orange'], [/\bsfr\b/, 'SFR'], [/\bfree\b/, 'Free'], [/bouygues/, 'Bouygues'],
  [/\bsosh\b/, 'Sosh'], [/red by sfr/, 'RED by SFR'],
  [/\baxa\b/, 'AXA'], [/\bmaif\b/, 'MAIF'], [/\bmacif\b/, 'MACIF'], [/matmut/, 'Matmut'],
  [/basic ?fit|basicfit/, 'Basic-Fit'], [/fitness park|fitpark/, 'Fitness Park'],
]

const EXCLUDE_NAME = /facture|ticket|releve|montant|prelevement|echeance|date|http|www|iban|reference|numero|client|total|abonnement|contrat|madame|monsieur/

/** Montant du prélèvement : on privilégie une ligne « montant / à payer / total / TTC ». */
function extractAmount(raw: string): number | null {
  const lines = String(raw ?? '').split('\n')
  const PRIO = /(montant|a payer|à payer|total|ttc|mensualit|prelevement|prélèvement|a regler|à régler)/i
  const prio: number[] = []
  const all: number[] = []
  for (const line of lines) {
    for (const m of line.matchAll(/(\d{1,4})[.,](\d{2})(?!\d)/g)) {
      const val = parseFloat(`${m[1]}.${m[2]}`)
      if (!(val >= 0.5 && val <= 100_000)) continue
      all.push(val)
      if (PRIO.test(line)) prio.push(val)
    }
  }
  const pool = prio.length ? prio : all
  if (!pool.length) return null
  return Math.max(...pool) // le total/à-payer est le plus élevé de la ligne pertinente
}

/** Nom du service : fournisseur connu, sinon 1re ligne « nom » plausible. */
function extractName(raw: string): string {
  const t = deburr(raw)
  for (const [re, canon] of PROVIDERS) if (re.test(t)) return canon
  for (const line of String(raw ?? '').split('\n')) {
    const l = line.trim().replace(/\s+/g, ' ')
    if (l.length < 2 || l.length > 40) continue
    if (EXCLUDE_NAME.test(deburr(l))) continue
    if ((l.match(/[a-zA-ZÀ-ÿ]/g) ?? []).length < 3) continue
    return l.slice(0, 60)
  }
  return 'Abonnement'
}

/** Fréquence du prélèvement (défaut mensuel, le cas le plus courant). */
function extractFrequency(raw: string): SubscriptionFrequency {
  const t = deburr(raw)
  if (/annuel|annuelle|par an\b|\/an\b|\bpar annee\b|facture annuelle/.test(t)) return 'yearly'
  if (/trimestr/.test(t)) return 'quarterly'
  if (/hebdo|par semaine|\/sem\b/.test(t)) return 'weekly'
  return 'monthly'
}

/**
 * Texte d'un document → brouillon d'abonnement, ou `null` si aucun montant
 * exploitable (mieux vaut ne rien pré-remplir que d'inventer un prix).
 */
export function extractSubscriptionDraft(text: string): SubscriptionDraft | null {
  const amount = extractAmount(text)
  if (amount == null) return null
  return { name: extractName(text), amount, frequency: extractFrequency(text) }
}

/**
 * Vrai si le document ressemble à un RELEVÉ BANCAIRE (plein de prélèvements),
 * pas à une facture unique. Dans ce cas le « + » ne crée pas UN abonnement : il
 * envoie le tout à l'analyse (détection multiple). Heuristique tolérante :
 *  - plusieurs lignes « date + montant » (opérations), OU
 *  - plusieurs marqueurs bancaires (PRLV, SEPA, VIR, CB, relevé de compte, solde).
 */
export function looksLikeStatement(text: string): boolean {
  const raw = String(text ?? '')
  const t = deburr(raw)
  const markers = (t.match(/\bprlv\b|\bsepa\b|\bvir\b|virement|\bcb\b|releve de compte|solde (crediteur|debiteur|precedent)/g) ?? []).length
  let txLines = 0
  for (const line of raw.split('\n')) {
    if (/\d{1,2}\/\d{1,2}(\/\d{2,4})?/.test(line) && /\d+[.,]\d{2}/.test(line)) txLines++
  }
  const amounts = (raw.match(/\d+[.,]\d{2}(?!\d)/g) ?? []).length
  return txLines >= 4 || markers >= 3 || (amounts >= 8 && markers >= 1)
}
