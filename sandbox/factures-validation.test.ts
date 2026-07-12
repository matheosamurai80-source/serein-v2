/**
 * Test sandbox — Socle API `factures_ponctuelles` (Brique 6)
 * Schéma Zod aligné sur les colonnes et CHECK réels (mode/status + cohérence).
 * Lancer : npm run test:sandbox
 */
import {
  CreateFactureSchema, UpdateFactureSchema,
  FACTURE_MODES, FACTURE_STATUSES,
} from '@/lib/validation/factures'

let failures = 0
function check(name: string, cond: boolean, detail = '') {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${!cond && detail ? ` — ${detail}` : ''}`)
  if (!cond) failures++
}

// ─── ENUMS ──────────────────────────────────────────────────────────────────
check('mode = interval|manual', FACTURE_MODES.length === 2 && FACTURE_MODES.includes('interval') && FACTURE_MODES.includes('manual'))
check('status = active|archived', FACTURE_STATUSES.length === 2 && FACTURE_STATUSES.includes('archived'))

// ─── MODE INTERVAL (start_date + interval_months requis) ────────────────────
const iOk = CreateFactureSchema.safeParse({ name: 'Eau Veolia', mode: 'interval', start_date: '2026-09-01', interval_months: 6 })
check('interval complet accepté', iOk.success)
check('interval : défaut notice_days=14, status=active', iOk.success && iOk.data.notice_days === 14 && iOk.data.status === 'active')
check('interval sans start_date rejeté', !CreateFactureSchema.safeParse({ name: 'X', mode: 'interval', interval_months: 6 }).success)
check('interval sans interval_months rejeté', !CreateFactureSchema.safeParse({ name: 'X', mode: 'interval', start_date: '2026-09-01' }).success)
check('interval_months hors bornes (>60) rejeté', !CreateFactureSchema.safeParse({ name: 'X', mode: 'interval', start_date: '2026-09-01', interval_months: 61 }).success)

// ─── MODE MANUAL (next_due_date requis) ─────────────────────────────────────
check('manual complet accepté', CreateFactureSchema.safeParse({ name: 'Taxe foncière', mode: 'manual', next_due_date: '2026-10-15' }).success)
check('manual sans next_due_date rejeté', !CreateFactureSchema.safeParse({ name: 'X', mode: 'manual' }).success)

// ─── DIVERS ─────────────────────────────────────────────────────────────────
check('mode hors enum rejeté', !CreateFactureSchema.safeParse({ name: 'X', mode: 'yearly', next_due_date: '2026-10-15' }).success)
check('nom vide rejeté', !CreateFactureSchema.safeParse({ name: '  ', mode: 'manual', next_due_date: '2026-10-15' }).success)
check('notice_days hors bornes (>365) rejeté', !CreateFactureSchema.safeParse({ name: 'X', mode: 'manual', next_due_date: '2026-10-15', notice_days: 400 }).success)
check('amount null accepté', CreateFactureSchema.safeParse({ name: 'X', mode: 'manual', next_due_date: '2026-10-15', amount: null }).success)
check('user_id du payload ignoré',
  (() => { const p = CreateFactureSchema.safeParse({ name: 'X', mode: 'manual', next_due_date: '2026-10-15', user_id: 'hack' } as unknown as Record<string, unknown>); return p.success && !('user_id' in p.data) })())

// ─── MISE À JOUR ────────────────────────────────────────────────────────────
check('patch next_due_date seul accepté (pas de mode → règle non déclenchée)',
  UpdateFactureSchema.safeParse({ next_due_date: '2026-11-01' }).success)
check('patch vide rejeté', !UpdateFactureSchema.safeParse({}).success)
check('patch changeant le mode sans champs requis rejeté',
  !UpdateFactureSchema.safeParse({ mode: 'interval' }).success)

console.log(failures === 0 ? '\n✅ SOCLE FACTURES : TOUS LES TESTS PASSENT' : `\n❌ ${failures} ÉCHEC(S)`)
process.exit(failures === 0 ? 0 : 1)
