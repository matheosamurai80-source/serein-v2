/**
 * Test sandbox — Équipement & Garanties (nouveau pavé).
 * Fin de garantie, urgence, extraction d'un ticket d'achat. Logique pure.
 * Lancer : npm run test:sandbox
 */
import { warrantyEnd, warrantyStatus, extractPurchaseInfo, scaledDimensions, LEGAL_WARRANTY_MONTHS } from '../src/lib/equipment/logic'

let failures = 0
function check(name: string, cond: boolean, detail = '') {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${!cond && detail ? ` — ${detail}` : ''}`)
  if (!cond) failures++
}

// ─── Fin de garantie ────────────────────────────────────────────────────────
check('Garantie légale = 24 mois', LEGAL_WARRANTY_MONTHS === 24)
check('Achat 15/03/2026 → fin 15/03/2028', warrantyEnd('2026-03-15') === '2028-03-15')
check('Débordement de mois géré (31/01 + 24 mois)', warrantyEnd('2026-01-31') === '2028-01-31')
check('Garantie constructeur 36 mois', warrantyEnd('2026-03-15', 36) === '2029-03-15')
check('Date invalide → null', warrantyEnd('pas-une-date') === null)

// ─── Urgence ────────────────────────────────────────────────────────────────
check('Garantie finie il y a longtemps → expiree',
  warrantyStatus({ purchase_date: '2020-01-01', warranty_months: 24 }, '2026-07-17').urgency === 'expiree')
check('Fin dans 30 jours → bientot',
  warrantyStatus({ purchase_date: '2024-08-16', warranty_months: 24 }, '2026-07-17').urgency === 'bientot')
check('Fin dans longtemps → ok',
  warrantyStatus({ purchase_date: '2026-06-01', warranty_months: 24 }, '2026-07-17').urgency === 'ok')
check('daysLeft cohérent (achat 2024-07-17, +24 mois = 2026-07-17 = aujourd\'hui → 0)',
  warrantyStatus({ purchase_date: '2024-07-17', warranty_months: 24 }, '2026-07-17').daysLeft === 0)

// ─── Extraction d'un ticket d'achat ─────────────────────────────────────────
const ticket = `BOULANGER AMIENS
Le 15/03/2026 à 14h32
LAVE-LINGE BOSCH WAN28
TOTAL TTC          449,99 €
Carte bancaire     449,99 €`
const info = extractPurchaseInfo(ticket)
check('Enseigne reconnue : Boulanger', info.retailer === 'Boulanger', JSON.stringify(info))
check('Date d\'achat : 2026-03-15', info.date === '2026-03-15')
check('Prix = le total (449,99)', info.price === 449.99)

check('Enseigne inconnue → retailer null (mais date/prix quand même)',
  (() => { const i = extractPurchaseInfo('Magasin du coin\n03/04/2026\nGrille-pain 24,90'); return i.retailer === null && i.date === '2026-04-03' && i.price === 24.90 })())
check('Rien d\'exploitable → tout null', (() => { const i = extractPurchaseInfo('bonjour'); return !i.retailer && !i.date && !i.price })())

// ─── Redimensionnement de la photo de preuve ───────────────────────────────
check('Photo 4000×3000 → plafonnée à 1400 de large (ratio gardé)',
  (() => { const d = scaledDimensions(4000, 3000); return d.width === 1400 && d.height === 1050 })())
check('Photo portrait 3000×4000 → 1050×1400', (() => { const d = scaledDimensions(3000, 4000); return d.width === 1050 && d.height === 1400 })())
check('Petite image (800×600) inchangée', (() => { const d = scaledDimensions(800, 600); return d.width === 800 && d.height === 600 })())
check('Dimensions nulles → 0×0 (pas de crash)', (() => { const d = scaledDimensions(0, 0); return d.width === 0 && d.height === 0 })())

console.log(failures === 0 ? '\n✅ ÉQUIPEMENT & GARANTIES : TOUS LES TESTS PASSENT' : `\n❌ ${failures} ÉCHEC(S)`)
process.exit(failures === 0 ? 0 : 1)
