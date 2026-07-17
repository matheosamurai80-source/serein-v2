import type { Transaction, TransactionCategory } from '@/types'
import { logger } from '@/lib/logger'

// ─── MERCHANT MAP ──────────────────────────────────────────────────────────
// L'ordre compte : les clés spécifiques AVANT les génériques
// (« orange bleue » avant « orange », « apple tv » avant « apple »).
const MERCHANT_MAP: Record<string, { name: string; category: TransactionCategory }> = {
  // Streaming / divertissement
  netflix:          { name: 'Netflix',              category: 'streaming' },
  spotify:          { name: 'Spotify',              category: 'streaming' },
  disney:           { name: 'Disney+',              category: 'streaming' },
  'amazon prime':   { name: 'Amazon Prime',         category: 'streaming' },
  'prime video':    { name: 'Amazon Prime',         category: 'streaming' },
  'canal+':         { name: 'Canal+',               category: 'streaming' },
  canalplus:        { name: 'Canal+',               category: 'streaming' },
  deezer:           { name: 'Deezer',               category: 'streaming' },
  youtube:          { name: 'YouTube Premium',      category: 'streaming' },
  dazn:             { name: 'DAZN',                 category: 'streaming' },
  paramount:        { name: 'Paramount+',           category: 'streaming' },
  crunchyroll:      { name: 'Crunchyroll',          category: 'streaming' },
  audible:          { name: 'Audible',              category: 'streaming' },
  'apple tv':       { name: 'Apple TV+',            category: 'streaming' },
  'apple music':    { name: 'Apple Music',          category: 'streaming' },
  // Logiciels / apps
  icloud:           { name: 'iCloud+',              category: 'saas' },
  'apple.com':      { name: 'Apple (services)',     category: 'saas' },
  notion:           { name: 'Notion',               category: 'saas' },
  adobe:            { name: 'Adobe Creative Cloud', category: 'saas' },
  openai:           { name: 'ChatGPT Plus',         category: 'saas' },
  chatgpt:          { name: 'ChatGPT Plus',         category: 'saas' },
  canva:            { name: 'Canva Pro',            category: 'saas' },
  dropbox:          { name: 'Dropbox',              category: 'saas' },
  'google one':     { name: 'Google One',           category: 'saas' },
  'microsoft 365':  { name: 'Microsoft 365',        category: 'saas' },
  // Salle de sport (AVANT télécom : « orange bleue » ≠ « orange »)
  'orange bleue':   { name: "L'Orange Bleue",       category: 'fitness' },
  'basic fit':      { name: 'Basic-Fit',            category: 'fitness' },
  'basic-fit':      { name: 'Basic-Fit',            category: 'fitness' },
  basicfit:         { name: 'Basic-Fit',            category: 'fitness' },
  'fitness park':   { name: 'Fitness Park',         category: 'fitness' },
  keepcool:         { name: 'Keepcool',             category: 'fitness' },
  'keep cool':      { name: 'Keepcool',             category: 'fitness' },
  neoness:          { name: 'Neoness',              category: 'fitness' },
  // Télécom
  sosh:             { name: 'Sosh',                 category: 'telecom' },
  orange:           { name: 'Orange',               category: 'telecom' },
  'red by sfr':     { name: 'RED by SFR',           category: 'telecom' },
  sfr:              { name: 'SFR',                  category: 'telecom' },
  'b you':          { name: 'B&You',                category: 'telecom' },
  byou:             { name: 'B&You',                category: 'telecom' },
  bouygues:         { name: 'Bouygues Telecom',     category: 'telecom' },
  bouygtel:         { name: 'Bouygues Telecom',     category: 'telecom' },
  free:             { name: 'Free',                 category: 'telecom' },
  'la poste mobile': { name: 'La Poste Mobile',     category: 'telecom' },
  prixtel:          { name: 'Prixtel',              category: 'telecom' },
  'nrj mobile':     { name: 'NRJ Mobile',           category: 'telecom' },
  // Assurance / mutuelle
  axa:              { name: 'AXA',                  category: 'insurance' },
  maif:             { name: 'MAIF',                 category: 'insurance' },
  macif:            { name: 'MACIF',                category: 'insurance' },
  matmut:           { name: 'Matmut',               category: 'insurance' },
  gmf:              { name: 'GMF',                  category: 'insurance' },
  maaf:             { name: 'MAAF',                 category: 'insurance' },
  mma:              { name: 'MMA',                  category: 'insurance' },
  groupama:         { name: 'Groupama',             category: 'insurance' },
  allianz:          { name: 'Allianz',              category: 'insurance' },
  'direct assurance': { name: 'Direct Assurance',   category: 'insurance' },
  'harmonie mutuelle': { name: 'Harmonie Mutuelle', category: 'insurance' },
  mgen:             { name: 'MGEN',                 category: 'insurance' },
  alan:             { name: 'Alan',                 category: 'insurance' },
  luko:             { name: 'Luko',                 category: 'insurance' },
  // Énergie / eau
  totalenergies:    { name: 'TotalEnergies',        category: 'utility' },
  'total direct energie': { name: 'TotalEnergies',  category: 'utility' },
  edf:              { name: 'EDF',                  category: 'utility' },
  engie:            { name: 'Engie',                category: 'utility' },
  ekwateur:         { name: 'Ekwateur',             category: 'utility' },
  'mint energie':   { name: 'Mint Énergie',         category: 'utility' },
  'ohm energie':    { name: 'Ohm Énergie',          category: 'utility' },
  wekiwi:           { name: 'Wekiwi',               category: 'utility' },
  eni:              { name: 'Eni',                  category: 'utility' },
  veolia:           { name: 'Veolia',               category: 'utility' },
  suez:             { name: 'Suez',                 category: 'utility' },
  saur:             { name: 'Saur',                 category: 'utility' },
}

