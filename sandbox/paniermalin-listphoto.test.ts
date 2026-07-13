/**
 * Test sandbox — PanierMalin : photo d'une liste de courses → articles
 * Nettoyage des puces/cases/numéros, filtrage du bruit. Logique pure.
 * Lancer : npm run test:sandbox
 */
// @ts-expect-error module ESM sans types (app statique)
import { parseShoppingListPhoto } from '../public/paniermalin/listes.mjs'

let failures = 0
function check(name: string, cond: boolean, detail = '') {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${!cond && detail ? ` — ${detail}` : ''}`)
  if (!cond) failures++
}

const photo = [
  'Ma liste',
  '- Lait',
  '• Pain',
  '2x Yaourts',
  '3. Pommes',
  '☐ Café',
  '   ',
  'Beurre',
  'Lait',        // doublon
  '12,50',       // bruit (montant)
]
const r = parseShoppingListPhoto(photo.join('\n'))

check('Puce « - » retirée (Lait)', r.includes('Lait'))
check('Puce « • » retirée (Pain)', r.includes('Pain'))
check('Quantité « 2x » retirée (Yaourts)', r.includes('Yaourts'))
check('Numéro « 3. » retiré (Pommes)', r.includes('Pommes'))
check('Case « ☐ » retirée (Café)', r.includes('Café'))
check('Ligne simple gardée (Beurre)', r.includes('Beurre'))
check('Doublon « Lait » fusionné', r.filter((x: string) => x.toLowerCase() === 'lait').length === 1)
check('Ligne vide ignorée', !r.includes(''))
check('Bruit « 12,50 » (aucune lettre) ignoré', !r.some((x: string) => x.includes('12')))
check('Texte vide → liste vide', parseShoppingListPhoto('').length === 0)
check('null → liste vide (pas de crash)', parseShoppingListPhoto(null as unknown as string).length === 0)

console.log(failures === 0 ? '\n✅ PHOTO DE LISTE : TOUS LES TESTS PASSENT' : `\n❌ ${failures} ÉCHEC(S)`)
process.exit(failures === 0 ? 0 : 1)
