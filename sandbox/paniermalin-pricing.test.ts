/**
 * Test sandbox — PanierMalin « Prix Intelligent » (l'effet waouh)
 * Le vrai prix payé : carte, cagnotte, €/kg, prix habituel, économie,
 * alternative la plus rentable. Logique pure, données côté consommateur.
 * Lancer : npm run test:sandbox
 */
// @ts-expect-error module ESM sans types (app statique)
import { smartPrice, pricePerKg, bestAlternative } from '../public/paniermalin/logic.mjs'

let failures = 0
function check(name: string, cond: boolean, detail = '') {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${!cond && detail ? ` — ${detail}` : ''}`)
  if (!cond) failures++
}

// ─── €/kg ───────────────────────────────────────────────────────────────────
check('€/kg sur 1 kg = prix', pricePerKg(3.99, '1 kg') === 3.99)
check('€/kg sur 400 g (4,99 → 12,48/kg)', pricePerKg(4.99, '400 g') === 12.48)
check('€/kg sur pack « 6 x 1,5 L » (4,50 → 0,5/L·kg)', pricePerKg(4.5, '6 x 1,5 L') === 0.5)
check('€/kg indéterminé si quantité illisible', pricePerKg(3, 'sachet') === null)

// ─── Décomposition complète ─────────────────────────────────────────────────
const r = smartPrice({
  price: 4.99, quantity: '1 kg', loyaltyPct: 10, cagnotte: 0.5,
  history: [{ price: 5.69 }, { price: 5.49 }],
  alternatives: [{ name: 'Marque repère', perKg: 3.5 }, { name: 'Bio cher', perKg: 6 }],
})
check('Prix facial conservé', r.facial === 4.99)
check('Prix carte = facial −10 % (4,49)', r.cardPrice === 4.49)
check('Prix après cagnotte 0,50 € (3,99)', r.afterCagnotte === 3.99)
check('Vrai prix payé = après cagnotte', r.realPaid === 3.99)
check('€/kg du vrai prix (1 kg → 3,99)', r.perKg === 3.99)
check('Prix habituel = moyenne perso (5,59)', r.habitual === 5.59)
check('Économie du jour = habituel − payé (1,60)', r.economy === 1.6)
check('Drapeaux fidélité/cagnotte', r.hasLoyalty === true && r.hasCagnotte === true)
check('Meilleure alternative = Marque repère (3,50/kg)', r.bestAlternative?.name === 'Marque repère' && r.bestAlternative?.perKg === 3.5)
check('Économie alternative calculée (3,99 − 3,50 = 0,49)', r.bestAlternative?.saving === 0.49)

// ─── Cas limites ────────────────────────────────────────────────────────────
const noAdv = smartPrice({ price: 2, quantity: '500 g' })
check('Sans avantage : payé = facial', noAdv.realPaid === 2 && noAdv.hasLoyalty === false)
check('Sans historique : pas de prix habituel ni économie', noAdv.habitual === null && noAdv.economy === 0)
check('Pas d\'alternative si aucune moins chère',
  smartPrice({ price: 2, quantity: '1 kg', alternatives: [{ name: 'plus cher', perKg: 5 }] }).bestAlternative === null)
check('Cagnotte ne rend jamais négatif', smartPrice({ price: 1, quantity: '1 kg', cagnotte: 5 }).realPaid === 0)
check('Remise plafonnée à 90 %', smartPrice({ price: 10, quantity: '1 kg', loyaltyPct: 300 }).cardPrice === 1)
check('bestAlternative ignore un prix courant nul', bestAlternative(0, [{ name: 'x', perKg: 1 }]) === null)

console.log(failures === 0 ? '\n✅ PRIX INTELLIGENT : TOUS LES TESTS PASSENT' : `\n❌ ${failures} ÉCHEC(S)`)
process.exit(failures === 0 ? 0 : 1)
