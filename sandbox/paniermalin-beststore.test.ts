/**
 * Test sandbox — PanierMalin « le moins cher pour toi » (bestStore)
 * Où tu l'as eu le moins cher, calculé sur TON historique perso. Logique pure.
 * Lancer : npm run test:sandbox
 */
// @ts-expect-error module ESM sans types (app statique)
import { recordPurchase, bestStore } from '../public/paniermalin/logic.mjs'

let failures = 0
function check(name: string, cond: boolean, detail = '') {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${!cond && detail ? ` — ${detail}` : ''}`)
  if (!cond) failures++
}

// recordPurchase garde le magasin (rétro-compatible : store optionnel)
let h = recordPurchase([], { date: '2026-01-01', price: 2.5, store: 'Lidl' })
check('recordPurchase enregistre le magasin', h[0].store === 'Lidl' && h[0].price === 2.5)
h = recordPurchase(h, { date: '2026-01-02', price: 3.1 }) // sans magasin
check('Achat sans magasin → store null', h[1].store === null)
h = recordPurchase(h, { date: '2026-01-03', price: 2.9, store: '  ' }) // magasin vide
check('Magasin vide (espaces) → store null', h[2].store === null)

// bestStore : le magasin le moins cher de TON historique
const hist = [
  { date: '2026-01-01', price: 2.90, store: 'Carrefour' },
  { date: '2026-02-01', price: 2.40, store: 'Lidl' },
  { date: '2026-03-01', price: 2.60, store: 'Carrefour' },
  { date: '2026-04-01', price: 2.20, store: 'Lidl' }, // Lidl encore moins cher
  { date: '2026-05-01', price: null, store: 'Auchan' }, // pas de prix → ignoré
]
const b = bestStore(hist)
check('Moins cher = Lidl à 2,20 €', b?.store === 'Lidl' && b?.price === 2.20)

// Robustesse
check('Aucun magasin → null', bestStore([{ date: 'x', price: 2, store: null }]) === null)
check('Historique vide → null', bestStore([]) === null)
check('null → null (pas de crash)', bestStore(null) === null)
check('Un seul magasin connu → le renvoie', bestStore([{ date: 'x', price: 4, store: 'Aldi' }])?.store === 'Aldi')

console.log(failures === 0 ? '\n✅ BEST STORE : TOUS LES TESTS PASSENT' : `\n❌ ${failures} ÉCHEC(S)`)
process.exit(failures === 0 ? 0 : 1)
