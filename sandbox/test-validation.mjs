/**
 * Socle API (Brique 1) — assertions PASS/FAIL sur chaque schéma Zod.
 * Schémas alignés sur les tables live (subscriptions, reminders, uploads,
 * cancellation_letters) + contraintes CHECK réelles. `user_id` n'est jamais
 * accepté du client (il vient de la session serveur).
 *
 * Lancer : npx tsx sandbox/test-validation.mjs
 */
import { CreateSubscriptionSchema, UpdateSubscriptionSchema } from '../src/lib/validation/subscriptions'
import { CreateReminderSchema, UpdateReminderSchema } from '../src/lib/validation/reminders'
import { CreateUploadSchema } from '../src/lib/validation/uploads'
import { CreateCancellationLetterSchema } from '../src/lib/validation/cancellation-letters'

let failures = 0
const check = (name, cond, detail = '') => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${!cond && detail ? ` — ${detail}` : ''}`)
  if (!cond) failures++
}
const okp = (schema, input) => schema.safeParse(input).success
const kop = (schema, input) => !schema.safeParse(input).success

// ─── subscriptions ──────────────────────────────────────────────────────────
console.log('\n· subscriptions')
check('name + amount suffisent', okp(CreateSubscriptionSchema, { name: 'Netflix', amount: 13.49 }))
check('défauts frequency=monthly / status=active', (() => {
  const p = CreateSubscriptionSchema.safeParse({ name: 'Netflix', amount: 1 })
  return p.success && p.data.frequency === 'monthly' && p.data.status === 'active'
})())
check('name vide rejeté', kop(CreateSubscriptionSchema, { name: '   ', amount: 5 }))
check('amount négatif rejeté', kop(CreateSubscriptionSchema, { name: 'X', amount: -1 }))
check('frequency hors CHECK rejetée', kop(CreateSubscriptionSchema, { name: 'X', amount: 1, frequency: 'daily' }))
check('status hors CHECK rejeté', kop(CreateSubscriptionSchema, { name: 'X', amount: 1, status: 'archived' }))
check('confidence hors [0,1] rejetée', kop(CreateSubscriptionSchema, { name: 'X', amount: 1, confidence: 1.5 }))
check('user_id du payload ignoré (jamais retenu)', (() => {
  const p = CreateSubscriptionSchema.safeParse({ name: 'X', amount: 1, user_id: 'hack' })
  return p.success && !('user_id' in p.data)
})())
check('update : patch vide rejeté', kop(UpdateSubscriptionSchema, {}))
check('update : patch partiel accepté', okp(UpdateSubscriptionSchema, { status: 'cancelled' }))

// ─── reminders ──────────────────────────────────────────────────────────────
console.log('\n· reminders')
const CID = '11111111-1111-1111-1111-111111111111'
const FID = '22222222-2222-2222-2222-222222222222'
check('commitment_id + scheduled_for valide', okp(CreateReminderSchema, { commitment_id: CID, scheduled_for: '2026-09-01T08:00:00Z' }))
check('défauts kind/channel/status', (() => {
  const p = CreateReminderSchema.safeParse({ commitment_id: CID, scheduled_for: '2026-09-01T08:00:00Z' })
  return p.success && p.data.kind === 'cancellation_window' && p.data.channel === 'in_app' && p.data.status === 'pending'
})())
check('facture_id seul accepté (CHECK cible OR)', okp(CreateReminderSchema, { facture_id: FID, scheduled_for: '2026-09-01T08:00:00Z' }))
check('sans cible (ni engagement ni facture) rejeté', kop(CreateReminderSchema, { scheduled_for: '2026-09-01T08:00:00Z' }))
check('commitment_id non-uuid rejeté', kop(CreateReminderSchema, { commitment_id: 'nope', scheduled_for: '2026-09-01T08:00:00Z' }))
check('scheduled_for non-ISO rejeté', kop(CreateReminderSchema, { commitment_id: CID, scheduled_for: '2026-09-01' }))
check('channel hors CHECK rejeté', kop(CreateReminderSchema, { commitment_id: CID, scheduled_for: '2026-09-01T08:00:00Z', channel: 'pigeon' }))
check('update : patch vide rejeté', kop(UpdateReminderSchema, {}))

// ─── uploads ────────────────────────────────────────────────────────────────
console.log('\n· uploads')
check('défaut status=pending', (() => { const p = CreateUploadSchema.safeParse({}); return p.success && p.data.status === 'pending' })())
check('status hors CHECK rejeté', kop(CreateUploadSchema, { status: 'uploading' }))
check('transactions_count négatif rejeté', kop(CreateUploadSchema, { transactions_count: -3 }))
check('metadonnées valides acceptées', okp(CreateUploadSchema, { original_filename: 'releve.pdf', bank_hint: 'BoursoBank', status: 'done', transactions_count: 42 }))

// ─── cancellation_letters ───────────────────────────────────────────────────
console.log('\n· cancellation_letters')
const LONG = 'x'.repeat(60)
check('contenu ≥ 50 + défaut letter_type=standard', (() => {
  const p = CreateCancellationLetterSchema.safeParse({ content: LONG })
  return p.success && p.data.letter_type === 'standard'
})())
check('contenu trop court rejeté', kop(CreateCancellationLetterSchema, { content: 'trop court' }))
check('letter_type hors CHECK rejeté', kop(CreateCancellationLetterSchema, { content: LONG, letter_type: 'menace' }))
check('commitment_id non-uuid rejeté', kop(CreateCancellationLetterSchema, { content: LONG, commitment_id: 'x' }))

console.log(failures === 0 ? '\n✅ SOCLE API — VALIDATION : TOUS LES TESTS PASSENT' : `\n❌ ${failures} ÉCHEC(S)`)
process.exit(failures === 0 ? 0 : 1)
