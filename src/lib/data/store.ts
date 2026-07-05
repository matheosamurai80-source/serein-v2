import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { buildLetterRow, mapRegimeToLetterType } from '@/lib/letters/db'
import type { RegimeResult } from '@/lib/letters/legal'
import {
  LOCAL_KEYS, readRows, insertRows, updateRow, deleteRow,
  hasGuestData, clearGuestData, rowsToMigrate, type KV,
} from './local'

// ─── FAÇADE DE DONNÉES UNIQUE ───────────────────────────────────────────────
// Compte connecté → Supabase (retrouvé sur tous les appareils).
// Sans compte    → localStorage (tout reste sur l'appareil, zéro réglage).
// Les pages ne connaissent que ces fonctions : jamais le backend choisi.

export interface CommitmentRow {
  id: string
  name: string
  provider: string | null
  service_type: string
  amount: number | null
  frequency: string
  anniversary_date: string | null
  cancellation_deadline: string | null
  cancellation_notice_days: number | null
  status: string
}

export interface NewCommitment {
  name: string
  service_type: string
  amount: number | null
  frequency: string
  anniversary_date?: string | null
  cancellation_notice_days?: number | null
  detected_automatically?: boolean
}

export interface ReminderRow {
  id: string
  commitment_id: string
  kind: string
  scheduled_for: string
  channel: string
  message: string | null
  status: string
}

export interface LetterListItem {
  id: string
  letter_type: string
  generated_at: string
}

const COMMITMENT_COLS = 'id, name, provider, service_type, amount, frequency, anniversary_date, cancellation_deadline, cancellation_notice_days, status'
const REMINDER_COLS = 'id, commitment_id, kind, scheduled_for, channel, message, status'

type Supabase = ReturnType<typeof createSupabaseBrowserClient>
type Backend =
  | { kind: 'cloud'; supabase: Supabase; userId: string }
  | { kind: 'local'; kv: KV }

async function backend(): Promise<Backend> {
  try {
    const supabase = createSupabaseBrowserClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) return { kind: 'cloud', supabase, userId: session.user.id }
  } catch { /* env Supabase absente → mode local */ }
  return { kind: 'local', kv: window.localStorage }
}

/** Vrai si l'utilisateur travaille sans compte (données sur cet appareil). */
export async function isGuest(): Promise<boolean> {
  return (await backend()).kind === 'local'
}

function fail(message: string): never { throw new Error(message) }

// ─── ENGAGEMENTS ────────────────────────────────────────────────────────────

export async function listCommitments(): Promise<CommitmentRow[]> {
  const b = await backend()
  if (b.kind === 'local') return readRows<CommitmentRow>(b.kv, LOCAL_KEYS.commitments)
  const { data, error } = await b.supabase.from('commitments').select(COMMITMENT_COLS)
  if (error) fail(error.message)
  return data ?? []
}

export async function addCommitments(inputs: NewCommitment[]): Promise<CommitmentRow[]> {
  const b = await backend()
  const rows: (Omit<CommitmentRow, 'id'> & { detected_automatically?: boolean })[] = inputs.map(i => ({
    name: i.name,
    provider: null,
    service_type: i.service_type,
    amount: i.amount,
    frequency: i.frequency,
    anniversary_date: i.anniversary_date ?? null,
    cancellation_deadline: null,
    cancellation_notice_days: i.cancellation_notice_days ?? null,
    status: 'active',
    ...(i.detected_automatically ? { detected_automatically: true } : {}),
  }))
  if (b.kind === 'local') return insertRows(b.kv, LOCAL_KEYS.commitments, rows) as CommitmentRow[]
  const { data, error } = await b.supabase
    .from('commitments')
    .insert(rows.map(r => ({ ...r, user_id: b.userId })))
    .select(COMMITMENT_COLS)
  if (error) fail(error.message)
  return data ?? []
}

export async function updateCommitment(id: string, patch: Partial<CommitmentRow>): Promise<void> {
  const b = await backend()
  if (b.kind === 'local') {
    if (!updateRow(b.kv, LOCAL_KEYS.commitments, id, patch)) fail('Engagement introuvable.')
    return
  }
  const { error } = await b.supabase.from('commitments').update(patch).eq('id', id)
  if (error) fail(error.message)
}

export async function deleteCommitment(id: string): Promise<void> {
  const b = await backend()
  if (b.kind === 'local') {
    deleteRow(b.kv, LOCAL_KEYS.commitments, id)
    // Nettoyage des rappels et lettres liés (le cloud le fait via FK cascade)
    for (const r of readRows<ReminderRow>(b.kv, LOCAL_KEYS.reminders))
      if (r.commitment_id === id) deleteRow(b.kv, LOCAL_KEYS.reminders, r.id)
    return
  }
  const { error } = await b.supabase.from('commitments').delete().eq('id', id)
  if (error) fail(error.message)
}

// ─── RAPPELS ────────────────────────────────────────────────────────────────

export async function listReminders(): Promise<ReminderRow[]> {
  const b = await backend()
  if (b.kind === 'local') return readRows<ReminderRow>(b.kv, LOCAL_KEYS.reminders)
  const { data, error } = await b.supabase.from('reminders').select(REMINDER_COLS)
  if (error) fail(error.message)
  return data ?? []
}