// ─── NORMALIZE ─────────────────────────────────────────────────────────────
function normalizeLabel(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9\s\-\.+]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// Clé trouvée comme MOT (pas au milieu d'un autre) : évite « sfr » dans le BIC
// « BOUSFRPP », « mma » dans « MAMMA » (pizzeria), « edf » dans une référence…
function keyMatches(label: string, key: string): boolean {
  let from = 0
  for (;;) {
    const idx = label.indexOf(key, from)
    if (idx === -1) return false
    const before = label[idx - 1]
    const after = label[idx + key.length]
    const alnum = (c: string | undefined) => !!c && /[a-z0-9]/.test(c)
    if (!alnum(before) && !alnum(after)) return true
    from = idx + 1
  }
}

function resolveMerchant(label: string): { name: string; category: TransactionCategory } {
  for (const [key, value] of Object.entries(MERCHANT_MAP)) {
    if (keyMatches(label, key)) return value
  }
  // Repli : premier mot « utile » du libellé, sans les préfixes bancaires ni
  // les nombres (année, réf de mandat…) qui ne sont JAMAIS un marchand.
  const words = label
    .replace(/\b(prlv|prelevement|sepa|carte|cb|vir|virement|paiement|achat|echeance|europeen|mandat|ref|de|du|des|la|le|les)\b/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !/^\d+$/.test(w))
  const name = words[0] ? words[0].charAt(0).toUpperCase() + words[0].slice(1) : 'Inconnu'
  return { name, category: 'other' }
}

// ─── PARSE PDF TEXT ────────────────────────────────────────────────────────
// Objectif : encaisser les VRAIS formats de relevés français —
//   « 05/01/2026 PRLV SEPA NETFLIX.COM -17,99 »
//   « CARTE 04.01 SPOTIFY AB STOCKHOLM 10,99 EUR »
//   « PRELEVEMENT ORANGE SA 39,99 1 234,56 » (colonne solde en fin de ligne)
//   « 12/01 NETFLIX.COM 13.49 » (décimales à point, date sans année)

const DATE_RE = /\b(\d{1,2}[\/.\-]\d{1,2}(?:[\/.\-]\d{2,4})?)\b/
// Montant : décimales à virgule (avec séparateurs de milliers espace/point)
// ou à point — sans jamais avaler un fragment de date (« 13.04.26 »).
// `(?<!\d)` : un montant ne DÉMARRE jamais au milieu d'un nombre — sinon la fin
// d'une réf de mandat « …180002 » collée à « 301,16 » se lirait « 2 301,16 ».
const AMOUNT_RE = /(?<!\d)[-+]?\d{1,3}(?:[  .]\d{3})*,\d{2}(?!\d)|(?<!\d)[-+]?\d+\.\d{2}(?![\d\/.\-])/g

// Lignes de relevé qui ne sont pas des opérations
const SKIP_RE = /^(solde|total|encours|ancien|nouveau|date|libell|cumul|frais bancaires annuels|releve|relevé)/i

function parseAmount(raw: string): number {
  return parseFloat(raw.replace(/[  ]/g, '').replace(/\.(?=\d{3}\b)/g, '').replace(',', '.'))
}

