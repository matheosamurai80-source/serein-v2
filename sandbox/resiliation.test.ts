/**
 * Test sandbox — moteur RÉSILIATION (méthode BUILD, étape 3, AVANT l'UI)
 * Compose régime + date butoir + courrier. `today` injecté → déterministe.
 * Lancer : npm run test:sandbox
 */
import { computeResiliation } from '@/lib/resiliation/logic'

let failures = 0
function check(name: string, cond: boolean, detail = '') {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${!cond && detail ? ` — ${detail}` : ''}`)
  if (!cond) failures++
}

const base = {
  serviceName: 'Service Test',
  senderName: 'Julien Peltier',
  senderAddress: '10 rue de la Paix, 60000 Beauvais',
  providerName: 'Prestataire — Service Résiliation',
  providerAddress: 'TSA 10008, 59878 Lille Cedex 9',
}

// ─── 1. RÉGIME « À TOUT MOMENT » → pas de date butoir, mais un courrier ──────
{
  const r = computeResiliation({ ...base, category: 'telecom', today: '2026-08-26' })
  check('Télécom → résiliable à tout moment (pas de fenêtre à rater)', r.status === 'a_tout_moment' && r.deadline === null)
  check('Télécom → courrier généré avec l\'article L.224-39', r.letter.body.includes('L.224-39'))
  check('Télécom → régime remonté correctement', r.regime.regime === 'telecom')
}
{
  const r = computeResiliation({ ...base, category: 'utility', today: '2026-08-26' })
  check('Énergie → résiliable à tout moment', r.status === 'a_tout_moment' && r.deadline === null)
}
{
  const r = computeResiliation({ ...base, category: 'streaming', renewalNoticeReceived: false, today: '2026-08-26' })
  check('Streaming non avisé (Chatel) → résiliable à tout moment', r.status === 'a_tout_moment')
}

// ─── 2. DATE BUTOIR — droit commun (préavis à respecter avant échéance) ──────
// Échéance 2026-12-01, préavis 30 j → date butoir = 2026-11-01.
const droitCommun = { ...base, category: 'saas' as const, renewalNoticeReceived: true,
  echeanceDate: '2026-12-01', contractNoticeDays: 30 }

{
  const r = computeResiliation({ ...droitCommun, today: '2026-08-26' })
  check('Droit commun → régime « droit_commun »', r.regime.regime === 'droit_commun')
  check('Date butoir = échéance − préavis (2026-12-01 − 30 j = 2026-11-01)', r.deadline === '2026-11-01', String(r.deadline))
  check('Jours restants calculés (67 j au 2026-08-26)', r.daysUntilDeadline === 67, String(r.daysUntilDeadline))
  check('Statut « ok » quand il reste > 30 jours', r.status === 'ok')
  check('Courrier présent même avec une date butoir', r.letter.body.includes('résilier'))
}
{
  const r = computeResiliation({ ...droitCommun, today: '2026-10-15' })
  check('Statut « bientot » quand il reste ≤ 30 jours (17 j)', r.status === 'bientot' && r.daysUntilDeadline === 17, `${r.status}/${r.daysUntilDeadline}`)
}
{
  const r = computeResiliation({ ...droitCommun, today: '2026-10-28' })
  check('Statut « critique » quand il reste ≤ 7 jours (4 j)', r.status === 'critique' && r.daysUntilDeadline === 4, `${r.status}/${r.daysUntilDeadline}`)
}
{
  const r = computeResiliation({ ...droitCommun, today: '2026-11-15' })
  check('Statut « depassee » quand la date butoir est passée (−14 j)', r.status === 'depassee' && r.daysUntilDeadline! < 0, `${r.status}/${r.daysUntilDeadline}`)
}

// ─── 3. PRÉAVIS PAR DÉFAUT & CAS « INCONNUE » ────────────────────────────────
{
  // Sans préavis contractuel, on retombe sur le préavis légal du régime.
  // droit_commun a maxNoticeDays = null → sans échéance/préavis : inconnue.
  const r = computeResiliation({ ...base, category: 'saas', renewalNoticeReceived: true, today: '2026-08-26' })
  check('Droit commun sans échéance → date butoir « inconnue »', r.status === 'inconnue' && r.deadline === null)
}
{
  const r = computeResiliation({ ...base, category: 'saas', renewalNoticeReceived: true,
    echeanceDate: '2026-12-01', today: '2026-08-26' })
  check('Droit commun avec échéance mais sans préavis → inconnue (préavis légal indéterminé)', r.status === 'inconnue')
}

// ─── 4. LE COURRIER RESTE COMPLET DANS TOUS LES CAS ─────────────────────────
{
  const r = computeResiliation({ ...droitCommun, contractRef: 'CL-999', today: '2026-08-26' })
  check('Courrier : coordonnées, recommandé et référence repris',
    r.letter.body.includes('Julien Peltier')
    && r.letter.body.includes('recommandée avec accusé de réception')
    && r.letter.body.includes('CL-999'))
}

console.log(failures === 0 ? '\n✅ MOTEUR RÉSILIATION : TOUS LES TESTS PASSENT' : `\n❌ ${failures} ÉCHEC(S)`)
process.exit(failures === 0 ? 0 : 1)
