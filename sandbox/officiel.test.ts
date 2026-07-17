/**
 * Test sandbox — Documents officiels : reconnaître le type + le lien officiel.
 * Logique pure, PASS/FAIL, avant l'UI. Liens .gouv/officiels uniquement.
 * Lancer : npm run test:sandbox
 */
import { detectOfficialDoc } from '../src/lib/officiel/logic'

let failures = 0
function check(name: string, cond: boolean, detail = '') {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${!cond && detail ? ` — ${detail}` : ''}`)
  if (!cond) failures++
}

check('Amende → ANTAI', (() => {
  const d = detectOfficialDoc('AVIS DE CONTRAVENTION\nAmende forfaitaire : 135 €\nExcès de vitesse')
  return d?.type === 'amende' && d.url.includes('antai.gouv.fr')
})())
check('Avis d’impôt → impots.gouv', (() => {
  const d = detectOfficialDoc('DGFIP\nAvis d’impôt sur le revenu 2026\nMontant à payer : 1 240 €')
  return d?.type === 'impot' && d.url.includes('impots.gouv.fr')
})())
check('Taxe foncière → libellé dédié, impots.gouv', (() => {
  const d = detectOfficialDoc('Avis de taxe foncière 2026\nCommune de Belleuse')
  return d?.type === 'taxe_fonciere' && d.url.includes('impots.gouv.fr')
})())
check('CAF → caf.fr', detectOfficialDoc('CAF de la Somme\nVos allocations familiales')?.url.includes('caf.fr') === true)
check('Assurance Maladie → ameli.fr', detectOfficialDoc('Assurance Maladie\nfeuille de soins')?.url.includes('ameli.fr') === true)
check('Carte grise → ANTS', detectOfficialDoc('Certificat d’immatriculation - ANTS')?.url.includes('ants.gouv.fr') === true)

// Chaque doc a un lien officiel (gouv/officiel), une action et une note
check('Amende : action + note présentes', (() => {
  const d = detectOfficialDoc('amende'); return !!d && d.action.length > 0 && d.note.length > 0
})())

// Garde-fous
check('Courrier de résiliation (pas administratif) → null',
  detectOfficialDoc('Objet : résiliation de mon abonnement mobile. Veuillez agréer…') === null)
check('Texte vide → null', detectOfficialDoc('') === null)
check('Repli service-public si indice administratif + withFallback',
  detectOfficialDoc('Courrier de la préfecture, référence dossier 123', { withFallback: true })?.url.includes('service-public.fr') === true)
check('Sans withFallback : un texte administratif vague reste null',
  detectOfficialDoc('Courrier de la préfecture, référence dossier 123') === null)

console.log(failures === 0 ? '\n✅ DOCUMENTS OFFICIELS : TOUS LES TESTS PASSENT' : `\n❌ ${failures} ÉCHEC(S)`)
process.exit(failures === 0 ? 0 : 1)
