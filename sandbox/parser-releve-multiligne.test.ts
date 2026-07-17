/**
 * Test sandbox — parseur de relevé : format MULTI-LIGNES (Société Générale & co).
 * Cas terrain (Juju) : « relevé bloquant ». Deux bugs corrigés :
 *  1) deux dates par ligne (Date + Valeur) → l'année « 2026 » devenait le marchand ;
 *  2) prélèvements éclatés sur plusieurs lignes (en-tête daté, DE:, MOTIF, … puis
 *     le montant plus bas) → Orange/AXA/Canal jamais captés.
 * Lancer : npm run test:sandbox
 */
import { parseStatement } from '../src/lib/pdf/parser'

let failures = 0
function check(name: string, cond: boolean, detail = '') {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${!cond && detail ? ` — ${detail}` : ''}`)
  if (!cond) failures++
}

// Transcription fidèle d'un extrait de relevé Société Générale
const sg = `SOLDE PRÉCÉDENT AU 25/04/2026679,93
27/04/2026   27/04/2026   CARTE X4179 24/04 CARREFOUR CONTACT7,00
27/04/2026   27/04/2026   PRELEVEMENT EUROPEEN 2400723572
DE: ORANGE SA-ORANGE
ID: FR18ZZZ002305
MOTIF: Votre abonnement mobile: 06XXXXX008
REF: 161376887385842977133892746950
MANDAT M0061758588
22,33
04/05/2026   04/05/2026   PRELEVEMENT EUROPEEN 3015788938
DE: AXA ASSURANCES IARD MUTUELLE
47,99
11/05/2026   11/05/2026   CARTE X4239 09/05 E.LECLERC33,80`

const { transactions } = parseStatement(sg, 'test')
const byMerchant = (m: string) => transactions.find(t => t.merchant.toLowerCase() === m.toLowerCase())

check('AUCUN marchand n’est une année « 2026 » (bug principal)',
  !transactions.some(t => /^\d+$/.test(t.merchant)), JSON.stringify(transactions.map(t => t.merchant)))
check('Orange capté depuis le bloc multi-lignes (DE: ORANGE)', !!byMerchant('Orange'))
check('Orange : montant 22,33 (pris plusieurs lignes plus bas)', byMerchant('Orange')?.amount === 22.33)
check('Orange : date de l’en-tête (2026-04-27)', byMerchant('Orange')?.date === '2026-04-27')
check('AXA capté depuis son bloc (DE: AXA…)', !!byMerchant('AXA') && byMerchant('AXA')?.amount === 47.99)
check('Carte carrefour lue (montant collé 7,00)', byMerchant('Carrefour')?.amount === 7)
check('Carte E.Leclerc lue (X#### + 2e date retirés)', !!transactions.find(t => /leclerc/i.test(t.merchant) && t.amount === 33.80))

console.log(failures === 0 ? '\n✅ RELEVÉ MULTI-LIGNES : TOUS LES TESTS PASSENT' : `\n❌ ${failures} ÉCHEC(S)`)
process.exit(failures === 0 ? 0 : 1)
