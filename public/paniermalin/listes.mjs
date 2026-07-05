/**
 * PANIERMALIN — listes de courses (logique pure, testable sans navigateur)
 * Liste partagée en famille (export texte), articles récurrents re-proposés
 * chaque semaine, suggestions depuis l'inventaire scanné.
 * Un article : { id, name, done, recurrent }
 */

const norm = s => String(s ?? '').trim().replace(/\s+/g, ' ')
const keyOf = s => norm(s).toLowerCase()

/** Ajoute un article (dédoublonné par nom). S'il existait coché, on le décoche. */
export function addItem(list, name, { recurrent = false } = {}) {
  const clean = norm(name)
  if (!clean) return list
  const id = keyOf(clean)
  const existing = (list ?? []).find(i => i.id === id)
  if (existing) {
    return list.map(i => i.id === id ? { ...i, done: false, recurrent: i.recurrent || recurrent } : i)
  }
  return [...(list ?? []), { id, name: clean, done: false, recurrent }]
}

export function toggleDone(list, id) {
  return (list ?? []).map(i => i.id === id ? { ...i, done: !i.done } : i)
}

export function toggleRecurrent(list, id) {
  return (list ?? []).map(i => i.id === id ? { ...i, recurrent: !i.recurrent } : i)
}

export function removeItem(list, id) {
  return (list ?? []).filter(i => i.id !== id)
}

/**
 * « Nouvelle semaine » : les articles récurrents repartent à zéro (décochés),
 * les articles cochés non récurrents sortent de la liste, le reste ne bouge pas.
 */
export function resetWeek(list) {
  return (list ?? [])
    .filter(i => i.recurrent || !i.done)
    .map(i => i.recurrent ? { ...i, done: false } : i)
}

/** Nombre d'articles restant à acheter. */
export function pendingCount(list) {
  return (list ?? []).filter(i => !i.done).length
}

/** Tri : à acheter d'abord (récurrents en tête), cochés à la fin. */
export function sortList(list) {
  return [...(list ?? [])].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1
    if (a.recurrent !== b.recurrent) return a.recurrent ? -1 : 1
    return a.name.localeCompare(b.name, 'fr')
  })
}

/**
 * Texte de partage famille (SMS, WhatsApp, presse-papiers…) :
 * lisible par n'importe qui, sans compte ni app.
 */
export function shareText(list, appUrl = '') {
  const items = sortList(list)
  if (!items.length) return 'Liste de courses vide — rien à acheter 🎉'
  const lines = items.map(i => `${i.done ? '✓' : '▢'} ${i.name}${i.recurrent ? ' 🔁' : ''}`)
  const footer = appUrl ? `\n— Liste PanierMalin · ${appUrl}` : ''
  return `🧺 Liste de courses (${pendingCount(list)} à prendre)\n${lines.join('\n')}${footer}`
}

/**
 * Suggestions « à racheter ? » : les produits de l'inventaire achetés au
 * moins 2 fois (récurrents) qui ne sont pas déjà dans la liste.
 */
export function suggestFromInventory(inventory, list) {
  const inList = new Set((list ?? []).map(i => i.id))
  return (inventory ?? [])
    .filter(p => Array.isArray(p.purchases) && p.purchases.length >= 2)
    .map(p => norm(p.name))
    .filter(n => n && !inList.has(keyOf(n)))
    .filter((n, i, arr) => arr.findIndex(x => keyOf(x) === keyOf(n)) === i)
}
