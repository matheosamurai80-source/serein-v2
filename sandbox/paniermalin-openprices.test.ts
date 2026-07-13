/**
 * Test sandbox — PanierMalin Open Prices (prix communautaires)
 * Parseur tolérant de la réponse API. Logique pure (le fetch tourne côté client).
 * Lancer : npm run test:sandbox
 */
// @ts-expect-error module ESM sans types (app statique)
import { openPricesUrl, openPricesProductUrl, summarizeCommunityPrices } from '../public/paniermalin/logic.mjs'

let failures = 0
function check(name: string, cond: boolean, detail = '') {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${!cond && detail ? ` — ${detail}` : ''}`)
  if (!cond) failures++
}

check('URL API construite avec le code-barres', openPricesUrl('3017620422003').includes('product_code=3017620422003'))
check('URL page produit Open Prices (contribuer)', openPricesProductUrl('3017620422003') === 'https://prices.openfoodfacts.org/products/3017620422003')

// Forme documentée : { items: [...] }, order_by=-date (le 1er est le plus récent)
const resp = {
  items: [
    { price: 4.29, currency: 'EUR', date: '2026-07-05', location: { osm_name: 'Carrefour City' } },
    { price: 3.99, currency: 'EUR', date: '2026-06-20', location_osm_name: 'Lidl' },
    { price: 4.60, currency: 'EUR', date: '2026-06-01', location: { osm_brand: 'Auchan' } },
    { price: 9.99, currency: 'USD', date: '2026-07-01', location: { osm_name: 'US Store' } }, // filtré (USD)
  ],
}
const s = summarizeCommunityPrices(resp)
check('Compte les prix EUR (USD exclu)', s.count === 3)
check('Plus bas = 3,99', s.lowest === 3.99)
check('Médiane = 4,29', s.median === 4.29)
check('Dernier relevé = le plus récent (Carrefour City, 4,29)',
  s.latest.price === 4.29 && s.latest.store === 'Carrefour City')

// Robustesse
check('Réponse vide → null', summarizeCommunityPrices({ items: [] }) === null)
check('Sans clé items → null', summarizeCommunityPrices({}) === null)
check('Tableau direct accepté', summarizeCommunityPrices([{ price: 2, currency: 'EUR' }])?.lowest === 2)
check('Prix invalide ignoré', summarizeCommunityPrices({ items: [{ price: 'x', currency: 'EUR' }, { price: 5, currency: 'EUR' }] })?.count === 1)
check('Devise absente : acceptée (souvent EUR)', summarizeCommunityPrices({ items: [{ price: 3.5, date: '2026-07-01' }] })?.lowest === 3.5)
check('Médiane sur nombre pair', summarizeCommunityPrices({ items: [{ price: 2, currency: 'EUR' }, { price: 4, currency: 'EUR' }] })?.median === 3)
check('null / réponse pourrie → null (pas de crash)', summarizeCommunityPrices(null) === null && summarizeCommunityPrices({ items: [{}] }) === null)

console.log(failures === 0 ? '\n✅ OPEN PRICES : TOUS LES TESTS PASSENT' : `\n❌ ${failures} ÉCHEC(S)`)
process.exit(failures === 0 ? 0 : 1)
