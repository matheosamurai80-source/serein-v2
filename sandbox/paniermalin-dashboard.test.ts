/**
 * Test sandbox — PanierMalin Accueil (tableau de bord d'économies)
 * economyToday, bonnes affaires, à racheter. Logique pure.
 * Lancer : npm run test:sandbox
 */
// @ts-expect-error module ESM sans types (app statique)
import { dashboardStats } from '../public/paniermalin/logic.mjs'

let failures = 0
function check(name: string, cond: boolean, detail = '') {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${!cond && detail ? ` — ${detail}` : ''}`)
  if (!cond) failures++
}

const nutella = {
  ean: '1', name: 'Nutella', quantity: '1 kg', price: 4.99,
  purchases: [{ date: '2026-06-01', price: 5.69 }, { date: '2026-06-15', price: 5.49 }, { date: '2026-07-01', price: 4.99 }],
}
const repere = { ean: '2', name: 'Pâte Repère', quantity: '1 kg', price: 3.5, purchases: [{ date: '2026-07-01', price: 3.5 }] }
const cafe = {
  ean: '3', name: 'Café', quantity: '250 g', price: 3.2,
  purchases: [{ date: '2026-05-01', price: 3.1 }, { date: '2026-06-01', price: 3.2 }],
}

const s = dashboardStats([nutella, repere, cafe])
check('Économies du jour = 0,60 € (Nutella sous son habituel)', s.economyToday === 0.6, String(s.economyToday))
check('Bonne affaire listée : Nutella', s.deals.some((d: { name: string }) => d.name === 'Nutella'))
check('Café (3,20 ≥ habituel 3,10) : pas une bonne affaire', !s.deals.some((d: { name: string }) => d.name === 'Café'))
check('À racheter inclut les récurrents (Nutella, Café)',
  s.toRebuy.includes('Nutella') && s.toRebuy.includes('Café'))
check('À racheter exclut le non-récurrent (Repère, 1 achat)', !s.toRebuy.includes('Pâte Repère'))
check('Nombre de produits suivis = 3', s.trackedCount === 3)

// ─── Cas vides ──────────────────────────────────────────────────────────────
const empty = dashboardStats([])
check('Inventaire vide : économies 0', empty.economyToday === 0)
check('Inventaire vide : aucune affaire, aucun rachat', empty.deals.length === 0 && empty.toRebuy.length === 0)
check('dashboardStats(undefined) ne plante pas', dashboardStats(undefined).trackedCount === 0)

// ─── Tri des affaires par économie décroissante ─────────────────────────────
const big = { ean: '4', name: 'Gros', quantity: '1 kg', price: 2, purchases: [{ date: '2026-06-01', price: 10 }, { date: '2026-07-01', price: 2 }] }
const s2 = dashboardStats([nutella, big])
check('Affaires triées par économie décroissante (Gros avant Nutella)',
  s2.deals[0].name === 'Gros' && s2.deals[0].saving > s2.deals[1].saving)

console.log(failures === 0 ? '\n✅ ACCUEIL PANIERMALIN : TOUS LES TESTS PASSENT' : `\n❌ ${failures} ÉCHEC(S)`)
process.exit(failures === 0 ? 0 : 1)
