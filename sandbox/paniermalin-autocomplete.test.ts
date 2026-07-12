/**
 * Test sandbox — PanierMalin liste : saisie semi-automatique (propositions)
 * Autocomplétion pendant la frappe. Logique pure.
 * Lancer : npm run test:sandbox
 */
// @ts-expect-error module ESM sans types (app statique)
import { COMMON_GROCERIES, suggestListItems } from '../public/paniermalin/listes.mjs'

let failures = 0
function check(name: string, cond: boolean, detail = '') {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${!cond && detail ? ` — ${detail}` : ''}`)
  if (!cond) failures++
}

check('Socle de produits courants non vide', COMMON_GROCERIES.length >= 40)

// ─── Frappe → propositions ──────────────────────────────────────────────────
check('« lai » → propose Lait', suggestListItems('lai', COMMON_GROCERIES).includes('Lait'))
check('Requête vide → aucune proposition (pas de bruit)', suggestListItems('', COMMON_GROCERIES).length === 0)
check('Insensible aux accents (« oeuf » → Œufs)', suggestListItems('oeuf', ['Œufs']).includes('Œufs'))
check('Insensible à la casse (« PAI » → Pain)', suggestListItems('PAI', COMMON_GROCERIES).includes('Pain'))

// ─── Priorité « commence par » avant « contient » ───────────────────────────
const pool = ['Pain', 'Pain de mie', 'Copains', 'Épinards']
const r = suggestListItems('pain', pool)
check('« commence par » listé avant « contient »',
  r.indexOf('Pain') < r.indexOf('Copains') && r.includes('Pain de mie'))

// ─── Exclusion de ce qui est déjà dans la liste ─────────────────────────────
check('N’re-propose pas un article déjà présent',
  !suggestListItems('lait', ['Lait', 'Lait d’amande'], ['Lait']).includes('Lait'))
check('Mais propose les variantes non présentes (Lait d’amande)',
  suggestListItems('lait', ['Lait', 'Lait d’amande'], ['Lait']).includes('Lait d’amande'))

// ─── Dédoublonnage + limite ─────────────────────────────────────────────────
check('Dédoublonne les sources', suggestListItems('lait', ['Lait', 'lait', 'LAIT']).length === 1)
check('Respecte la limite', suggestListItems('e', COMMON_GROCERIES, [], 3).length <= 3)
check('Pool vide/undefined ne plante pas', suggestListItems('lait', undefined as unknown as string[]).length === 0)

console.log(failures === 0 ? '\n✅ LISTE AUTOCOMPLÉTION : TOUS LES TESTS PASSENT' : `\n❌ ${failures} ÉCHEC(S)`)
process.exit(failures === 0 ? 0 : 1)
