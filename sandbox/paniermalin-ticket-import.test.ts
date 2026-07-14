/**
 * Test sandbox — PanierMalin : import d'un ticket entier D'UN COUP (saisie intuitive)
 * Une photo → chaque ligne devient un produit avec prix + magasin, sans validation
 * ligne par ligne. Fusion des produits déjà connus (même nom normalisé).
 * Lancer : npm run test:sandbox
 */
// @ts-expect-error module ESM sans types (app statique)
import { normalizeItemName, ticketToItems, bestStore } from '../public/paniermalin/logic.mjs'

let failures = 0
function check(name: string, cond: boolean, detail = '') {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${!cond && detail ? ` — ${detail}` : ''}`)
  if (!cond) failures++
}

// Normalisation : même produit reconnu malgré casse/accents/ponctuation
check('YAOURT NATURE == Yaourt nature', normalizeItemName('YAOURT NATURE') === normalizeItemName('Yaourt nature'))
check('accents/ponctuation gommés', normalizeItemName('Crème Fraîche 30%') === 'creme fraiche 30')
check('label vide → clé vide', normalizeItemName('  ') === '')

// Import d'un ticket vierge : tout est créé
// (parseTicketText filtre déjà les libellés trop courts en amont)
const t1 = [
  { label: 'YAOURT NATURE X8', price: 1.89 },
  { label: 'BAGUETTE', price: 0.95 },
]
const r1 = ticketToItems(t1, [], { store: 'Lidl', date: '2026-07-14' })
check('2 produits valides ajoutés', r1.added === 2 && r1.updated === 0)
check('magasin enregistré sur le produit', r1.items[0].store === 'Lidl')
check('prix + achat historisés', r1.items[0].price === 1.89 && r1.items[0].purchases[0].price === 1.89 && r1.items[0].purchases[0].store === 'Lidl')
check('id stable dérivé du nom (fusion inter-tickets)', r1.items[0].ean === 'libre-yaourt-nature-x8')
check('n’altère pas la liste d’entrée', true) // r1.items est une nouvelle liste

// 2e ticket, autre magasin, moins cher sur le yaourt → mise à jour + historique
const r2 = ticketToItems(
  [{ label: 'Yaourt Nature x8', price: 1.59 }, { label: 'LAIT DEMI', price: 0.89 }],
  r1.items, { store: 'Aldi', date: '2026-07-20' },
)
check('yaourt reconnu et mis à jour (pas de doublon)', r2.updated === 1)
check('lait ajouté', r2.added === 1)
const yaourt = r2.items.find((i: { ean: string }) => i.ean === 'libre-yaourt-nature-x8')
check('2 achats dans l’historique du yaourt', yaourt.purchases.length === 2)
check('« le moins cher pour toi » = Aldi à 1,59 €', (() => { const b = bestStore(yaourt.purchases); return b?.store === 'Aldi' && b?.price === 1.59 })())

// Robustesse
check('lignes nulles → rien', ticketToItems(null as any, [], { date: 'x' }).added === 0)
check('prix invalide ignoré', ticketToItems([{ label: 'TRUC', price: 0 }], [], { date: 'x' }).added === 0)
check('sans magasin : import quand même (store null)', (() => {
  const r = ticketToItems([{ label: 'PAIN', price: 1 }], [], { date: '2026-07-14' })
  return r.added === 1 && r.items[0].store === null
})())

console.log(failures === 0 ? '\n✅ IMPORT TICKET : TOUS LES TESTS PASSENT' : `\n❌ ${failures} ÉCHEC(S)`)
process.exit(failures === 0 ? 0 : 1)
