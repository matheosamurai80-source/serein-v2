/**
 * Test sandbox — Client du socle API (Brique 4)
 * Déballage de l'enveloppe standard (logique pure, sans réseau).
 * Lancer : npm run test:sandbox
 */
import { unwrap, ApiClientError } from '@/lib/data/api'

let failures = 0
function check(name: string, cond: boolean, detail = '') {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${!cond && detail ? ` — ${detail}` : ''}`)
  if (!cond) failures++
}

// ─── SUCCÈS ─────────────────────────────────────────────────────────────────
const data = unwrap<{ id: string }>({ ok: true, data: { id: 'x1' } })
check('Succès : renvoie data', data.id === 'x1')
check('Succès : data tableau', JSON.stringify(unwrap<number[]>({ ok: true, data: [1, 2, 3] })) === '[1,2,3]')

// ─── ÉCHEC ──────────────────────────────────────────────────────────────────
function threw(fn: () => void): { ok: boolean; err?: ApiClientError } {
  try { fn(); return { ok: false } } catch (e) { return { ok: true, err: e as ApiClientError } }
}

const r1 = threw(() => unwrap({ ok: false, error: { code: 'NOT_FOUND', message: 'Engagement introuvable.' } }))
check('Erreur : lève', r1.ok)
check('Erreur : message repris', r1.err?.message === 'Engagement introuvable.')
check('Erreur : code repris', r1.err?.code === 'NOT_FOUND')
check('Erreur : type ApiClientError', r1.err instanceof ApiClientError)

const r2 = threw(() => unwrap({ ok: false, error: { code: 'VALIDATION_ERROR' } }))
check('Erreur sans message : message par défaut', r2.ok && typeof r2.err?.message === 'string' && r2.err!.message.length > 0)

const r3 = threw(() => unwrap(null))
check('Corps null : lève (pas de crash)', r3.ok)

const r4 = threw(() => unwrap({ weird: true }))
check('Corps inattendu (ni ok:true ni error) : lève', r4.ok)

console.log(failures === 0 ? '\n✅ CLIENT API : TOUS LES TESTS PASSENT' : `\n❌ ${failures} ÉCHEC(S)`)
process.exit(failures === 0 ? 0 : 1)
