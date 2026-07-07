/**
 * PANIERMALIN — listes de courses (logique pure, testable sans navigateur)
 * Liste partagée en famille (texte OU synchro en direct par code secret),
 * articles récurrents re-proposés chaque semaine, suggestions d'inventaire.
 * Un article : { id, name, done, recurrent, t (horodatage), deleted? }
 * Les suppressions laissent une « pierre tombale » (deleted:true) pour que
 * la fusion entre téléphones ne ressuscite pas un article retiré.
 */

const norm = s => String(s ?? '').trim().replace(/\s+/g, ' ')
const keyOf = s => norm(s).toLowerCase()
const stamp = now => (typeof now === 'number' ? now : Date.now())

/** Articles visibles (sans les pierres tombales). */
export function visible(list) {
  return (list ?? []).filter(i => !i.deleted)
}

/** Ajoute un article (dédoublonné par nom). S'il existait coché ou supprimé, il revient. */
export function addItem(list, name, { recurrent = false, now } = {}) {
  const clean = norm(name)
  if (!clean) return list ?? []
  const id = keyOf(clean)
  const t = stamp(now)
  const existing = (list ?? []).find(i => i.id === id)
  if (existing) {
    return list.map(i => i.id === id
      ? { ...i, name: i.deleted ? clean : i.name, done: false, deleted: false, recurrent: i.recurrent || recurrent, t }
      : i)
  }
  return [...(list ?? []), { id, name: clean, done: false, recurrent, t }]
}

export function toggleDone(list, id, now) {
  return (list ?? []).map(i => i.id === id ? { ...i, done: !i.done, t: stamp(now) } : i)
}

export function toggleRecurrent(list, id, now) {
  return (list ?? []).map(i => i.id === id ? { ...i, recurrent: !i.recurrent, t: stamp(now) } : i)
}

/** Suppression = pierre tombale (nécessaire pour la synchro famille). */
export function removeItem(list, id, now) {
  return (list ?? []).map(i => i.id === id ? { ...i, deleted: true, t: stamp(now) } : i)
}

/**
 * « Nouvelle semaine » : les récurrents repartent décochés, les achats
 * ponctuels cochés sont supprimés, le reste ne bouge pas.
 */
export function resetWeek(list, now) {
  const t = stamp(now)
  return (list ?? []).map(i => {
    if (i.deleted) return i
    if (i.recurrent && i.done) return { ...i, done: false, t }
    if (!i.recurrent && i.done) return { ...i, deleted: true, t }
    return i
  })
}

/** Nombre d'articles restant à acheter. */
export function pendingCount(list) {
  return visible(list).filter(i => !i.done).length
}

/** Tri : à acheter d'abord (récurrents en tête), cochés à la fin. */
export function sortList(list) {
  return visible(list).sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1
    if (a.recurrent !== b.recurrent) return a.recurrent ? -1 : 1
    return a.name.localeCompare(b.name, 'fr')
  })
}

/** Texte de partage famille (SMS, WhatsApp…) — lisible sans app ni compte. */
export function shareText(list, appUrl = '') {
  const items = sortList(list)
  if (!items.length) return 'Liste de courses vide — rien à acheter 🎉'
  const lines = items.map(i => `${i.done ? '✓' : '▢'} ${i.name}${i.recurrent ? ' 🔁' : ''}`)
  const footer = appUrl ? `\n— Liste PanierMalin · ${appUrl}` : ''
  return `🧺 Liste de courses (${pendingCount(list)} à prendre)\n${lines.join('\n')}${footer}`
}

/** Suggestions « à racheter ? » : produits scannés ≥ 2 fois, pas déjà listés. */
export function suggestFromInventory(inventory, list) {
  const inList = new Set(visible(list).map(i => i.id))
  return (inventory ?? [])
    .filter(p => Array.isArray(p.purchases) && p.purchases.length >= 2)
    .map(p => norm(p.name))
    .filter(n => n && !inList.has(keyOf(n)))
    .filter((n, i, arr) => arr.findIndex(x => keyOf(x) === keyOf(n)) === i)
}

// ─── SYNCHRO FAMILLE (par code secret) ──────────────────────────────────────

const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789' // sans O/0, I/1/L

/** Code de partage lisible et dictable au téléphone (ex. « K7WM-P4QZ »). */
export function genShareCode(random = Math.random) {
  let out = ''
  for (let i = 0; i < 8; i++) out += CODE_ALPHABET[Math.floor(random() * CODE_ALPHABET.length)]
  return out
}

export function isValidShareCode(code) {
  return typeof code === 'string' && /^[A-Z2-9]{8,24}$/.test(code.toUpperCase().replace(/-/g, ''))
}

export function normalizeShareCode(code) {
  return String(code ?? '').toUpperCase().replace(/[^A-Z2-9]/g, '')
}

/**
 * Fusion de deux versions de la liste (deux téléphones) : pour chaque
 * article, la modification la plus récente gagne (horodatage t).
 */
export function mergeLists(a, b) {
  const byId = new Map()
  for (const i of [...(a ?? []), ...(b ?? [])]) {
    const prev = byId.get(i.id)
    if (!prev || (i.t ?? 0) > (prev.t ?? 0)) byId.set(i.id, i)
  }
  return [...byId.values()]
}

/** Deux listes affichent-elles la même chose ? (pour éviter les re-rendus) */
export function sameLists(a, b) {
  const ser = l => JSON.stringify([...(l ?? [])].sort((x, y) => x.id.localeCompare(y.id)))
  return ser(a) === ser(b)
}

// ─── RÉCURRENTS & PROPOSITIONS PROMO ────────────────────────────────────────

/** Les articles récurrents de la liste (cochés compris), triés. */
export function recurrentItems(list) {
  return sortList(list).filter(i => i.recurrent)
}

/**
 * Propositions d'achat : produits de l'inventaire dont le DERNIER prix connu
 * est une promo par rapport à VOTRE historique (priceSignal), achetés au
 * moins 2 fois (habitude), et pas déjà à prendre sur la liste.
 * priceSignal est injecté (vient de logic.mjs) pour rester testable pur.
 */
export function promoSuggestions(inventory, list, priceSignal) {
  const aPrendre = new Set(visible(list).filter(i => !i.done).map(i => i.id))
  const out = []
  for (const p of inventory ?? []) {
    const name = norm(p.name)
    if (!name || aPrendre.has(keyOf(name))) continue
    const prices = (p.purchases ?? []).filter(a => a.price > 0)
    if (prices.length < 2) continue // pas d'habitude → pas de comparaison honnête
    const last = prices[prices.length - 1]
    if (priceSignal(prices.slice(0, -1), last.price) === 'promo') {
      out.push({ name, price: last.price })
    }
  }
  return out
}
