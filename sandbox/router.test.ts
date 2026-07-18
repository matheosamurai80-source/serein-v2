/**
 * Test sandbox — Routeur universel (Brique 6 candidate de la fusion).
 * Un document (texte OCR) → son type, sans que l'utilisateur choisisse un service.
 * Méthode BUILD : logique pure, PASS/FAIL, AVANT toute UI.
 * Lancer : npm run test:sandbox
 */
import { routerDocument, scoreDocument, ROUTE_TO_SERVICE, describeDestination } from '../src/lib/router/logic'

let failures = 0
function check(name: string, cond: boolean, detail = '') {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${!cond && detail ? ` — ${detail}` : ''}`)
  if (!cond) failures++
}

// ─── 1. TICKET DE CAISSE → COURSES (le vrai ticket Leclerc de Juju) ─────────
const ticket = `Ticket du 23/06/2026
>> EPICERIE
RECEPTION 380G                3.57   1
PZ TOMATES CUISINEES 650G     2.48   1
PAINS AU CHOCOLAT.360G
        2 X 1.89€             3.78   1
>> CREMERIE
CAMEMBERT PRESIDENT           3.68   1
SKYR NATURE 850G MR           2.69   1
TOTAL                        16.20`
check('ticket de caisse → courses', routerDocument(ticket) === 'courses', JSON.stringify(scoreDocument(ticket)))
check('courses route vers PanierMalin', ROUTE_TO_SERVICE.courses === 'paniermalin')

// ─── 2. FACTURE / ABONNEMENT → SEREIN ───────────────────────────────────────
const facture = `NETFLIX
Facture du 01/07/2026
Abonnement Standard avec pub — mensualité
Montant à payer : 13,49 € TTC
Référence client : 4821-7734
Prochain prélèvement le 01/08/2026`
check('facture d abonnement → abonnement', routerDocument(facture) === 'abonnement', JSON.stringify(scoreDocument(facture)))
check('abonnement route vers Serein', ROUTE_TO_SERVICE.abonnement === 'serein')

const releveEDF = `EDF
Echéance de votre contrat d'électricité
Prélèvement automatique — IBAN se terminant par 7788
Montant total : 89,30 €`
check('facture EDF (prélèvement/échéance) → abonnement', routerDocument(releveEDF) === 'abonnement', JSON.stringify(scoreDocument(releveEDF)))

// ─── 3. COURRIER → DÉMARCHES ────────────────────────────────────────────────
const hausse = `AXA Assurances
Madame, Monsieur,
Nous vous informons de la revalorisation de votre cotisation d'assurance
habitation au 1er janvier. Cette augmentation tarifaire prend effet le 01/01.`
check('courrier hausse de tarif → demarche', routerDocument(hausse) === 'demarche', JSON.stringify(scoreDocument(hausse)))
check('demarche route vers Après', ROUTE_TO_SERVICE.demarche === 'apres')

const deces = `Madame, Monsieur,
Suite au décès de M. Durand, en qualité d'ayant droit dans le cadre de la
succession, nous vous prions de bien vouloir résilier le contrat.
Veuillez agréer nos salutations.`
check('courrier de décès/succession → demarche', routerDocument(deces) === 'demarche', JSON.stringify(scoreDocument(deces)))

const amende = `AVIS DE CONTRAVENTION
Le véhicule dont le certificat d'immatriculation est établi à votre nom a fait l'objet d'un contrôle.
Conduite d'un véhicule à une vitesse excessive. Montant de l'amende forfaitaire : 135 €.
www.antai.gouv.fr est l'unique site officiel pour vos démarches.`
check('avis de contravention (amende) → demarche', routerDocument(amende) === 'demarche', JSON.stringify(scoreDocument(amende)))

const demenagement = `Objet : changement d'adresse
Suite à mon déménagement, je vous adresse ce courrier recommandé afin de
mettre à jour mon adresse. Le changement prend effet le 15/09.`
check('courrier de déménagement → demarche', routerDocument(demenagement) === 'demarche', JSON.stringify(scoreDocument(demenagement)))

// ─── 4. GARDE-FOUS : trop faible / ambigu / vide → inconnu ──────────────────
check('texte vide → inconnu', routerDocument('') === 'inconnu')
check('null → inconnu (pas de crash)', routerDocument(null as unknown as string) === 'inconnu')
check('note quelconque sans signal → inconnu', routerDocument('Penser à rappeler Julien demain matin.') === 'inconnu')

// Extensibilité : un nouveau service = une règle en plus, pas un écran.
check('scoreDocument expose les 3 classes routables',
  ['courses', 'abonnement', 'demarche'].every(k => k in scoreDocument('x')))

// ─── 4bis. SAISIE COURTE (« en 2-3 mots » — le chemin fiable du « + ») ──────
check('« amende » seul → demarche', routerDocument('amende') === 'demarche')
check('« taxe fonciere » → demarche', routerDocument('taxe fonciere') === 'demarche')
check('« facture Netflix » → abonnement', routerDocument('facture Netflix') === 'abonnement')
check('« resiliation Orange » → demarche', routerDocument('resiliation Orange') === 'demarche')

// ─── 5. ORIENTATION (type → destination pour le bouton « + ») ───────────────
check('courses → destination PanierMalin', describeDestination('courses').href === '/paniermalin' && describeDestination('courses').service === 'Courses')
check('abonnement → destination /analyse', describeDestination('abonnement').href === '/analyse')
check('demarche → destination /resiliation', describeDestination('demarche').href === '/resiliation')
check('inconnu → pas de href (l utilisateur choisit)', describeDestination('inconnu').href === '' && describeDestination('inconnu').cta === '')
check('chaque destination a un emoji et une phrase', (['courses', 'abonnement', 'demarche', 'inconnu'] as const).every(t => {
  const d = describeDestination(t); return d.emoji.length > 0 && d.headline.length > 0
}))

console.log(failures === 0 ? '\n✅ ROUTEUR : TOUS LES TESTS PASSENT' : `\n❌ ${failures} ÉCHEC(S)`)
process.exit(failures === 0 ? 0 : 1)
