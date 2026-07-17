/**
 * Test sandbox — extraction d'un abonnement depuis un document (le « + » → subscriptions).
 * Texte OCR d'une facture/prélèvement → brouillon { name, amount, frequency }.
 * Méthode BUILD : logique pure, PASS/FAIL, AVANT l'UI.
 * Lancer : npm run test:sandbox
 */
import { extractSubscriptionDraft, looksLikeStatement } from '../src/lib/subscriptions/extract'

let failures = 0
function check(name: string, cond: boolean, detail = '') {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${!cond && detail ? ` — ${detail}` : ''}`)
  if (!cond) failures++
}

const netflix = `NETFLIX
Facture du 01/07/2026
Abonnement Standard avec pub
Montant à payer : 13,49 € TTC
Prochain prélèvement le 01/08/2026`
const n = extractSubscriptionDraft(netflix)
check('Netflix : nom canonique', n?.name === 'Netflix', JSON.stringify(n))
check('Netflix : montant 13,49', n?.amount === 13.49)
check('Netflix : fréquence mensuelle (défaut)', n?.frequency === 'monthly')

const edf = `EDF
Échéance de votre contrat d'électricité
Prélèvement mensuel automatique
Montant total : 89,30 €`
const e = extractSubscriptionDraft(edf)
check('EDF : nom + montant 89,30', e?.name === 'EDF' && e?.amount === 89.30, JSON.stringify(e))

const spotify = `Spotify Premium
Abonnement annuel
Montant : 99,00 €`
const s = extractSubscriptionDraft(spotify)
check('Spotify : fréquence annuelle détectée', s?.frequency === 'yearly', JSON.stringify(s))
check('Spotify : montant 99,00', s?.amount === 99)

// Fournisseur inconnu → on retombe sur la 1re ligne « nom » plausible
const gym = `SALLE DE SPORT FITPARK
Cotisation mensuelle
Montant à payer : 29,90 €`
const g = extractSubscriptionDraft(gym)
check('Inconnu : nom canonique connu (Fitness Park) OU 1re ligne', !!g && g.amount === 29.90 && g.name.length > 0, JSON.stringify(g))

// Choisit le montant de la ligne pertinente, pas un chiffre parasite
const bruit = `RELEVE
Votre référence 2024
Sous-total 10,00
Montant à payer : 24,99 €`
const b = extractSubscriptionDraft(bruit)
check('Montant pertinent (24,99) et pas la référence/sous-total', b?.amount === 24.99, JSON.stringify(b))

// Aucun montant → null (on n'invente pas)
check('Sans montant → null', extractSubscriptionDraft('Bonjour, lettre sans aucun prix.') === null)
check('null → null (pas de crash)', extractSubscriptionDraft(null as unknown as string) === null)

// ─── relevé bancaire : ce n'est PAS un abonnement unique → à analyser en entier
const releve = `RELEVE DE COMPTE — Juillet 2026
05/07/2026 PRLV SEPA NETFLIX.COM        -13,49
09/07/2026 CB CARREFOUR MARKET          -42,10
12/07/2026 PRLV SEPA SPOTIFY            -10,99
15/07/2026 VIR SALAIRE                 +2100,00
20/07/2026 PRLV SEPA ORANGE SA          -39,99
SOLDE CREDITEUR                         1523,44`
check('relevé bancaire reconnu comme relevé (multi-opérations)', looksLikeStatement(releve) === true)
check('facture Orange seule = PAS un relevé', looksLikeStatement(`ORANGE\nFacture du 01/07/2026\nMontant à payer : 39,99 € TTC`) === false)
check('facture Netflix seule = PAS un relevé', looksLikeStatement(netflix) === false)
check('texte vide → pas un relevé', looksLikeStatement('') === false)

console.log(failures === 0 ? '\n✅ EXTRACTION ABONNEMENT : TOUS LES TESTS PASSENT' : `\n❌ ${failures} ÉCHEC(S)`)
process.exit(failures === 0 ? 0 : 1)
