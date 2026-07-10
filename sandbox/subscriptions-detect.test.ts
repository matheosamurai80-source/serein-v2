/**
 * Test sandbox — Détection d'abonnements → table `subscriptions` (Brique 7)
 * Conversion (montant/fréquence), dormance, dédoublonnage. Logique pure.
 * Lancer : npm run test:sandbox
 */
import {
  mapDetectionFrequency, chargeAmount, isDormant, toDetectedRow, buildDetectedRows,
  DORMANT_AFTER_DAYS, type DetectedInput,
} from '@/lib/subscriptions/detect'

let failures = 0
function check(name: string, cond: boolean, detail = '') {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${!cond && detail ? ` — ${detail}` : ''}`)
  if (!cond) failures++
}

const TODAY = '2026-07-10'
const sub = (over: Partial<DetectedInput> = {}): DetectedInput => ({
  merchant: 'Netflix', monthly_cost: 13.49, frequency: 'monthly',
  occurrences: 3, confidence: 0.9, last_seen: '2026-07-01', ...over,
})

// ─── FRÉQUENCE ──────────────────────────────────────────────────────────────
check('annual → yearly', mapDetectionFrequency('annual') === 'yearly')
check('monthly inchangé', mapDetectionFrequency('monthly') === 'monthly')
check('weekly inchangé', mapDetectionFrequency('weekly') === 'weekly')

// ─── MONTANT RÉEL ───────────────────────────────────────────────────────────
check('mensuel : montant = monthly_cost', chargeAmount({ monthly_cost: 13.49, frequency: 'monthly' }) === 13.49)
check('hebdo : montant = monthly_cost', chargeAmount({ monthly_cost: 4, frequency: 'weekly' }) === 4)
check('annuel : montant reconstruit (×12)', chargeAmount({ monthly_cost: 10, frequency: 'annual' }) === 120)

// ─── DORMANCE ───────────────────────────────────────────────────────────────
check(`DORMANT_AFTER_DAYS = 60`, DORMANT_AFTER_DAYS === 60)
check('vu il y a 9 j → actif', !isDormant('2026-07-01', TODAY))
check('vu il y a 100 j → dormant', isDormant('2026-04-01', TODAY))
check('last_seen absent → non dormant', !isDormant(null, TODAY))
check('last_seen mal formé → non dormant (pas de crash)', !isDormant('01/04/2026', TODAY))

// ─── CONVERSION COMPLÈTE ────────────────────────────────────────────────────
const row = toDetectedRow(sub({ merchant: '  Spotify  ', frequency: 'annual', monthly_cost: 10, last_seen: '2026-03-01' }), { todayISO: TODAY })
check('nom nettoyé (trim)', row.name === 'Spotify')
check('source = statement', row.source === 'statement')
check('detected_automatically = true', row.detected_automatically === true)
check('annuel : montant 120 + fréquence yearly', row.amount === 120 && row.frequency === 'yearly')
check('dormant calculé (mars → juillet > 60 j)', row.dormant === true)
check('date mal formée → last_seen null', toDetectedRow(sub({ last_seen: 'bad' }), { todayISO: TODAY }).last_seen === null)

// ─── DÉDOUBLONNAGE ──────────────────────────────────────────────────────────
const batch = [sub({ merchant: 'Netflix' }), sub({ merchant: 'NETFLIX' }), sub({ merchant: 'Spotify' }), sub({ merchant: 'Canal+' })]
const rows = buildDetectedRows(batch, ['canal+'], { todayISO: TODAY })
check('doublons internes (Netflix/NETFLIX) fusionnés', rows.filter(r => r.name.toLowerCase() === 'netflix').length === 1)
check('nom déjà connu (Canal+) exclu', !rows.some(r => r.name === 'Canal+'))
check('résultat = Netflix + Spotify (2)', rows.length === 2)
check('lot vide si tout est déjà connu', buildDetectedRows([sub({ merchant: 'Netflix' })], ['netflix'], { todayISO: TODAY }).length === 0)

console.log(failures === 0 ? '\n✅ DÉTECTION ABONNEMENTS : TOUS LES TESTS PASSENT' : `\n❌ ${failures} ÉCHEC(S)`)
process.exit(failures === 0 ? 0 : 1)
