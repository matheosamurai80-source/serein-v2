/**
 * Test sandbox — PanierMalin sources produit (famille Open Food Facts)
 * Scan non-alimentaire (hygiène/divers) : Vania & co. Logique pure.
 * Lancer : npm run test:sandbox
 */
// @ts-expect-error module ESM sans types (app statique)
import { PRODUCT_API_HOSTS, productApiUrl, pickProduct } from '../public/paniermalin/logic.mjs'

let failures = 0
function check(name: string, cond: boolean, detail = '') {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${!cond && detail ? ` — ${detail}` : ''}`)
  if (!cond) failures++
}

// ─── SOURCES ────────────────────────────────────────────────────────────────
check('3 sources (alimentaire, hygiène, divers)', PRODUCT_API_HOSTS.length === 3)
check('Open Beauty Facts inclus (Vania, hygiène)', PRODUCT_API_HOSTS.includes('world.openbeautyfacts.org'))
check('Open Products Facts inclus (le reste)', PRODUCT_API_HOSTS.includes('world.openproductsfacts.org'))
check('URL construite correctement',
  productApiUrl('world.openbeautyfacts.org', '3178040...').startsWith('https://world.openbeautyfacts.org/api/v2/product/'))

// ─── SÉLECTION MULTI-SOURCES ────────────────────────────────────────────────
const unknown = { status: 0 }
const beauty = { status: 1, product: { product_name: 'Serviettes Vania', brands: 'Vania', quantity: '14 pièces' } }
const food = { status: 1, product: { product_name: 'Nutella', brands: 'Ferrero', quantity: '400 g', nutriscore_grade: 'e' } }

check('Inconnu en alimentaire → repêché en hygiène (Vania)',
  pickProduct('x', [unknown, beauty])?.name === 'Serviettes Vania')
check('Produit hygiène sans Nutri-Score : accepté (nutriscore null)',
  (() => { const p = pickProduct('x', [beauty]); return !!p && p.nutriscore === null })())
check('Aliment trouvé dès la 1re source', pickProduct('x', [food, beauty])?.name === 'Nutella')
check('Aucune source ne connaît → null', pickProduct('x', [unknown, unknown, unknown]) === null)
check('Réponses vides → null (pas de crash)', pickProduct('x', []) === null)

console.log(failures === 0 ? '\n✅ SOURCES PRODUIT : TOUS LES TESTS PASSENT' : `\n❌ ${failures} ÉCHEC(S)`)
process.exit(failures === 0 ? 0 : 1)