export async function addReminder(
  commitmentId: string,
  draft: { kind: string; scheduled_for: string; channel: string; message: string | null; status?: string }
): Promise<ReminderRow> {
  const b = await backend()
  const row = { commitment_id: commitmentId, ...draft, status: draft.status ?? 'pending' }
  if (b.kind === 'local') return insertRows(b.kv, LOCAL_KEYS.reminders, [row])[0]
  const { data, error } = await b.supabase
    .from('reminders')
    .insert({ ...row, user_id: b.userId })
    .select(REMINDER_COLS)
    .single()
  if (error || !data) fail(error?.message ?? 'Création du rappel impossible.')
  return data
}

export async function updateReminder(id: string, patch: { status: string }): Promise<void> {
  const b = await backend()
  if (b.kind === 'local') {
    if (!updateRow(b.kv, LOCAL_KEYS.reminders, id, patch)) fail('Rappel introuvable.')
    return
  }
  const { error } = await b.supabase.from('reminders').update(patch).eq('id', id)
  if (error) fail(error.message)
}

export async function deleteReminder(id: string): Promise<void> {
  const b = await backend()
  if (b.kind === 'local') { deleteRow(b.kv, LOCAL_KEYS.reminders, id); return }
  const { error } = await b.supabase.from('reminders').delete().eq('id', id)
  if (error) fail(error.message)
}

// ─── LETTRES ────────────────────────────────────────────────────────────────

export async function listLetters(limit = 5): Promise<LetterListItem[]> {
  const b = await backend()
  if (b.kind === 'local') {
    return readRows<LetterListItem & { content: string }>(b.kv, LOCAL_KEYS.letters)
      .sort((a, x) => x.generated_at.localeCompare(a.generated_at))
      .slice(0, limit)
      .map(({ id, letter_type, generated_at }) => ({ id, letter_type, generated_at }))
  }
  const { data, error } = await b.supabase
    .from('cancellation_letters')
    .select('id, letter_type, generated_at')
    .order('generated_at', { ascending: false })
    .limit(limit)
  if (error) fail(error.message)
  return data ?? []
}

export async function listLetterCommitmentIds(): Promise<string[]> {
  const b = await backend()
  if (b.kind === 'local') {
    return readRows<{ id: string; commitment_id?: string }>(b.kv, LOCAL_KEYS.letters)
      .map(l => l.commitment_id)
      .filter((x): x is string => Boolean(x))
  }
  const { data, error } = await b.supabase.from('cancellation_letters').select('commitment_id')
  if (error) fail(error.message)
  return (data ?? []).map(l => l.commitment_id).filter((x): x is string => Boolean(x))
}

export async function addLetter(params: {
  regime: RegimeResult
  content: string
  commitmentId?: string
}): Promise<LetterListItem> {
  const b = await backend()
  if (b.kind === 'local') {
    const row = {
      letter_type: mapRegimeToLetterType(params.regime.regime),
      content: params.content.trim(),
      generated_at: new Date().toISOString(),
      ...(params.commitmentId ? { commitment_id: params.commitmentId } : {}),
    }
    const [ins] = insertRows(b.kv, LOCAL_KEYS.letters, [row])
    return { id: ins.id, letter_type: ins.letter_type, generated_at: ins.generated_at }
  }
  const row = buildLetterRow({
    userId: b.userId, regime: params.regime,
    content: params.content, commitmentId: params.commitmentId,
  })
  const { data, error } = await b.supabase
    .from('cancellation_letters')
    .insert(row)
    .select('id, letter_type, generated_at')
    .single()
  if (error || !data) fail(error?.message ?? 'Sauvegarde impossible.')
  return data
}

// ─── MIGRATION INVITÉ → COMPTE ──────────────────────────────────────────────

/**
 * À la connexion : pousse les données de l'appareil vers le compte, sans
 * doublonner, puis efface le stockage local. Renvoie le nombre d'éléments
 * migrés (0 si rien à faire ou si l'on est resté invité).
 */
export async function migrateGuestData(): Promise<number> {
  const b = await backend()
  if (b.kind !== 'cloud') return 0
  let kv: KV
  try { kv = window.localStorage } catch { return 0 }
  if (!hasGuestData(kv)) return 0

  let migrated = 0
  const localCommitments = readRows<CommitmentRow>(kv, LOCAL_KEYS.commitments)
  if (localCommitments.length) {
    const { data: existing } = await b.supabase.from('commitments').select('name')
    const toPush = rowsToMigrate(localCommitments, (existing ?? []).map(e => e.name))
    if (toPush.length) {
      const { error } = await b.supabase.from('commitments').insert(toPush.map(c => ({
        user_id: b.userId,
        name: c.name,
        service_type: c.service_type,
        amount: c.amount,
        frequency: c.frequency,
        anniversary_date: c.anniversary_date,
        cancellation_notice_days: c.cancellation_notice_days,
        status: c.status,
      })))
      if (error) fail(`Migration des engagements impossible : ${error.message}`)
      migrated += toPush.length
    }
  }

  const localLetters = readRows<{ id: string; letter_type: string; content: string }>(kv, LOCAL_KEYS.letters)
  if (localLetters.length) {
    // Les liens vers des engagements locaux n'existent plus côté cloud : on
    // migre le contenu des lettres sans le lien.
    const { error } = await b.supabase.from('cancellation_letters').insert(localLetters.map(l => ({
      user_id: b.userId,
      letter_type: l.letter_type,
      content: l.content,
    })))
    if (error) fail(`Migration des lettres impossible : ${error.message}`)
    migrated += localLetters.length
  }

  clearGuestData(kv)
  return migrated
}
