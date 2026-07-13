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
    fat: num(n.fat_100g),
    satFat: num(n['saturated-fat_100g']),
    fiber: num(n.fiber_100g),
    proteins: num(n.proteins_100g),
    additives: Array.isArray(p.additives_tags)
      ? p.additives_tags.map(t => String(t).replace(/^[a-z]{2}:/, '').toUpperCase()).filter(Boolean)
      : [],
    price: null, // saisi à la main par l'utilisateur (optionnel)
  }
}

// ─── SOURCES PRODUIT (famille Open Food Facts, données ouvertes) ────────────
// L'alimentaire vit sur Open Food Facts ; l'hygiène/cosmétique (Vania, gel
// douche, dentifrice…) sur Open Beauty Facts ; le reste sur Open Products
// Facts. Même schéma d'API et même normalisation → on essaie dans l'ordre.
export const PRODUCT_API_HOSTS = [
  'world.openfoodfacts.org',
  'world.openbeautyfacts.org',
  'world.openproductsfacts.org',
]

export function productApiUrl(host, ean) {
  return `https://${host}/api/v2/product/${encodeURIComponent(ean)}.json`
    + '?fields=product_name,brands,quantity,nutriscore_grade,nova_group,nutriments,additives_tags'
}

/** Premier résultat reconnu (status 1) parmi plusieurs sources → produit normalisé. */
export function pickProduct(ean, responses) {
  for (const off of responses ?? []) {
    const p = normalizeProduct(ean, off)
    if (p) return p
  }
  return null
}

// ─── OPEN PRICES — prix communautaires (Open Food Facts, données ouvertes) ──
// Réponse à la faiblesse n°1 de l'audit : montrer un prix de référence même
// sans saisie de l'utilisateur. Base communautaire ouverte, zéro partenariat.
// Parseur TOLÉRANT (les noms de champs peuvent varier) : en cas de forme
// inattendue → null (rien affiché, rien de cassé).

export function openPricesUrl(ean) {
  return `https://prices.openfoodfacts.org/api/v1/prices?product_code=${encodeURIComponent(ean)}&order_by=-date&size=25`
}

/** Page Open Prices du produit — pour consulter/contribuer un prix (avec son compte OFF). */
export function openPricesProductUrl(ean) {
  return `https://prices.openfoodfacts.org/products/${encodeURIComponent(ean)}`
}

function extractPriceEntry(it) {
  if (!it || typeof it !== 'object') return null
  const price = Number(it.price)
  if (!(price > 0)) return null
  const currency = it.currency ?? it.price_currency ?? null
  const date = it.date ?? it.created ?? it.created_at ?? null
  const loc = it.location ?? {}
  const store = it.location_osm_name ?? loc.osm_name ?? loc.osm_brand ?? loc.osm_address_city ?? it.store ?? null
  return { price: Math.round(price * 100) / 100, currency, date, store: store ? String(store) : null }
}

/**
 * Synthèse des prix communautaires (EUR par défaut) : nombre, plus bas, médiane,
 * dernier relevé (prix + enseigne + date). null si rien d'exploitable.
 */
export function summarizeCommunityPrices(resp, { currency = 'EUR' } = {}) {
  const raw = Array.isArray(resp) ? resp : (resp?.items ?? resp?.results ?? [])
  const entries = []
  for (const it of raw) {
    const e = extractPriceEntry(it)
    if (!e) continue
    if (e.currency && currency && e.currency.toUpperCase() !== currency.toUpperCase()) continue
    entries.push(e)
  }
  if (!entries.length) return null
  const prices = entries.map(e => e.price).sort((a, b) => a - b)
  const mid = Math.floor(prices.length / 2)
  const median = prices.length % 2 ? prices[mid] : (prices[mid - 1] + prices[mid]) / 2
  // `order_by=-date` → le 1er est le plus récent ; sinon on prend celui daté max.
  const latest = entries.reduce((a, b) => (String(b.date ?? '') > String(a.date ?? '') ? b : a), entries[0])
  return {
    count: entries.length,
    lowest: prices[0],
    median: Math.round(median * 100) / 100,
    latest: { price: latest.price, store: latest.store, date: latest.date },
  }
}

