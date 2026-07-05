/**
 * Test sandbox — PanierMalin : liste de courses, récurrents, partage famille
 * (méthode BUILD, étape 3). Retour utilisateur 2026-07-05 : « pas de liste
 * achat, partager famille, liste récurrente ».
 * Lancer : npm run test:sandbox
 */
// @ts-expect-error module ESM sans types (app statique)
import {
  addItem, toggleDone, toggleRecurrent, removeItem, resetWeek,
  pendingCount, sortList, shareText, suggestFromInventory, visible,
  genShareCode, isValidShareCode, normalizeShareCode, mergeLists, sameLists,
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
check('Suppression : Chips invisible (pierre tombale pour la synchro)',
  !visible(list).some((i: { id: string }) => i.id === 'chips')
  && list.some((i: { id: string; deleted?: boolean }) => i.id === 'chips' && i.deleted))
check('Re-ajout d\'un article supprimé → il revient', visible(addItem(list, 'Chips')).some((i: { id: string }) => i.id === 'chips'))

// ─── 3. NOUVELLE SEMAINE (liste récurrente) ────────────────────────────────
let semaine = addItem(addItem(addItem([], 'Lait'), 'Pain'), 'Piles')
semaine = toggleRecurrent(semaine, 'lait')
semaine = toggleDone(semaine, 'lait')   // récurrent acheté
semaine = toggleDone(semaine, 'piles')  // ponctuel acheté
semaine = resetWeek(semaine)
check('Nouvelle semaine : le récurrent revient décoché', semaine.find(i => i.id === 'lait')?.done === false)
check('Nouvelle semaine : le ponctuel acheté disparaît', !visible(semaine).some((i: { id: string }) => i.id === 'piles'))
check('Nouvelle semaine : le non-acheté reste', visible(semaine).some((i: { id: string }) => i.id === 'pain'))

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

// ─── 7. SYNCHRO FAMILLE : code + fusion multi-téléphones ───────────────────
const code = genShareCode()
check('Code de partage : 8 caractères sans ambiguïté (pas de O/0/I/1)',
  isValidShareCode(code) && !/[O0I1L]/.test(code), code)
check('Code : « k7wm-p4qz » saisi à la main → normalisé', normalizeShareCode('k7wm-p4qz') === 'K7WMP4QZ')
check('Code : « bonjour » refusé', !isValidShareCode('bonjour'))

// Téléphone A coche « Lait » (t=200) pendant que Téléphone B le supprime (t=100)
const telA = toggleDone(addItem([], 'Lait', { now: 50 }), 'lait', 200)
const telB = removeItem(addItem([], 'Lait', { now: 50 }), 'lait', 100)
const fusion = mergeLists(telA, telB)
check('Fusion : la modification la plus récente gagne (coché à t=200 > supprimé à t=100)',
  fusion.find((i: { id: string }) => i.id === 'lait')?.done === true
  && !fusion.find((i: { id: string; deleted?: boolean }) => i.id === 'lait')?.deleted)

// Chacun ajoute un article différent → union
const fusionUnion = mergeLists(addItem([], 'Pain', { now: 10 }), addItem([], 'Œufs', { now: 20 }))
check('Fusion : articles ajoutés des deux côtés réunis', fusionUnion.length === 2)
check('sameLists : détecte l\'égalité indépendamment de l\'ordre',
  sameLists(fusionUnion, [...fusionUnion].reverse()) && !sameLists(fusionUnion, telA))

console.log(failures === 0 ? '\n✅ TOUS LES TESTS PASSENT' : `\n❌ ${failures} ÉCHEC(S)`)
process.exit(failures === 0 ? 0 : 1)
