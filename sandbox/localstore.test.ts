/**
 * Test sandbox — stockage local mode invité (méthode BUILD, étape 3)
 * L'ajout d'engagements doit marcher SANS compte et SANS réglage serveur :
 * CRUD sur un stockage injecté + migration vers le cloud à la connexion.
 * Lancer : npm run test:sandbox
 */
import {
  LOCAL_KEYS, readRows, insertRows, updateRow, deleteRow,
  hasGuestData, clearGuestData, rowsToMigrate, type KV,
} from '@/lib/data/local'

let failures = 0
function check(name: string, cond: boolean, detail = '') {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${!cond && detail ? ` — ${detail}` : ''}`)
  if (!cond) failures++
}

/** Faux localStorage : une Map, comme dans le navigateur mais testable en Node. */
function fakeKV(): KV {
  const m = new Map<string, string>()
  return {
    getItem: k => m.get(k) ?? null,
    setItem: (k, v) => { m.set(k, v) },
    removeItem: k => { m.delete(k) },
  }
}

// ─── 1. CRUD LOCAL ──────────────────────────────────────────────────────────
const kv = fakeKV()
const K = LOCAL_KEYS.commitments

check('Stockage vide → liste vide (pas d\'erreur)', readRows(kv, K).length === 0)

let n = 0
const genId = () => `id-${++n}`
const [a, b] = insertRows(kv, K, [
  { name: 'Netflix', service_type: 'streaming', amount: 13.49, frequency: 'monthly', status: 'active' },
  { name: 'AXA Auto', service_type: 'insurance', amount: 42, frequency: 'monthly', status: 'active' },
], genId)

check('Insertion : chaque ligne reçoit un id', a.id === 'id-1' && b.id === 'id-2')
check('Insertion : les lignes sont relues telles quelles', (() => {
  const rows = readRows<{ id: string; name: string; amount: number }>(kv, K)
  return rows.length === 2 && rows[0].name === 'Netflix' && rows[1].amount === 42
})())

check('Mise à jour : statut résilié persisté', (() => {
  const ok = updateRow(kv, K, 'id-1', { status: 'cancelled' })
  const rows = readRows<{ id: string; status: string }>(kv, K)
  return ok && rows.find(r => r.id === 'id-1')?.status === 'cancelled'
})())
check('Mise à jour d\'un id inconnu → false, rien ne casse', !updateRow(kv, K, 'id-999', { status: 'x' }))

check('Suppression : la ligne disparaît, l\'autre reste', (() => {
  const ok = deleteRow(kv, K, 'id-1')
  const rows = readRows<{ id: string }>(kv, K)
  return ok && rows.length === 1 && rows[0].id === 'id-2'
})())

check('JSON corrompu → liste vide (pas de crash)', (() => {
  const bad = fakeKV()
  bad.setItem(K, '{pas du json[')
  return readRows(bad, K).length === 0
})())

// ─── 2. RAPPELS + LETTRES SUR LE MÊME MÉCANISME ────────────────────────────
insertRows(kv, LOCAL_KEYS.reminders, [{ commitment_id: 'id-2', status: 'pending', scheduled_for: '2026-08-01T09:00:00Z' }], genId)
insertRows(kv, LOCAL_KEYS.letters, [{ letter_type: 'hamon', content: 'x'.repeat(60), generated_at: '2026-07-05T10:00:00Z' }], genId)
check('Données invité détectées (engagements + rappels + lettres)', hasGuestData(kv))

// ─── 3. MIGRATION INVITÉ → COMPTE ───────────────────────────────────────────
const locals = [
  { name: 'Netflix', amount: 13.49 },
  { name: '  netflix ', amount: 13.49 },   // doublon interne (casse/espaces)
  { name: 'Basic-Fit', amount: 29.99 },
  { name: 'Spotify', amount: 10.99 },
]
const toPush = rowsToMigrate(locals, ['NETFLIX', 'Canal+'])
check('Migration : dédoublonnage nom (cloud + interne, insensible casse/espaces)',
  toPush.length === 2 && toPush[0].name === 'Basic-Fit' && toPush[1].name === 'Spotify',
  JSON.stringify(toPush.map(r => r.name)))
check('Migration : rien à pousser si tout existe déjà',
  rowsToMigrate([{ name: 'Canal+' }], ['canal+']).length === 0)

clearGuestData(kv)
check('Après migration : stockage local vidé', !hasGuestData(kv))

console.log(failures === 0 ? '\n✅ TOUS LES TESTS PASSENT' : `\n❌ ${failures} ÉCHEC(S)`)
process.exit(failures === 0 ? 0 : 1)
