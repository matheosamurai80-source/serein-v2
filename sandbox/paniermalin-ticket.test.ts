/**
 * Test sandbox — Brique 3 : parseur de ticket de caisse (méthode BUILD, étape 3)
 * Texte OCR → lignes (nom, prix) ; totaux, TVA, paiements, n° ticket exclus.
 * Lancer : npm run test:sandbox
 */
// @ts-expect-error module ESM sans types (app statique)
import { parseTicketText, suggestMatch } from '../public/paniermalin/logic.mjs'

let failures = 0
function check(name: string, cond: boolean, detail = '') {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${!cond && detail ? ` — ${detail}` : ''}`)
  if (!cond) failures++
}
type Ligne = { label: string; price: number }

// ─── 1. TICKET SUPERMARCHÉ CLASSIQUE ────────────────────────────────────────
const t1: Ligne[] = parseTicketText(`
CARREFOUR MARKET
12 RUE DE LA PAIX 60000 BEAUVAIS
COCA COLA 1.5L      1,89
PAIN DE MIE HARRYS  2,35
2 X YAOURT NATURE   1,58
REMISE FIDELITE    -0,50
SOUS-TOTAL          5,32
TOTAL A PAYER       5,32
CB EMV              5,32
TVA 5,5%            0,28
TICKET N 4521 CAISSE 03
MERCI DE VOTRE VISITE
`)
check('Ticket 1 : exactement 3 produits extraits', t1.length === 3, JSON.stringify(t1))
check('Ticket 1 : virgule décimale lue (1,89 → 1.89)', t1[0]?.price === 1.89 && t1[0]?.label === 'COCA COLA 1.5L')
check('Ticket 1 : quantité « 2 X » retirée du libellé', t1[2]?.label === 'YAOURT NATURE' && t1[2]?.price === 1.58)
check('Ticket 1 : total, sous-total, CB, TVA, n° ticket, remise négative exclus',
  !t1.some(l => /total|cb|tva|ticket|remise/i.test(l.label)))

// ─── 2. TICKET AVEC POINTS DÉCIMAUX ET € ────────────────────────────────────
const t2: Ligne[] = parseTicketText(`
LIDL
LAIT DEMI-ECREME 1L .......... 0.98 €
NUTELLA 400G                    4.50 €
PRIX AU KG 11.25 €/KG
3 ARTICLES                      5.48
ESPECES                        10.00
RENDU MONNAIE                   4.52
`)
check('Ticket 2 : 2 produits (points décimaux + €)', t2.length === 2, JSON.stringify(t2))
check('Ticket 2 : pointillés de mise en page nettoyés', t2[0]?.label === 'LAIT DEMI-ECREME 1L')
check('Ticket 2 : « prix au kg », compte d\'articles, espèces, rendu exclus',
  !t2.some(l => /prix|articles|espece|rendu/i.test(l.label)))

// ─── 3. BRUIT OCR ───────────────────────────────────────────────────────────
const t3: Ligne[] = parseTicketText(`
@@##%%
1,89
XY 2,00
CAFE MOULU BIO 250G 3,79
SIRET 123 456 789 00012
TEL 03 44 00 00 00
`)
check('Bruit OCR : prix sans libellé, libellé trop court, SIRET, TEL exclus — seul le café reste',
  t3.length === 1 && t3[0]?.label === 'CAFE MOULU BIO 250G', JSON.stringify(t3))

// ─── 4. GARDE-FOUS ──────────────────────────────────────────────────────────
check('Texte vide / null → aucune ligne, pas de crash',
  parseTicketText('').length === 0 && parseTicketText(null).length === 0)
check('Prix improbables (0,01 € ou 900 €) écartés',
  parseTicketText('VIS 0,01\nTELE OLED 900,00').length === 0)

// ─── 5. SUGGESTION D'ASSOCIATION (aide, jamais automatique) ─────────────────
const inventory = [
  { ean: '3017620422003', name: 'Nutella pâte à tartiner 400g' },
  { ean: '3560070976478', name: 'Lait demi-écrémé' },
]
check('Suggestion : « NUTELLA 400G » → produit Nutella de l\'inventaire',
  suggestMatch(inventory, 'NUTELLA 400G') === '3017620422003')
check('Suggestion : accents ignorés (« LAIT DEMI-ECREME 1L » → lait demi-écrémé)',
  suggestMatch(inventory, 'LAIT DEMI-ECREME 1L') === '3560070976478')
check('Suggestion : rien de proche → null (pas de faux positif)',
  suggestMatch(inventory, 'COCA COLA') === null)

console.log(failures === 0 ? '\n✅ TOUS LES TESTS PASSENT' : `\n❌ ${failures} ÉCHEC(S)`)
process.exit(failures === 0 ? 0 : 1)