// ─── DÉTAIL PRODUIT (Brique 4) ──────────────────────────────────────────────
// Fiche enrichie sur demande (tap), sans appel réseau supplémentaire : tout
// vient de la réponse Open Food Facts déjà stockée. Les produits scannés
// avant cette version n'ont pas ces champs → message doux, pas de re-fetch
// automatique en masse.

export const NUTRI_EXPLAIN =
  'Nutri-Score : note globale de qualité nutritionnelle pour 100 g, de A (meilleure) à E. '
  + 'Elle pénalise calories, sucres, sel et graisses saturées, et valorise fibres et protéines.'

export const NOVA_EXPLAIN =
  'NOVA : degré de transformation, de 1 (aliment brut) à 4 (ultra-transformé — '
  + 'additifs et procédés industriels).'

/**
 * Lignes de détail affichables pour un produit (uniquement les champs
 * réellement présents). hasAny=false → « détails non disponibles ».
 */
export function productDetail(p) {
  const rows = []
  const push = (label, value, unit) => { if (typeof value === 'number' && Number.isFinite(value)) rows.push({ label, value, unit }) }
  push('Sucres', p?.sugars, 'g/100g')
  push('Sel', p?.salt, 'g/100g')
  push('Matières grasses', p?.fat, 'g/100g')
  push('… dont saturées', p?.satFat, 'g/100g')
  push('Fibres', p?.fiber, 'g/100g')
  push('Protéines', p?.proteins, 'g/100g')
  const additives = Array.isArray(p?.additives) ? p.additives : []
  return { rows, additives, hasAny: rows.length > 0 || additives.length > 0 }
}

/** Fiche complète officielle Open Food Facts. */
export function offProductUrl(ean) {
  return `https://fr.openfoodfacts.org/produit/${encodeURIComponent(String(ean ?? ''))}`
}

// ─── LECTURE DE TICKET DE CAISSE (Brique 3) ─────────────────────────────────
// L'OCR (Tesseract.js) tourne dans le navigateur ; ici, la partie PURE et
// testable : transformer le texte brut d'un ticket en lignes (nom, prix),
// en écartant totaux, TVA, moyens de paiement, n° de ticket, remises…
// L'association automatique à une fiche Open Food Facts est HORS SCOPE
// (volontairement) : c'est l'utilisateur qui valide chaque ligne.

const TICKET_EXCLUDE = new RegExp(
  [
    'total', 'montant', 'tva', 't\\.v\\.a', '\\bh\\.?t\\b', '\\bttc\\b',
    '\\bcb\\b', 'carte', 'espece', 'cheque', 'rendu', 'monnaie', 'paiement',
    'ticket', 'caisse', 'merci', 'bienvenue', 'siret', 'siren', '\\btel\\b',
    'www', 'http', 'client', 'fidelit', 'remise', 'reduction', 'solde',
    'prix au', '€/', 'e/kg', 'e/l\\b', 'articles?\\b.*\\d$', 'n[°o]\\s*\\d',
  ].join('|'),
  'i'
)

/**
 * Texte OCR d'un ticket → lignes candidates { label, price }.
 * Rien n'est enregistré ici : chaque ligne devra être validée à la main.
 */
export function parseTicketText(text) {
  const out = []
  for (const raw of String(text ?? '').split('\n')) {
    const line = raw.trim().replace(/\s+/g, ' ')
    if (line.length < 4) continue
    // prix en fin de ligne : « 1,89 », « 2.35 € », jamais négatif (remises)
    const m = line.match(/(-?\d{1,3}[.,]\d{2})\s*(?:€|eur)?\s*$/i)
    if (!m) continue
    const price = parseFloat(m[1].replace(',', '.'))
    if (!(price >= 0.05 && price <= 500)) continue
    if (TICKET_EXCLUDE.test(line)) continue
    let label = line.slice(0, m.index).trim().replace(/[.·…_\-*]+$/, '').trim()
    label = label.replace(/^\d+\s*[xX*]\s*/, '').trim() // « 2 X YAOURT » → « YAOURT »
    // un vrai nom de produit contient au moins 3 lettres
    if ((label.match(/[a-zA-ZÀ-ÿ]/g) ?? []).length < 3) continue
    out.push({ label, price })
  }
  return out
}