function parseDate(raw: string): string {
  const parts = raw.split(/[/\-.]/)
  const now = new Date()
  if (parts.length >= 2) {
    const [d, m, y] = parts as [string, string, string | undefined]
    const year = !y ? String(now.getFullYear()) : y.length === 2 ? `20${y}` : y
    return `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }
  return now.toISOString().slice(0, 10)
}

export interface ParseReport {
  transactions: Omit<Transaction, 'id'>[]
  /** Lignes qui ressemblent à des opérations mais n'ont pas été comprises */
  unmatchedLines: string[]
}

export function parseTransactionsFromText(
  text: string,
  uploadId: string
): Omit<Transaction, 'id'>[] {
  return parseStatement(text, uploadId).transactions
}

export function parseStatement(text: string, uploadId: string): ParseReport {
  const rawLines = text.split('\n').map(l => l.trim()).filter(Boolean)

  // Regroupement des opérations MULTI-LIGNES. Beaucoup de relevés (Société
  // Générale, La Banque Postale…) éclatent un prélèvement sur plusieurs lignes :
  //   « 27/04/2026 27/04/2026 PRELEVEMENT EUROPEEN 2400723572 »  (en-tête daté, sans montant)
  //   « DE: ORANGE SA-ORANGE »                                    (le créancier = marchand)
  //   « MOTIF: … » / « REF: … » / « MANDAT … »
  //   « 22,33 »                                                   (le montant, plusieurs lignes plus bas)
  // → on agrège l'en-tête daté jusqu'au montant OU la prochaine opération datée.
  const startsWithDate = (l: string) => /^\d{1,2}[/.\-]\d{1,2}(?:[/.\-]\d{2,4})?/.test(l)
  const lineHasAmount = (l: string) => { AMOUNT_RE.lastIndex = 0; const r = AMOUNT_RE.test(l); AMOUNT_RE.lastIndex = 0; return r }

  const lines: string[] = []
  let i = 0
  while (i < rawLines.length) {
    const cur = rawLines[i]!
    // Ligne d'opération datée SANS montant : on agrège la suite jusqu'au montant.
    if (startsWithDate(cur) && !lineHasAmount(cur) && !SKIP_RE.test(cur)) {
      let block = cur
      let j = i + 1
      const MAX = 8 // garde-fou : on ne recolle jamais indéfiniment
      while (j < rawLines.length && j - i <= MAX && !startsWithDate(rawLines[j]!)) {
        block += ` ${rawLines[j]}`
        if (lineHasAmount(rawLines[j]!)) { j++; break }
        j++
      }
      lines.push(block)
      i = j
    } else {
      lines.push(cur)
      i++
    }
  }

  const transactions: Omit<Transaction, 'id'>[] = []
  const unmatchedLines: string[] = []

  for (const line of lines) {
    if (SKIP_RE.test(line)) continue

    const amounts = [...line.matchAll(AMOUNT_RE)]
    if (amounts.length === 0) {
      // Une date sans montant : probablement une opération mal comprise
      if (DATE_RE.test(line) && line.length > 12) unmatchedLines.push(line)
      continue
    }

    // Colonne débit avant la colonne solde : signe « - » prioritaire, sinon
    // le premier montant de la ligne.
    const chosen = amounts.find(m => m[0].startsWith('-')) ?? amounts[0]!
    const amount = Math.abs(parseAmount(chosen[0]))
    if (!(amount > 0) || amount > 10000) { unmatchedLines.push(line); continue }

    const dateMatch = line.match(DATE_RE)
    const date = dateMatch?.[1] ? parseDate(dateMatch[1]) : new Date().toISOString().slice(0, 10)

    // Libellé = la ligne sans TOUTES les dates (certains relevés en ont deux :
    // Date + Valeur, plus la date d'opération carte), sans le(s) montant(s), la
    // devise, et les références de carte (« X4179 ») ou longues réfs de mandat.
    let label = line.replace(/\b\d{1,2}[/.\-]\d{1,2}(?:[/.\-]\d{2,4})?\b/g, ' ')
    for (const m of amounts) label = label.replace(m[0], ' ')
    label = label
      .replace(/\b(eur|euros?)\b/gi, ' ')
      .replace(/€/g, ' ')
      .replace(/\bX\d{3,}\b/gi, ' ')   // référence de carte, ex. « X4179 »
      .replace(/\b\d{6,}\b/g, ' ')      // longue référence (mandat / opération)
      .replace(/\s+/g, ' ')
      .trim()
    if (!label) { unmatchedLines.push(line); continue }

    const normalized = normalizeLabel(label)
    const { name: merchant, category } = resolveMerchant(normalized)

    transactions.push({
      upload_id: uploadId,
      date,
      amount,
      label,
      normalized_label: normalized,
      merchant,
      category,
    })
  }

  logger.info('PDF parsed', { lines: lines.length, transactions: transactions.length, unmatched: unmatchedLines.length })
  return { transactions, unmatchedLines: unmatchedLines.slice(0, 8) }
}
