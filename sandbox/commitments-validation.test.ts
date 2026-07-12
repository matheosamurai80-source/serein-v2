/**
 * Test sandbox — Socle API `commitments` (Brique 3, le vrai cœur)
 * Schéma Zod aligné sur les colonnes et CHECK réels de la table live.
 * Lancer : npm run test:sandbox
 */
import {
  CreateCommitmentSchema, UpdateCommitmentSchema,
  COMMITMENT_SERVICE_TYPES, COMMITMENT_FREQUENCIES, COMMITMENT_STATUSES, COMMITMENT_IMPORTANCES,
} from '@/lib/validation/commitments'

let failures = 0
function check(name: string, cond: boolean, detail = '') {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${!cond && detail ? ` — ${detail}` : ''}`)
  if (!cond) failures++
}

// ─── ENUMS ALIGNÉS SUR LA BASE ──────────────────────────────────────────────
check('service_type = 10 valeurs (insurance…other)', COMMITMENT_SERVICE_TYPES.length === 10)
check('frequency inclut one_time (spécifique commitments)', COMMITMENT_FREQUENCIES.includes('one_time'))
check('status inclut expired', COMMITMENT_STATUSES.includes('expired'))
check('importance = low/normal/high/critical', COMMITMENT_IMPORTANCES.length === 4)

// ─── CRÉATION ───────────────────────────────────────────────────────────────
const ok1 = CreateCommitmentSchema.safeParse({ name: 'Assurance auto AXA' })
check('Nom seul suffit (amount nullable)', ok1.success)
check('Défauts service_type=other, frequency=monthly, status=active, importance=normal',
  ok1.success && ok1.data.service_type === 'other' && ok1.data.frequency === 'monthly'
  && ok1.data.status === 'active' && ok1.data.importance === 'normal')

check('Nom vide rejeté', !CreateCommitmentSchema.safeParse({ name: '   ' }).success)
check('service_type hors enum rejeté', !CreateCommitmentSchema.safeParse({ name: 'X', service_type: 'crypto' }).success)
check('frequency hors enum rejetée', !CreateCommitmentSchema.safeParse({ name: 'X', frequency: 'daily' }).success)
check('status hors enum rejeté', !CreateCommitmentSchema.safeParse({ name: 'X', status: 'archived' }).success)
check('importance hors enum rejetée', !CreateCommitmentSchema.safeParse({ name: 'X', importance: 'urgent' }).success)
check('Montant négatif rejeté', !CreateCommitmentSchema.safeParse({ name: 'X', amount: -5 }).success)
check('amount null explicitement accepté', CreateCommitmentSchema.safeParse({ name: 'X', amount: null }).success)
check('Date mal formée rejetée', !CreateCommitmentSchema.safeParse({ name: 'X', cancellation_deadline: '01/09/2026' }).success)
check('Date AAAA-MM-JJ acceptée', CreateCommitmentSchema.safeParse({ name: 'X', cancellation_deadline: '2026-09-01' }).success)
check('user_id du payload ignoré (jamais retenu)',
  (() => { const p = CreateCommitmentSchema.safeParse({ name: 'X', user_id: 'hack' } as unknown as Record<string, unknown>); return p.success && !('user_id' in p.data) })())

// ─── MISE À JOUR ────────────────────────────────────────────────────────────
check('Patch vide rejeté', !UpdateCommitmentSchema.safeParse({}).success)
check('Patch partiel accepté (status)', UpdateCommitmentSchema.safeParse({ status: 'cancelled' }).success)
check('Patch avec enum invalide rejeté', !UpdateCommitmentSchema.safeParse({ frequency: 'hourly' }).success)

console.log(failures === 0 ? '\n✅ SOCLE COMMITMENTS : TOUS LES TESTS PASSENT' : `\n❌ ${failures} ÉCHEC(S)`)
process.exit(failures === 0 ? 0 : 1)
