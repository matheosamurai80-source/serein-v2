/**
 * Test sandbox — PanierMalin : « À racheter » (inventaire → liste)
 * isOnList : un produit de l'inventaire est-il déjà sur la liste ? Logique pure.
 * Lancer : npm run test:sandbox
 */
// @ts-expect-error module ESM sans types (app statique)
import { isOnList, addItem, removeItem } from '../public/paniermalin/listes.mjs'

let failures = 0
function check(name: string, cond: boolean, detail = '') {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${!cond && detail ? ` — ${detail}` : ''}`)
  if (!cond) failures++
}

let list = addItem([], 'Lait')
check('Article présent reconnu', isOnList(list, 'Lait'))
check('Insensible à la casse/espaces', isOnList(list, '  LAIT '))
check('Article absent → false', !isOnList(list, 'Pain'))

// Après suppression (pierre tombale), il n'est plus "sur la liste"
const withPain = addItem(list, 'Pain')
const id = withPain.find((i: { name: string; id: string }) => i.name === 'Pain').id
const afterDelete = removeItem(withPain, id)
check('Article supprimé → plus sur la liste', !isOnList(afterDelete, 'Pain'))
check('Liste vide / null → false (pas de crash)', !isOnList(null as unknown as unknown[], 'Lait'))

console.log(failures === 0 ? '\n✅ À RACHETER : TOUS LES TESTS PASSENT' : `\n❌ ${failures} ÉCHEC(S)`)
process.exit(failures === 0 ? 0 : 1)
