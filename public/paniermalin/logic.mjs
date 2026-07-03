/**
 * PANIERMALIN — logique métier pure (testable sans navigateur)
 * Validation EAN, normalisation Open Food Facts, comparaison du panier, prix.
 */

// ─── VALIDATION CODE-BARRES (EAN-8 / EAN-13, avec clé de contrôle) ──────────
export function validateEAN(raw) {
  const code = String(raw ?? '').replace(/\s/g, '')
  if (!/^\d{8}$|^\d{13}$/.test(code)) return false
  const digits = code.split('').map(Number)
  const check = digits.pop()
  let sum = 0
  // poids 3,1,3,1… en partant du chiffre juste à gauche de la clé
  digits.reverse().forEach((d, i) => { sum += d * (i % 2 === 0 ? 3 : 1) })
  return (10 - (sum % 10)) % 10 === check
}

// ─── NORMALISATION D'UN PRODUIT OPEN FOOD FACTS ─────────────────────────────
export function normalizeProduct(ean, off) {
  if (!off || off.status !== 1 || !off.product) return null
  const p = off.product
  const n = p.nutriments ?? {}
  const num = v => (typeof v === 'number' && Number.isFinite(v) ? v : null)
  return {
    ean,
    name: p.product_name || 'Produit sans nom',
    brand: p.brands || '',
    quantity: p.quantity || '',
    nutriscore: /^[a-e]$/.test(p.nutriscore_grade ?? '') ? p.nutriscore_grade : null,
    nova: [1, 2, 3, 4].includes(p.nova_group) ? p.nova_group : null,
    kcal: num(n['energy-kcal_100g']),
    sugars: num(n.sugars_100g),
    salt: num(n.salt_100g),
    satFat: num(n['saturated-fat_100g']),
    price: null, // saisi à la main par l'utilisateur (optionnel)
  }
}

// ─── COMPARAISON DU PANIER ──────────────────────────────────────────────────
// Tri : meilleur Nutri-Score d'abord ; à égalité, le moins calorique.
const rank = p => (p.nutriscore ? 'abcde'.indexOf(p.nutriscore) : 5)

export function compareBasket(items) {
  const sorted = [...items].sort((a, b) => {
    const r = rank(a) - rank(b)
    if (r !== 0) return r
    return (a.kcal ?? Infinity) - (b.kcal ?? Infinity)
  })
  return sorted.map((item, i) => ({ ...item, best: i === 0 && sorted.length > 1 && rank(item) < 5 }))
}

// ─── PRIX RAMENÉ AUX 100 g / 100 ml ─────────────────────────────────────────
// quantity OFF : "400 g", "1 kg", "75 cl", "1,5 L", "6 x 125 g"…
export function pricePer100(price, quantityStr) {
  if (!(price > 0) || !quantityStr) return null
  const s = String(quantityStr).toLowerCase().replace(',', '.')
  const mult = s.match(/(\d+)\s*x\s*([\d.]+)/)
  let m = s.match(/([\d.]+)\s*(kg|g|l|cl|ml)\b/)
  if (!m) return null
  let value = parseFloat(m[1])
  if (mult) value = parseInt(mult[1], 10) * parseFloat(mult[2])
  if (!(value > 0)) return null
  const unit = m[2]
  const base = unit === 'kg' ? value * 1000 : unit === 'l' ? value * 1000 : unit === 'cl' ? value * 10 : value
  return Math.round((price / base) * 100 * 100) / 100 // €/100g ou €/100ml
}

// ─── INVENTAIRE, RÉCURRENTS & PROMOS (v2 — d'après le concept d'origine) ────
// L'app garde en mémoire ce que vous avez acheté : elle détecte les doublons
// « vous en avez déjà à la maison », repère vos achats récurrents et signale
// les vraies promos par rapport à VOTRE historique de prix — côté
// consommateur, sans données des marques.

/** Enregistre un achat dans l'historique d'un produit (date ISO, prix éventuel). */
export function recordPurchase(history, { date, price = null }) {
  const h = Array.isArray(history) ? [...history] : []
  h.push({ date, price: price > 0 ? price : null })
  return h.sort((a, b) => a.date.localeCompare(b.date))
}

/** Achat récurrent = au moins 2 achats. */
export function isRecurring(history) {
  return Array.isArray(history) && history.length >= 2
}

/**
 * Signal prix par rapport à l'historique personnel :
 * 'promo'  → au moins 5 % sous le prix le plus bas déjà payé
 * 'hausse' → au moins 10 % au-dessus du prix moyen payé
 * null     → rien à signaler (ou pas assez d'historique)
 */
export function priceSignal(history, newPrice) {
  if (!(newPrice > 0)) return null
  const prices = (history ?? []).map(p => p.price).filter(p => p > 0)
  if (!prices.length) return null
  const min = Math.min(...prices)
  const avg = prices.reduce((a, b) => a + b, 0) / prices.length
  if (newPrice <= min * 0.95) return 'promo'
  if (newPrice >= avg * 1.10) return 'hausse'
  return null
}

/** Doublon maison : ce code-barres est déjà dans l'inventaire. */
export function findDuplicate(items, ean) {
  return (items ?? []).find(i => i.ean === ean) ?? null
}
