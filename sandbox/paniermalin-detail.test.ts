/**
 * Test sandbox — Brique 4 : détail Nutri-Score enrichi (méthode BUILD, étape 3)
 * Produit complet vs produit sans données : jamais de crash, message doux.
 * Lancer : npm run test:sandbox
 */
// @ts-expect-error module ESM sans types (app statique)
import { normalizeProduct, productDetail, offProductUrl, NUTRI_EXPLAIN, NOVA_EXPLAIN } from '../public/paniermalin/logic.mjs'

let failures = 0
function check(name: string, cond: boolean, detail = '') {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${!cond && detail ? ` — ${detail}` : ''}`)
  if (!cond) failures++
}

// ─── 1. PRODUIT COMPLET (réponse OFF réaliste) ─────────────────────────────
const off = {
  status: 1,
  product: {
    product_name: 'Pâte à tartiner', brands: 'Nutella', quantity: '400 g',
    nutriscore_grade: 'e', nova_group: 4,
    additives_tags: ['en:e322', 'en:e476'],
    nutriments: {
      'energy-kcal_100g': 539, sugars_100g: 56.3, salt_100g: 0.107,
      fat_100g: 30.9, 'saturated-fat_100g': 10.6, fiber_100g: 3.4, proteins_100g: 6.3,
    },
  },
}
const p = normalizeProduct('3017620422003', off)
check('Normalisation : fibres, protéines, gras totaux extraits',
  p.fiber === 3.4 && p.proteins === 6.3 && p.fat === 30.9)
check('Normalisation : additifs E322/E476 lisibles', JSON.stringify(p.additives) === '["E322","E476"]', JSON.stringify(p.additives))

const d = productDetail(p)
check('Détail : 6 lignes nutritionnelles présentes', d.rows.length === 6, String(d.rows.length))
check('Détail : « dont saturées » distinct des matières grasses',
  d.rows.some((r: { label: string; value: number }) => r.label.includes('saturées') && r.value === 10.6))
check('Détail : hasAny vrai', d.hasAny === true)

// ─── 2. PRODUIT SANS AUCUNE DONNÉE (scanné avant la mise à jour) ───────────
const vieux = { ean: '123', name: 'Vieux produit', nutriscore: null }
const dv = productDetail(vieux)
check('Vieux produit : aucune ligne, hasAny=false (message « non disponibles »)',
  dv.rows.length === 0 && dv.additives.length === 0 && dv.hasAny === false)
check('null → pas de crash', productDetail(null).hasAny === false)

// Produit partiel : seulement le sel
check('Produit partiel : seules les lignes présentes s\'affichent',
  productDetail({ salt: 1.2 }).rows.length === 1)

// ─── 3. LIEN OFFICIEL + TEXTES PÉDAGOGIQUES ────────────────────────────────
check('Lien Open Food Facts construit sur l\'EAN',
  offProductUrl('3017620422003') === 'https://fr.openfoodfacts.org/produit/3017620422003')
check('Explications Nutri-Score et NOVA disponibles (texte statique)',
  NUTRI_EXPLAIN.includes('A') && NUTRI_EXPLAIN.includes('100 g') && NOVA_EXPLAIN.includes('ultra-transformé'))

console.log(failures === 0 ? '\n✅ TOUS LES TESTS PASSENT' : `\n❌ ${failures} ÉCHEC(S)`)
process.exit(failures === 0 ? 0 : 1)