/**
 * Propose le produit de l'inventaire le plus proche d'une ligne de ticket
 * (mots du libellé retrouvés dans le nom) — simple aide, jamais automatique.
 */
export function suggestMatch(inventory, label) {
  const words = String(label ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .split(/[^a-z0-9]+/).filter(w => w.length >= 3)
  if (!words.length) return null
  let best = null
  for (const p of inventory ?? []) {
    const name = String(p.name ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    const hits = words.filter(w => name.includes(w)).length
    if (hits > 0 && (!best || hits > best.hits)) best = { ean: p.ean, hits }
  }
  return best ? best.ean : null
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

// ─── ENSEIGNES & FIDÉLITÉ (liens, PAS de carte stockée) ─────────────────────
// Choix produit de Juju : on ne stocke aucune carte de fidélité (donnée
// sensible) — on donne des LIENS officiels vers les enseignes (offres /
// programme fidélité), et l'utilisateur peut en AJOUTER une si absente.
// Aucun partenariat, aucune commission.

/** Enseignes de base (sites officiels https, publics). */
export const DEFAULT_ENSEIGNES = [
  { name: 'Carrefour', url: 'https://www.carrefour.fr' },
  { name: 'E.Leclerc', url: 'https://www.e.leclerc' },
  { name: 'Intermarché', url: 'https://www.intermarche.com' },
  { name: 'Auchan', url: 'https://www.auchan.fr' },
  { name: 'Lidl', url: 'https://www.lidl.fr' },
  { name: 'Super U', url: 'https://www.magasins-u.com' },
  { name: 'Monoprix', url: 'https://www.monoprix.fr' },
  { name: 'Aldi', url: 'https://www.aldi.fr' },
  { name: 'Casino', url: 'https://www.casino.fr' },
]

export function isValidHttpsUrl(url) {
  try { return new URL(String(url)).protocol === 'https:' } catch { return false }
}

/** Nettoie/valide une enseigne saisie. Renvoie { name, url } ou null. */
export function normalizeEnseigne(e) {
  const name = String(e?.name ?? '').trim()
  const url = String(e?.url ?? '').trim()
  if (!name || name.length > 60) return null
  if (!isValidHttpsUrl(url)) return null
  return { name, url }
}

/**
 * Fusionne plusieurs sources d'enseignes (défaut, officielles distantes,
 * ajouts perso), en gardant les liens https valides, sans doublon de nom
 * (insensible à la casse), dans l'ordre d'apparition.
 */
export function mergeEnseignes(...lists) {
  const seen = new Set()
  const out = []
  for (const list of lists) {
    for (const raw of list ?? []) {
      const e = normalizeEnseigne(raw)
      if (!e) continue
      const key = e.name.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      out.push(e)
    }
  }
  return out
}

// ─── PRIX INTELLIGENT (l'effet waouh) ───────────────────────────────────────
// Au lieu d'un prix facial, on présente le VRAI prix payé et la décision :
// prix carte (fidélité), prix après cagnotte, €/kg, prix habituel, économie du
// jour, et l'alternative la plus rentable. Données 100 % côté consommateur :
// prix saisi + avantages fidélité saisis + historique perso + inventaire.
// Aucun catalogue de marque requis.

const round2 = n => Math.round(n * 100) / 100
const clampPct = p => Math.min(90, Math.max(0, Number(p) || 0))

/** €/kg (ou €/L) à partir d'un prix et d'une quantité OFF ("400 g", "6 x 1,5 L"…). */
export function pricePerKg(price, quantityStr) {
  if (!(price > 0) || !quantityStr) return null
  const s = String(quantityStr).toLowerCase().replace(',', '.')
  const mult = s.match(/(\d+)\s*x\s*([\d.]+)/)
  const m = s.match(/([\d.]+)\s*(kg|g|l|cl|ml)\b/)
  if (!m) return null
  let value = parseFloat(m[1])
  if (mult) value = parseInt(mult[1], 10) * parseFloat(mult[2])
  if (!(value > 0)) return null
  const unit = m[2]
  // base en grammes/ml (kg et L → ×1000, cl → ×10, g/ml inchangés)
  const baseG = unit === 'kg' || unit === 'l' ? value * 1000 : unit === 'cl' ? value * 10 : value
  return round2((price / baseG) * 1000)
}

/**
 * Alternative la plus rentable parmi des candidats [{ name, perKg }] :
 * la moins chère au kg ET strictement moins chère que le produit courant.
 * Renvoie { name, perKg, saving } ou null.
 */
export function bestAlternative(currentPerKg, alternatives) {
  if (!(currentPerKg > 0)) return null
  let best = null
  for (const a of alternatives ?? []) {
    if (!(a && a.perKg > 0) || a.perKg >= currentPerKg) continue
    if (!best || a.perKg < best.perKg) best = a
  }
  return best ? { name: best.name, perKg: round2(best.perKg), saving: round2(currentPerKg - best.perKg) } : null
}

/**
 * Décompose un prix en « Prix Intelligent ».
 * Entrées : price (facial), quantity, loyaltyPct (remise carte %), cagnotte (€),
 * history [{price}], alternatives [{name, perKg}].
 */
export function smartPrice({ price, quantity, loyaltyPct = 0, cagnotte = 0, history = [], alternatives = [] } = {}) {
  const facial = price > 0 ? round2(price) : null
  const cardPrice = facial != null ? round2(facial * (1 - clampPct(loyaltyPct) / 100)) : null
  const cg = Math.max(0, Number(cagnotte) || 0)
  const afterCagnotte = cardPrice != null ? round2(Math.max(0, cardPrice - cg)) : null
  const realPaid = afterCagnotte ?? cardPrice ?? facial
  const perKg = realPaid != null ? pricePerKg(realPaid, quantity) : null

  const prices = (history ?? []).map(h => h && h.price).filter(p => p > 0)
  const habitual = prices.length ? round2(prices.reduce((a, b) => a + b, 0) / prices.length) : null
  const economy = (habitual != null && realPaid != null && habitual > realPaid) ? round2(habitual - realPaid) : 0

  return {
    facial,                                   // prix affiché en rayon
    cardPrice,                                // après remise carte
    afterCagnotte,                            // après cagnotte / bon
    realPaid,                                 // le vrai prix payé
    perKg,                                    // €/kg du vrai prix
    habitual,                                 // prix habituel (moyenne perso)
    economy,                                  // économie vs habituel (0 si aucune)
    hasLoyalty: cardPrice != null && cardPrice < (facial ?? Infinity),
    hasCagnotte: cg > 0,
    bestAlternative: bestAlternative(perKg, alternatives),
  }
}

// ─── TABLEAU DE BORD D'ACCUEIL ──────────────────────────────────────────────
// « L'app travaille pour toi » : au lieu de faire choisir un onglet, on résume
// l'essentiel. Tout est dérivé de l'inventaire (prix saisis + historique perso).

export function dashboardStats(items) {
  let economyToday = 0
  const deals = []    // bonnes affaires du moment (tu paies moins que d'habitude)
  const toRebuy = []  // tes essentiels (achetés au moins 2 fois)
  for (const p of items ?? []) {
    const past = (p.purchases ?? []).slice(0, -1)
    const si = smartPrice({ price: p.price, quantity: p.quantity, loyaltyPct: p.loyaltyPct, cagnotte: p.cagnotte, history: past })
    if (si.economy > 0) {
      economyToday = round2(economyToday + si.economy)
      deals.push({ name: p.name, saving: si.economy })
    }
    if (isRecurring(p.purchases)) toRebuy.push(p.name)
  }
  deals.sort((a, b) => b.saving - a.saving)
  return { economyToday, deals, toRebuy, trackedCount: (items ?? []).length }
}
