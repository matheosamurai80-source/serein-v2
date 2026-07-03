/**
 * Test sandbox — Abonopack v1 (méthode BUILD, étape 3)
 * Score de vigilance explicable + synthèse d'économies (doublons uniquement).
 * Lancer : npm run test:sandbox
 */
import { vigilanceOf, buildAbonopack, levelOf } from '@/lib/abonopack/logic'

let failures = 0
function check(name: string, cond: boolean, detail = '') {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${!cond && detail ? ` — ${detail}` : ''}`)
  if (!cond) failures++
}

const TODAY = '2026-07-04'
const c = (id: string, name: string, service_type: string, amount: number | null,
           frequency: 'weekly'|'monthly'|'quarterly'|'yearly'|'one_time', deadline?: string) => ({
  id, name, service_type: service_type as never, amount, frequency,
  cancellation_deadline: deadline ?? null, anniversary_date: null,
  cancellation_notice_days: null, status: 'active',
})

// ─── SCORE UNITAIRE ─────────────────────────────────────────────────────────
const seul = [c('a', 'Netflix', 'streaming', 13.49, 'monthly')]
const netflix = vigilanceOf(seul[0], seul, TODAY)
check('Sans échéance connue → raison « angle mort » (+20)',
  netflix.reasons.some(r => r.includes('angle mort')) && netflix.score === 20)
check('Niveaux : 20 → faible, 40 → modérée, 65 → élevée',
  levelOf(20) === 'faible' && levelOf(40) === 'moderee' && levelOf(65) === 'elevee')

const cher = vigilanceOf(c('b', 'Assurance', 'insurance', 480, 'yearly', '2026-07-07'),
  [c('b', 'Assurance', 'insurance', 480, 'yearly')], TODAY)
check('Échéance sous 7 j + coût 40 €/mois + annuel → score 35+25+10 = 70, élevé',
  cher.score === 70 && cher.level === 'elevee', `score ${cher.score}`)
check('Chaque point du score a sa raison en français',
  cher.reasons.length === 3 && cher.reasons.some(r => r.includes('7 jours'))
  && cher.reasons.some(r => r.includes('€/mois')) && cher.reasons.some(r => r.includes('annuel')))

// Doublon détecté et expliqué
const deuxStreaming = [
  c('n', 'Netflix', 'streaming', 13.49, 'monthly'),
  c('d', 'Disney+', 'streaming', 8.99, 'monthly'),
]
const netflix2 = vigilanceOf(deuxStreaming[0], deuxStreaming, TODAY)
check('Doublon de catégorie → +25 avec raison « 2 services streaming »',
  netflix2.score === 45 && netflix2.reasons.some(r => r.includes('2 services streaming')))

// ─── SYNTHÈSE ───────────────────────────────────────────────────────────────
const pack = buildAbonopack([
  ...deuxStreaming,
  c('x', 'Box Orange', 'telecom', 39.9, 'monthly'),
  c('r', 'Vieille assurance', 'insurance', 240, 'yearly', '2026-06-01'), // dépassée
  { ...c('z', 'Résilié', 'gym', 99, 'monthly'), status: 'cancelled' },
], TODAY)

check('Les engagements résiliés sont exclus du pack', !pack.items.some(i => i.id === 'z'))
check('Tri : le plus vigilant en premier', pack.items[0].score >= pack.items[pack.items.length - 1].score)
check('Doublons chiffrés : Netflix (13,49 €) récupérable, pas Disney+ (moins cher)',
  pack.duplicatesMonthly === 13.49 && pack.duplicateNames.includes('Netflix') && !pack.duplicateNames.includes('Disney+'),
  `obtenu ${pack.duplicatesMonthly} € — ${pack.duplicateNames.join(',')}`)
check('Économie annuelle = mensuelle × 12', pack.duplicatesAnnual === Math.round(13.49 * 12 * 100) / 100)
check('Score global pondéré par le coût, borné 0-100',
  pack.globalScore >= 0 && pack.globalScore <= 100 && Number.isInteger(pack.globalScore))
check('Compteur « à examiner » = items en vigilance élevée',
  pack.toReviewCount === pack.items.filter(i => i.level === 'elevee').length)

// Pack vide : aucun plantage, zéros propres
const vide = buildAbonopack([], TODAY)
check('Pack vide → zéros propres (pas de NaN)',
  vide.globalScore === 0 && vide.duplicatesMonthly === 0 && vide.items.length === 0)

console.log(failures === 0 ? '\n✅ TOUS LES TESTS PASSENT' : `\n❌ ${failures} ÉCHEC(S)`)
process.exit(failures === 0 ? 0 : 1)
