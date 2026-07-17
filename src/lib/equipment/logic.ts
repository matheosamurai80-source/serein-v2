// ─── ÉQUIPEMENT & GARANTIES (nouveau pavé) ──────────────────────────────────
// Tu achètes un appareil, tu gardes le ticket, et Serein te prévient AVANT la
// fin de garantie. Modèle habituel : document (ticket/facture) → engagement
// (la garantie) → échéance (sa fin). « Arme le client » : on alerte, on n'agit
// pas ; aucune donnée de marque, aucun partenariat. Logique pure, testable.

// Garantie légale de conformité (France, biens NEUFS) : 2 ans (Code de la conso).
export const LEGAL_WARRANTY_MONTHS = 24

export interface EquipmentItem {
  id: string
  name: string
  purchase_date: string        // ISO AAAA-MM-JJ
  price: number | null
  retailer: string | null
  warranty_months: number
  has_photo?: boolean          // preuve d'achat (ticket/facture) stockée sur l'appareil
}

// Photo de preuve : on la redimensionne avant stockage (un ticket net à 1400 px
// de large suffit largement, et ça évite de saturer le stockage local).
export const MAX_PHOTO_SIDE = 1400

/** Dimensions cibles en gardant le ratio, plafonnées au plus grand côté. */
export function scaledDimensions(width: number, height: number, max = MAX_PHOTO_SIDE): { width: number; height: number } {
  if (!(width > 0) || !(height > 0)) return { width: 0, height: 0 }
  const longest = Math.max(width, height)
  if (longest <= max) return { width: Math.round(width), height: Math.round(height) }
  const s = max / longest
  return { width: Math.round(width * s), height: Math.round(height * s) }
}

export type WarrantyUrgency = 'expiree' | 'bientot' | 'ok'

export interface WarrantyStatus {
  end: string | null           // ISO AAAA-MM-JJ
  daysLeft: number | null      // négatif si dépassée
  urgency: WarrantyUrgency
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const DAY_MS = 86_400_000
const BIENTOT_DAYS = 60        // « bientôt » = moins de 2 mois avant la fin

/** Fin de garantie = date d'achat + N mois (gère les débordements de mois). */
export function warrantyEnd(purchaseISO: string, months = LEGAL_WARRANTY_MONTHS): string | null {
  if (!ISO_DATE.test(String(purchaseISO))) return null
  const [y, m, d] = purchaseISO.split('-').map(Number)
  const base = new Date(Date.UTC(y, m - 1, d))
  base.setUTCMonth(base.getUTCMonth() + months)
  // Si le jour a débordé (ex. 31 → mois sans 31), setUTCMonth a déjà normalisé.
  return base.toISOString().slice(0, 10)
}

/** État de la garantie (finie / bientôt finie / OK) par rapport à aujourd'hui. */
export function warrantyStatus(item: Pick<EquipmentItem, 'purchase_date' | 'warranty_months'>, todayISO: string): WarrantyStatus {
  const end = warrantyEnd(item.purchase_date, item.warranty_months)
  if (!end || !ISO_DATE.test(String(todayISO))) return { end, daysLeft: null, urgency: 'ok' }
  const daysLeft = Math.round((Date.parse(end) - Date.parse(todayISO)) / DAY_MS)
  const urgency: WarrantyUrgency = daysLeft < 0 ? 'expiree' : daysLeft <= BIENTOT_DAYS ? 'bientot' : 'ok'
  return { end, daysLeft, urgency }
}

// Enseignes d'équipement (repère un achat durable + utile pour le SAV). Sans
// accents, matchées en frontière de mot par extractPurchaseInfo.
export const EQUIPMENT_RETAILERS: [RegExp, string][] = [
  [/\bdarty\b/, 'Darty'], [/\bboulanger\b/, 'Boulanger'], [/\bfnac\b/, 'Fnac'],
  [/\bbut\b/, 'But'], [/\bconforama\b/, 'Conforama'], [/\bikea\b/, 'Ikea'],
  [/\bleroy ?merlin\b/, 'Leroy Merlin'], [/\bcastorama\b/, 'Castorama'], [/\bbricorama\b/, 'Bricorama'],
  [/\bbricomarche\b/, 'Bricomarché'], [/\bmr bricolage\b/, 'Mr Bricolage'],
  [/\bamazon\b/, 'Amazon'], [/\bcdiscount\b/, 'Cdiscount'], [/\bldlc\b/, 'LDLC'],
  [/\bmateriel\.net\b/, 'Materiel.net'], [/\belectro ?depot\b/, 'Electro Dépôt'],
  [/\bubaldi\b/, 'Ubaldi'], [/\brue du commerce\b/, 'Rue du Commerce'],
  [/\bapple\b/, 'Apple'], [/\bbackmarket\b|\bback market\b/, 'Back Market'],
  [/\bdecathlon\b/, 'Decathlon'], [/\bnorauto\b/, 'Norauto'], [/\bfeu vert\b/, 'Feu Vert'],
]

const deburr = (s: string) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

/**
 * Repère dans un ticket/facture d'achat : l'enseigne, la date d'achat et le
 * montant (le plus élevé = le total). Le NOM de l'appareil reste saisi/confirmé
 * par l'utilisateur (trop variable pour être deviné de façon fiable).
 */
export function extractPurchaseInfo(text: string): { retailer: string | null; date: string | null; price: number | null } {
  const raw = String(text ?? '')
  const t = deburr(raw)

  let retailer: string | null = null
  for (const [re, name] of EQUIPMENT_RETAILERS) { if (re.test(t)) { retailer = name; break } }

  // Date d'achat : 1re date JJ/MM/AAAA (ou JJ/MM/AA) → ISO.
  let date: string | null = null
  const dm = raw.match(/\b(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2,4})\b/)
  if (dm) {
    const [, d, m, y] = dm
    const year = y.length === 2 ? `20${y}` : y
    date = `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }

  // Prix : le plus grand montant plausible (le total).
  const amounts = (raw.match(/(?<!\d)\d{1,4}[.,]\d{2}(?!\d)/g) ?? [])
    .map(a => parseFloat(a.replace(',', '.')))
    .filter(n => n >= 1 && n <= 100_000)
  const price = amounts.length ? Math.max(...amounts) : null

  return { retailer, date, price }
}
