import type { Transaction, TransactionCategory } from '@/types'
import { logger } from '@/lib/logger'

// ─── MERCHANT MAP ──────────────────────────────────────────────────────────
const MERCHANT_MAP: Record<string, { name: string; category: TransactionCategory }> = {
  netflix:          { name: 'Netflix',              category: 'streaming' },
  spotify:          { name: 'Spotify',              category: 'streaming' },
  disney:           { name: 'Disney+',              category: 'streaming' },
  'amazon prime':   { name: 'Amazon Prime',         category: 'streaming' },
  'canal+':         { name: 'Canal+',               category: 'streaming' },
  deezer:           { name: 'Deezer',               category: 'streaming' },
  notion:           { name: 'Notion',               category: 'saas' },
  adobe:            { name: 'Adobe Creative Cloud', category: 'saas' },
  openai:           { name: 'ChatGPT Plus',         category: 'saas' },
  chatgpt:          { name: 'ChatGPT Plus',         category: 'saas' },
  canva:            { name: 'Canva Pro',            category: 'saas' },
  dropbox:          { name: 'Dropbox',              category: 'saas' },
  'google one':     { name: 'Google One',           category: 'saas' },
  'microsoft 365':  { name: 'Microsoft 365',        category: 'saas' },
  orange:           { name: 'Orange',               category: 'telecom' },
  sfr:              { name: 'SFR',                  category: 'telecom' },
  free:             { name: 'Free',                 category: 'telecom' },
  bouygues:         { name: 'Bouygues Telecom',     category: 'telecom' },
  axa:              { name: 'AXA',                  category: 'insurance' },
  maif:             { name: 'MAIF',                 category: 'insurance' },
  allianz:          { name: 'Allianz',              category: 'insurance' },
  alan:             { name: 'Alan',                 category: 'insurance' },
  'basic fit':      { name: 'Basic Fit',            category: 'fitness' },
  neoness:          { name: 'Neoness',              category: 'fitness' },
  edf:              { name: 'EDF',                  category: 'utility' },
  engie:            { name: 'Engie',                category: 'utility' },
}

// ─── NORMALIZE ─────────────────────────────────────────────────────────────
function normalizeLabel(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9\s\-\.]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function resolveMerchant(label: string): { name: string; category: TransactionCategory } {
  for (const [key, value] of Object.entries(MERCHANT_MAP)) {
    if (label.includes(key)) return value
  }
  const words = label.split(' ').filter(w => w.length > 2)
  const name = words[0] ? words[0].charAt(0).toUpperCase() + words[0].slice(1) : 'Inconnu'
  return { name, category: 'other' }
}

// ─── PARSE PDF TEXT ────────────────────────────────────────────────────────
// Pattern: date + amount + label on each line
// Handles French bank statement formats
const LINE_PATTERNS = [
  // DD/MM/YYYY ... -XX,XX ... label
  /(\d{2}[/\-.]\d{2}[/\-.]\d{2,4})\s+(.+?)\s+([-+]?\d+[,\.]\d{2})\s*$/,
  // label ... -XX,XX
  /^(.+?)\s+([-+]?\d+[,\.]\d{2})\s*$/,
]

function parseAmount(raw: string): number {
  return parseFloat(raw.replace(',', '.').replace(/\s/g, ''))
}

function parseDate(raw: string): string {
  const parts = raw.split(/[/\-.]/)
  if (parts.length === 3) {
    const [d, m, y] = parts as [string, string, string]
    const year = y.length === 2 ? `20${y}` : y
    return `${year}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`
  }
  return new Date().toISOString().split('T')[0] ?? ''
}

export function parseTransactionsFromText(
  text: string,
  uploadId: string
): Omit<Transaction, 'id'>[] {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  const transactions: Omit<Transaction, 'id'>[] = []

  for (const line of lines) {
    for (const pattern of LINE_PATTERNS) {
      const match = line.match(pattern)
      if (!match) continue

      const hasDate = match.length === 4
      const rawDate   = hasDate ? (match[1] ?? '') : new Date().toISOString().split('T')[0] ?? ''
      const rawLabel  = hasDate ? (match[2] ?? '') : (match[1] ?? '')
      const rawAmount = hasDate ? (match[3] ?? '0') : (match[2] ?? '0')

      const amount = Math.abs(parseAmount(rawAmount))
      if (amount <= 0 || amount > 10000) continue

      const normalized = normalizeLabel(rawLabel)
      const { name: merchant, category } = resolveMerchant(normalized)

      transactions.push({
        upload_id:        uploadId,
        date:             hasDate ? parseDate(rawDate) : rawDate,
        amount,
        label:            rawLabel,
        normalized_label: normalized,
        merchant,
        category,
      })
      break
    }
  }

  logger.info('PDF parsed', { lines: lines.length, transactions: transactions.length })
  return transactions
}
