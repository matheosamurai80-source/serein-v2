/**
 * SEREIN — B1 sandbox : « qu'est-ce que ça me coûte de partir ? »
 * Logique pure, aucune UI. Date injectée pour des tests reproductibles.
 */
import { coutDeSortie, mensualise, joursAvantEcheance, type ExitInput } from '../src/lib/exit/cost'

let pass = 0, fail = 0
function check(label: string, ok: boolean, detail?: string) {
  if (ok) { pass++; console.log(`PASS  ${label}`) }
  else { fail++; console.log(`FAIL  ${label}${detail ? ` — ${detail}` : ''}`) }
}

const TODAY = '2026-09-03'
const base: ExitInput = { service_type: 'other', amount: null, frequency: 'monthly' }

console.log('=== A. MENSUALISATION ===')
check('Mensuel inchangé', mensualise(19.99, 'monthly') === 19.99)
check('Trimestriel divisé par 3', Math.abs(mensualise(60, 'quarterly')! - 20) < 0.01)
check('Annuel divisé par 12', Math.abs(mensualise(240, 'yearly')! - 20) < 0.01)
check('Montant absent → null', mensualise(null, 'monthly') === null)
check('Fréquence ponctuelle → null', mensualise(50, 'oneoff') === null)

console.log('\n=== B. ÉNERGIE : la loi tranche ===')
const energie = coutDeSortie({ ...base, service_type: 'energy', amount: 89, frequency: 'monthly' }, TODAY)
check('Verdict libre', energie.verdict === 'libre')
check('Zéro euro à payer', energie.montant_du === 0)
check('Aucun préavis', energie.preavis_jours === 0)
check('Article L.224-15 cité', energie.article?.includes('L.224-15') === true)
check('Aucune inconnue', energie.inconnues.length === 0)

console.log('\n=== C. TÉLÉCOM : le plafond Chatel ===')
// Engagement 24 mois, souscrit il y a 18 mois, 30 €/mois → 6 mois restants.
// Au-delà du 12e mois : le quart seulement, soit 6 × 30 / 4 = 45 €.
const tel24 = coutDeSortie({
  ...base, service_type: 'telecom', amount: 30, frequency: 'monthly',
  engagement_months: 24, subscribed_at: '2025-03-03',
}, TODAY)
check('Verdict pénalité', tel24.verdict === 'penalite')
check('Quart des sommes restantes appliqué (45 €)', Math.abs((tel24.montant_du ?? 0) - 45) < 1.5, `obtenu ${tel24.montant_du}`)
check('Montant annoncé comme estimation', tel24.estimation === true)
check('Préavis télécom de 10 jours', tel24.preavis_jours === 10)

// Même contrat, mais souscrit il y a 6 mois : totalité due (18 × 30 = 540 €).
const tel6 = coutDeSortie({
  ...base, service_type: 'telecom', amount: 30, frequency: 'monthly',
  engagement_months: 24, subscribed_at: '2026-03-03',
}, TODAY)
check('Avant 12 mois, totalité due (~540 €)', (tel6.montant_du ?? 0) > 500, `obtenu ${tel6.montant_du}`)
check('Conseil : attendre le 12e mois', tel6.action.includes('12e mois'))
check('Le plafond change tout (540 € vs 45 €)', (tel6.montant_du ?? 0) > (tel24.montant_du ?? 0) * 5)

const telLibre = coutDeSortie({
  ...base, service_type: 'telecom', amount: 19.99, frequency: 'monthly', engagement_months: 0,
}, TODAY)
check('Sans engagement → gratuit', telLibre.montant_du === 0)
check('Le code RIO est rappelé', telLibre.action.includes('RIO'))

console.log('\n=== D. ASSURANCE : Hamon vs Chatel ===')
const hamon = coutDeSortie({
  ...base, service_type: 'insurance', amount: 61.4, frequency: 'monthly',
  subscribed_at: '2024-01-15',
}, TODAY)
check('Après 1 an → libre', hamon.verdict === 'libre_avec_preavis')
check('Sans frais', hamon.montant_du === 0)
check('Préavis d\'un mois', hamon.preavis_jours === 30)
check('Loi Hamon citée', hamon.article?.includes('L.113-15-2') === true)

// Souscrit il y a 3 mois, échéance au 15/12, préavis 60 j → fenêtre pas ouverte.
const chatelFerme = coutDeSortie({
  ...base, service_type: 'insurance', amount: 45, frequency: 'monthly',
  subscribed_at: '2026-06-01', anniversary_date: '2026-12-15', cancellation_notice_days: 60,
}, TODAY)
check('Fenêtre encore fermée', chatelFerme.verdict === 'attendre_fenetre')
check('Le nombre de jours est annoncé', (chatelFerme.jours_avant_fenetre ?? 0) > 0)
check('Rien à faire d\'ici là', chatelFerme.action.includes('préviendra'))

