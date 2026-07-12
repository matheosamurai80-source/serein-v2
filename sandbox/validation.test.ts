/**
 * Test sandbox — Socle API (Brique 1)
 * Réponse standard + schémas Zod alignés sur les tables live.
 * Lancer : npm run test:sandbox
 */
import { ok, err, handle, httpStatusFor, ApiError, type ApiErrorCode } from '@/lib/api/response'
import {
  CreateSubscriptionSchema, UpdateSubscriptionSchema,
} from '@/lib/validation/subscriptions'
import { CreateReminderSchema } from '@/lib/validation/reminders'
import { CreateUploadSchema } from '@/lib/validation/uploads'
import { CreateCancellationLetterSchema } from '@/lib/validation/cancellation-letters'
import { CreateLeadSchema } from '@/lib/validation/leads'

let failures = 0
function check(name: string, cond: boolean, detail = '') {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${!cond && detail ? ` — ${detail}` : ''}`)
  if (!cond) failures++
}

async function main() {
  // ─── RÉPONSE STANDARD ─────────────────────────────────────────────────────
  const codes: ApiErrorCode[] = [
    'UNAUTHORIZED', 'EMAIL_NOT_VERIFIED', 'FORBIDDEN', 'VALIDATION_ERROR', 'NOT_FOUND',
    'RATE_LIMITED', 'PREMIUM_REQUIRED', 'AI_PROVIDER_ERROR', 'STORAGE_ERROR', 'INTERNAL_ERROR',
  ]
  const expectedStatus: Record<ApiErrorCode, number> = {
    UNAUTHORIZED: 401, EMAIL_NOT_VERIFIED: 403, FORBIDDEN: 403, VALIDATION_ERROR: 422,
    NOT_FOUND: 404, RATE_LIMITED: 429, PREMIUM_REQUIRED: 402, AI_PROVIDER_ERROR: 502,
    STORAGE_ERROR: 502, INTERNAL_ERROR: 500,
  }
  check('10 codes d\'erreur définis', codes.length === 10)
  check('Chaque code a le bon statut HTTP', codes.every(c => httpStatusFor(c) === expectedStatus[c]))

  const okRes = ok({ id: 'abc' }, 201)
  const okBody = await okRes.json()
  check('ok() : statut et enveloppe { ok:true, data }',
    okRes.status === 201 && okBody.ok === true && okBody.data.id === 'abc')

  const errRes = err('NOT_FOUND', 'Absent', { field: 'x' })
  const errBody = await errRes.json()
  check('err() : statut déduit du code + enveloppe { ok:false, error }',
    errRes.status === 404 && errBody.ok === false && errBody.error.code === 'NOT_FOUND'
    && errBody.error.message === 'Absent' && errBody.error.details.field === 'x')

  const errNoDetail = await (err('UNAUTHORIZED', 'Non connecté')).json()
  check('err() sans détail : pas de clé details', !('details' in errNoDetail.error))

  // handle() : ApiError → réponse standard, exception inconnue → INTERNAL_ERROR
  const handledApi = await handle(async () => { throw new ApiError('FORBIDDEN', 'Interdit') })
  const handledApiBody = await handledApi.json()
  check('handle() mappe une ApiError', handledApi.status === 403 && handledApiBody.error.code === 'FORBIDDEN')

  const handledUnknown = await handle(async () => { throw new Error('secret interne fuite') })
  const handledUnknownBody = await handledUnknown.json()
  check('handle() masque une exception inconnue en INTERNAL_ERROR sans fuite',
    handledUnknown.status === 500 && handledUnknownBody.error.code === 'INTERNAL_ERROR'
    && !handledUnknownBody.error.message.includes('secret'))

  // ─── SUBSCRIPTIONS ────────────────────────────────────────────────────────
  const sOk = CreateSubscriptionSchema.safeParse({ name: 'Netflix', amount: 13.49 })
  check('Sub valide : name + amount suffisent', sOk.success)
  check('Sub : défauts frequency=monthly, status=active',
    sOk.success && sOk.data.frequency === 'monthly' && sOk.data.status === 'active')
  check('Sub : name vide rejeté', !CreateSubscriptionSchema.safeParse({ name: '  ', amount: 5 }).success)
  check('Sub : montant négatif rejeté', !CreateSubscriptionSchema.safeParse({ name: 'X', amount: -1 }).success)
  check('Sub : frequency hors enum rejetée', !CreateSubscriptionSchema.safeParse({ name: 'X', amount: 1, frequency: 'daily' }).success)
  check('Sub : status hors enum rejeté', !CreateSubscriptionSchema.safeParse({ name: 'X', amount: 1, status: 'archived' }).success)
  check('Sub : user_id du payload ignoré (non retenu)',
    (() => { const p = CreateSubscriptionSchema.safeParse({ name: 'X', amount: 1, user_id: 'hack' } as unknown as Record<string, unknown>); return p.success && !('user_id' in p.data) })())
  check('Sub : confidence hors [0,1] rejetée', !CreateSubscriptionSchema.safeParse({ name: 'X', amount: 1, confidence: 1.5 }).success)
  check('Sub update : patch vide rejeté', !UpdateSubscriptionSchema.safeParse({}).success)
  check('Sub update : patch partiel accepté', UpdateSubscriptionSchema.safeParse({ status: 'cancelled' }).success)

  // ─── REMINDERS ────────────────────────────────────────────────────────────
  const rOk = CreateReminderSchema.safeParse({
    commitment_id: '11111111-1111-1111-1111-111111111111',
    scheduled_for: '2026-09-01T08:00:00Z',
  })
  check('Reminder valide : commitment_id + scheduled_for', rOk.success)
  check('Reminder : défauts kind/channel/status',
    rOk.success && rOk.data.kind === 'cancellation_window' && rOk.data.channel === 'in_app' && rOk.data.status === 'pending')
  check('Reminder valide : facture_id seul (rappel de facture)',
    CreateReminderSchema.safeParse({ facture_id: '22222222-2222-2222-2222-222222222222', scheduled_for: '2026-09-01T08:00:00Z' }).success)
  check('Reminder : sans cible (ni engagement ni facture) rejeté',
    !CreateReminderSchema.safeParse({ scheduled_for: '2026-09-01T08:00:00Z' }).success)
  check('Reminder : commitment_id non-uuid rejeté',
    !CreateReminderSchema.safeParse({ commitment_id: 'nope', scheduled_for: '2026-09-01T08:00:00Z' }).success)
  check('Reminder : scheduled_for non-ISO rejeté',
    !CreateReminderSchema.safeParse({ commitment_id: '11111111-1111-1111-1111-111111111111', scheduled_for: '2026-09-01' }).success)
  check('Reminder : channel hors enum rejeté',
    !CreateReminderSchema.safeParse({ commitment_id: '11111111-1111-1111-1111-111111111111', scheduled_for: '2026-09-01T08:00:00Z', channel: 'pigeon' }).success)

  // ─── UPLOADS ──────────────────────────────────────────────────────────────
  check('Upload : défaut status=pending', (() => { const p = CreateUploadSchema.safeParse({}); return p.success && p.data.status === 'pending' })())
  check('Upload : status hors enum rejeté', !CreateUploadSchema.safeParse({ status: 'uploading' }).success)
  check('Upload : transactions_count négatif rejeté', !CreateUploadSchema.safeParse({ transactions_count: -3 }).success)

  // ─── CANCELLATION LETTERS ─────────────────────────────────────────────────
  const longContent = 'x'.repeat(60)
  check('Lettre valide : contenu ≥ 50 + défaut standard',
    (() => { const p = CreateCancellationLetterSchema.safeParse({ content: longContent }); return p.success && p.data.letter_type === 'standard' })())
  check('Lettre : contenu trop court rejeté', !CreateCancellationLetterSchema.safeParse({ content: 'trop court' }).success)
  check('Lettre : letter_type hors enum rejeté', !CreateCancellationLetterSchema.safeParse({ content: longContent, letter_type: 'menace' }).success)

  // ─── NON-RÉGRESSION LEADS ─────────────────────────────────────────────────
  check('Lead (existant) toujours valide',
    CreateLeadSchema.safeParse({ email: 'A@B.COM', choice: 'pdf', estimated_subscriptions: 3, monthly_loss: 20, annual_loss: 240 }).success)

  console.log(failures === 0 ? '\n✅ SOCLE API : TOUS LES TESTS PASSENT' : `\n❌ ${failures} ÉCHEC(S)`)
  process.exit(failures === 0 ? 0 : 1)
}

main()
