// ─── STOCKAGE LOCAL (MODE INVITÉ) ───────────────────────────────────────────
// Sans compte, les données restent dans le navigateur (localStorage) : aucun
// réglage serveur requis, rien ne quitte l'appareil. À la création d'un compte,
// ces données sont migrées vers Supabase puis effacées d'ici.
// Logique pure et testable : le stockage est injecté (KV), jamais global.

export interface KV {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export const LOCAL_KEYS = {
  commitments: 'serein.local.commitments',
  reminders: 'serein.local.reminders',
  letters: 'serein.local.letters',
  factures: 'serein.local.factures',
} as const

type Row = { id: string }

export function readRows<T extends Row>(kv: KV, key: string): T[] {
  try {
    const raw = kv.getItem(key)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as T[]) : []
  } catch {
    return [] // JSON corrompu : on repart proprement plutôt que de planter
  }
}

function writeRows(kv: KV, key: string, rows: unknown[]): void {
  kv.setItem(key, JSON.stringify(rows))
}

export function defaultGenId(): string {
  const c = globalThis.crypto
  if (c && 'randomUUID' in c) return c.randomUUID()
  return `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export function insertRows<T extends object>(
  kv: KV, key: string, rows: T[], genId: () => string = defaultGenId
): (T & { id: string })[] {
  const inserted = rows.map(r => {
    const existing = (r as { id?: unknown }).id
    return { ...r, id: typeof existing === 'string' && existing ? existing : genId() }
  })
  writeRows(kv, key, [...readRows(kv, key), ...inserted])
  return inserted
}

export function updateRow(kv: KV, key: string, id: string, patch: object): boolean {
  const rows = readRows(kv, key)
  const i = rows.findIndex(r => r.id === id)
  if (i < 0) return false
  rows[i] = { ...rows[i], ...patch, id }
  writeRows(kv, key, rows)
  return true
}

export function deleteRow(kv: KV, key: string, id: string): boolean {
  const rows = readRows(kv, key)
  const next = rows.filter(r => r.id !== id)
  if (next.length === rows.length) return false
  writeRows(kv, key, next)
  return true
}

export function hasGuestData(kv: KV): boolean {
  return Object.values(LOCAL_KEYS).some(k => readRows(kv, k).length > 0)
}

export function clearGuestData(kv: KV): void {
  for (const k of Object.values(LOCAL_KEYS)) kv.removeItem(k)
}

/**
 * Lignes locales à pousser vers le cloud à la connexion, sans doublonner
 * les engagements que le compte suit déjà (comparaison par nom, insensible
 * à la casse et aux espaces).
 */
export function rowsToMigrate<T extends { name: string }>(localRows: T[], cloudNames: string[]): T[] {
  const taken = new Set(cloudNames.map(n => n.trim().toLowerCase()))
  const out: T[] = []
  for (const row of localRows) {
    const k = row.name.trim().toLowerCase()
    if (taken.has(k)) continue
    taken.add(k) // évite aussi les doublons internes au stockage local
    out.push(row)
  }
  return out
}
