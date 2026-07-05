/**
 * Test sandbox — PanierMalin : liste de courses, récurrents, partage famille
 * (méthode BUILD, étape 3). Retour utilisateur 2026-07-05 : « pas de liste
 * achat, partager famille, liste récurrente ».
 * Lancer : npm run test:sandbox
 */
// @ts-expect-error module ESM sans types (app statique)
import {
  addItem, toggleDone, toggleRecurrent, removeItem, resetWeek,
  pendingCount, sortList, shareText, suggestFromInventory,
} from '../public/paniermalin/listes.mjs'

let failures = 0
function check(name: string, cond: boolean, detail = '') {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${!cond && detail ? ` — ${detail}` : ''}`)
  if (!cond) failures++
}

// ─── 1. AJOUT & DÉDOUBLONNAGE ───────────────────────────────────────────────
let list = addItem([], '  Lait  ')
list = addItem(list, 'Pain')
list = addItem(list, 'lait') // doublon (casse/espaces)
check('Ajout : « Lait » nettoyé, doublon « lait » fusionné', list.length === 2 && list[0].name === 'Lait')
check('Ajout : nom vide ignoré', addItem(list, '   ').length === 2)

// ─── 2. COCHER / RÉCURRENT / SUPPRIMER ─────────────────────────────────────
list = toggleDone(list, 'lait')
check('Cocher : Lait acheté, 1 restant', pendingCount(list) === 1)
list = addItem(list, 'Lait') // re-ajout d'un article coché → il se décoche
check('Re-ajout d\'un article coché → décoché', pendingCount(list) === 2)

list = toggleRecurrent(list, 'lait')
check('Récurrent : Lait marqué 🔁', list.find(i => i.id === 'lait')?.recurrent === true)
list = removeItem(addItem(list, 'Chips'), 'chips')
check('Suppression : Chips retiré', !list.some(i => i.id === 'chips'))

// ─── 3. NOUVELLE SEMAINE (liste récurrente) ────────────────────────────────
let semaine = addItem(addItem(addItem([], 'Lait'), 'Pain'), 'Piles')
semaine = toggleRecurrent(semaine, 'lait')
semaine = toggleDone(semaine, 'lait')   // récurrent acheté
semaine = toggleDone(semaine, 'piles')  // ponctuel acheté
semaine = resetWeek(semaine)
check('Nouvelle semaine : le récurrent revient décoché', semaine.find(i => i.id === 'lait')?.done === false)
check('Nouvelle semaine : le ponctuel acheté disparaît', !semaine.some(i => i.id === 'piles'))
check('Nouvelle semaine : le non-acheté reste', semaine.some(i => i.id === 'pain'))

// ─── 4. TRI ─────────────────────────────────────────────────────────────────
let tri = addItem(addItem(addItem([], 'Zeste'), 'Ananas'), 'Miel')
tri = toggleRecurrent(tri, 'miel')
tri = toggleDone(tri, 'zeste')
const sorted = sortList(tri)
check('Tri : récurrent en tête, coché à la fin',
  sorted[0].id === 'miel' && sorted[sorted.length - 1].id === 'zeste')

// ─── 5. PARTAGE FAMILLE (texte lisible sans app) ───────────────────────────
const txt = shareText(tri, 'https://serein-v2.vercel.app/paniermalin')
check('Partage : compte les articles à prendre', txt.includes('(2 à prendre)'))
check('Partage : cases à cocher lisibles (▢/✓) + 🔁 sur les récurrents',
  txt.includes('▢ Miel 🔁') && txt.includes('✓ Zeste'))
check('Partage : lien vers l\'app en pied de liste', txt.includes('paniermalin'))
check('Partage : liste vide → message sympa', shareText([]).includes('vide'))

// ─── 6. SUGGESTIONS DEPUIS L'INVENTAIRE SCANNÉ ─────────────────────────────
const inventory = [
  { name: 'Nutella 400g', purchases: [{ date: '2026-06-01' }, { date: '2026-06-20' }] }, // récurrent
  { name: 'Chips paprika', purchases: [{ date: '2026-06-15' }] },                        // 1 seul achat
  { name: 'Lait demi-écrémé', purchases: [{ date: '2026-05-01' }, { date: '2026-06-01' }] },
]
const listeAvecLait = addItem([], 'Lait demi-écrémé')
const suggs = suggestFromInventory(inventory, listeAvecLait)
check('Suggestions : récurrents de l\'inventaire non déjà listés',
  suggs.length === 1 && suggs[0] === 'Nutella 400g', JSON.stringify(suggs))

console.log(failures === 0 ? '\n✅ TOUS LES TESTS PASSENT' : `\n❌ ${failures} ÉCHEC(S)`)
process.exit(failures === 0 ? 0 : 1)