// Même contrat, préavis de 120 jours → la fenêtre est déjà ouverte.
const chatelOuvert = coutDeSortie({
  ...base, service_type: 'insurance', amount: 45, frequency: 'monthly',
  subscribed_at: '2026-06-01', anniversary_date: '2026-12-15', cancellation_notice_days: 120,
}, TODAY)
check('Fenêtre ouverte détectée', chatelOuvert.verdict === 'libre_avec_preavis')
check('Fenêtre à 0 jour', chatelOuvert.jours_avant_fenetre === 0)

const avisManquant = coutDeSortie({
  ...base, service_type: 'insurance', amount: 45, frequency: 'monthly',
  subscribed_at: '2026-06-01', anniversary_date: '2026-12-15', avis_echeance_recu: false,
}, TODAY)
check('Avis d\'échéance non reçu → libre immédiatement', avisManquant.verdict === 'libre')
check('Conseil de conserver la preuve', avisManquant.action.includes('preuve'))

console.log('\n=== E. SALLE DE SPORT : l\'engagement qui coûte ===')
const gym = coutDeSortie({
  ...base, service_type: 'gym', amount: 29.9, frequency: 'monthly',
  engagement_months: 12, subscribed_at: '2026-04-03',
}, TODAY)
check('Verdict pénalité', gym.verdict === 'penalite')
check('~7 mois restants chiffrés', (gym.montant_du ?? 0) > 180 && (gym.montant_du ?? 0) < 240, `obtenu ${gym.montant_du}`)
check('Le motif légitime est signalé', gym.action.includes('motif légitime'))

console.log('\n=== F. STREAMING ET RÉSILIATION EN 3 CLICS ===')
const strEnLigne = coutDeSortie({
  ...base, service_type: 'streaming', amount: 13.49, frequency: 'monthly',
  engagement_months: 0, souscrit_en_ligne: true,
}, TODAY)
check('Verdict libre', strEnLigne.verdict === 'libre')
check('Résiliation en ligne obligatoire signalée', strEnLigne.resiliation_en_ligne_obligatoire === true)
check('Article L.215-1-1 cité', strEnLigne.article?.includes('L.215-1-1') === true)
check('Ni appel ni courrier imposable', strEnLigne.action.includes('Aucun appel'))

const strBoutique = coutDeSortie({
  ...base, service_type: 'streaming', amount: 13.49, frequency: 'monthly',
  engagement_months: 0, souscrit_en_ligne: false,
}, TODAY)
check('Souscrit hors ligne → pas de bouton garanti', strBoutique.resiliation_en_ligne_obligatoire === false)

console.log('\n=== G. HONNÊTETÉ : on dit « je ne sais pas » ===')
const vide = coutDeSortie({ ...base, service_type: 'other' }, TODAY)
check('Verdict inconnu', vide.verdict === 'inconnu')
check('Aucun montant inventé', vide.montant_du === null)
check('Les inconnues sont listées', vide.inconnues.length >= 2)

const telSansDate = coutDeSortie({
  ...base, service_type: 'telecom', amount: 30, frequency: 'monthly', engagement_months: 24,
}, TODAY)
check('Engagement sans date de départ → inconnu', telSansDate.verdict === 'inconnu')
check('Aucun montant inventé non plus', telSansDate.montant_du === null)

const assuranceSansMontant = coutDeSortie({
  ...base, service_type: 'insurance', amount: null, frequency: 'monthly',
  subscribed_at: '2024-01-15',
}, TODAY)
check('Montant absent n\'empêche pas de dire « c\'est gratuit »', assuranceSansMontant.montant_du === 0)

console.log('\n=== H. ÉCHÉANCE : passage d\'année ===')
check('Échéance déjà passée → reportée à l\'an prochain',
  (joursAvantEcheance('2026-01-15', TODAY) ?? 0) > 100)
check('Échéance à venir cette année',
  (joursAvantEcheance('2026-12-15', TODAY) ?? 0) < 120)
check('Date invalide → null', joursAvantEcheance('pas-une-date', TODAY) === null)

console.log('\n=== EXEMPLE DE SORTIE (télécom 24 mois, 18e mois) ===')
console.log(JSON.stringify(tel24, null, 2))

console.log(`\n=== RÉSULTAT : ${pass} PASS / ${fail} FAIL ===`)
if (fail > 0) process.exit(1)
