import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { apiGet, apiPost, apiPatch, apiDelete } from './api'
import type { DetectedSubscriptionRow } from '@/lib/subscriptions/detect'
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
  commitment_id: string | null
  facture_id?: string | null
  kind: string
  scheduled_for: string
  channel: string
  message: string | null
  status: string
}

export interface FactureRow {
  id: string
  name: string
  amount: number | null
  mode: 'interval' | 'manual'
  start_date: string | null
  interval_months: number | null
  next_due_date: string | null
  notice_days: number | null
  status: string
}

export interface LetterListItem {
  id: string
  letter_type: string
  generated_at: string
}

// Engagements, rappels et factures ponctuelles passent désormais par le socle
// API pour les comptes connectés (colonnes et validation gérées côté serveur).

type Supabase = ReturnType<typeof createSupabaseBrowserClient>
type Backend =
  | { kind: 'cloud'; supabase: Supabase; userId: string }
  | { kind: 'local'; kv: KV }

// Si localStorage est interdit (navigation privée stricte), on retombe sur
// une mémoire de session : l'app reste utilisable, sans persistance.
const memoryKV: KV = (() => {
  const m = new Map<string, string>()
  return {
    getItem: k => m.get(k) ?? null,
    setItem: (k, v) => { m.set(k, v) },
    removeItem: k => { m.delete(k) },
  }
})()

function safeKV(): KV {
  try {
    const probe = '__serein_probe__'
    window.localStorage.setItem(probe, '1')
    window.localStorage.removeItem(probe)
    return window.localStorage
  } catch {
    return memoryKV
  }
}

async function backend(): Promise<Backend> {
  try {
    const supabase = createSupabaseBrowserClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) return { kind: 'cloud', supabase, userId: session.user.id }
  } catch { /* env Supabase absente → mode local */ }
  return { kind: 'local', kv: safeKV() }
}

/** Vrai si l'utilisateur travaille sans compte (données sur cet appareil). */
export async function isGuest(): Promise<boolean> {
  return (await backend()).kind === 'local'
}

function fail(message: string): never { throw new Error(message) }

// ─── ENGAGEMENTS ────────────────────────────────────────────────────────────

// Compte connecté → socle API durci (`/api/commitments`, validation + RLS
// côté serveur). Invité → localStorage. La session voyage par cookie, donc les
// appels serveur sont authentifiés sans réglage supplémentaire.

export async function listCommitments(): Promise<CommitmentRow[]> {
  const b = await backend()
  if (b.kind === 'local') return readRows<CommitmentRow>(b.kv, LOCAL_KEYS.commitments)
  return apiGet<CommitmentRow[]>('/api/commitments')
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
  // Un POST par engagement (le lot détecté reste petit) : validation Zod + RLS
  // s'appliquent à chacun côté serveur.
  return Promise.all(inputs.map(i => apiPost<CommitmentRow>('/api/commitments', {
    name: i.name,
    service_type: i.service_type,
    amount: i.amount,
    frequency: i.frequency,
    anniversary_date: i.anniversary_date ?? null,
    cancellation_notice_days: i.cancellation_notice_days ?? null,
    ...(i.detected_automatically ? { detected_automatically: true } : {}),
  })))
}

export async function updateCommitment(id: string, patch: Partial<CommitmentRow>): Promise<void> {
  const b = await backend()
  if (b.kind === 'local') {
    if (!updateRow(b.kv, LOCAL_KEYS.commitments, id, patch)) fail('Engagement introuvable.')
    return
  }
  // `id` n'est pas un champ modifiable : on ne l'envoie pas au serveur.
  const { id: _omit, ...body } = patch
  void _omit
  await apiPatch(`/api/commitments/${id}`, body)
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
  await apiDelete(`/api/commitments/${id}`)
}

// ─── RAPPELS ────────────────────────────────────────────────────────────────

export async function listReminders(): Promise<ReminderRow[]> {
  const b = await backend()
  if (b.kind === 'local') return readRows<ReminderRow>(b.kv, LOCAL_KEYS.reminders)
  return apiGet<ReminderRow[]>('/api/reminders')
}

export async function addReminder(
  target: { commitmentId?: string; factureId?: string },
  draft: { kind: string; scheduled_for: string; channel: string; message: string | null; status?: string }
): Promise<ReminderRow> {
  const b = await backend()
  const row = {
    commitment_id: target.commitmentId ?? null,
    facture_id: target.factureId ?? null,
    ...draft,
    status: draft.status ?? 'pending',
  }
  if (b.kind === 'local') return insertRows(b.kv, LOCAL_KEYS.reminders, [row])[0]
  // Un rappel de facture (commitment_id null, facture_id posé) est désormais
  // accepté côté serveur (dette Brique 3 corrigée : CHECK « au moins une cible »).
  return apiPost<ReminderRow>('/api/reminders', row)
}

export async function updateReminder(id: string, patch: { status: string }): Promise<void> {
  const b = await backend()
  if (b.kind === 'local') {
    if (!updateRow(b.kv, LOCAL_KEYS.reminders, id, patch)) fail('Rappel introuvable.')
    return
  }
  await apiPatch(`/api/reminders/${id}`, patch)
}

export async function deleteReminder(id: string): Promise<void> {
  const b = await backend()
  if (b.kind === 'local') { deleteRow(b.kv, LOCAL_KEYS.reminders, id); return }
  await apiDelete(`/api/reminders/${id}`)
}

// ─── FACTURES PONCTUELLES ───────────────────────────────────────────────────

export async function listFactures(): Promise<FactureRow[]> {
  const b = await backend()
  if (b.kind === 'local') return readRows<FactureRow>(b.kv, LOCAL_KEYS.factures)
  return apiGet<FactureRow[]>('/api/factures')
}

export async function addFacture(input: Omit<FactureRow, 'id' | 'status'>): Promise<FactureRow> {
  const b = await backend()
  const row = { ...input, status: 'active' }
  if (b.kind === 'local') return insertRows(b.kv, LOCAL_KEYS.factures, [row])[0] as FactureRow
  // Le serveur force le statut et vérifie la cohérence du mode (interval/manual).
  return apiPost<FactureRow>('/api/factures', input)
}

export async function updateFacture(id: string, patch: Partial<FactureRow>): Promise<void> {
  const b = await backend()
  if (b.kind === 'local') {
    if (!updateRow(b.kv, LOCAL_KEYS.factures, id, patch)) fail('Facture introuvable.')
    return
  }
  const { id: _omit, ...body } = patch
  void _omit
  await apiPatch(`/api/factures/${id}`, body)
}

export async function deleteFacture(id: string): Promise<void> {
  const b = await backend()
  if (b.kind === 'local') {
    deleteRow(b.kv, LOCAL_KEYS.factures, id)
    for (const r of readRows<ReminderRow>(b.kv, LOCAL_KEYS.reminders))
      if (r.facture_id === id) deleteRow(b.kv, LOCAL_KEYS.reminders, r.id)
    return
  }
  // Les rappels liés partent en cascade côté base (FK ON DELETE CASCADE).
  await apiDelete(`/api/factures/${id}`)
}

// ─── ABONNEMENTS DÉTECTÉS ───────────────────────────────────────────────────
// Mémoire de la détection : ce que Serein a repéré dans les relevés (y compris
// les « dormants »). Distinct des engagements suivis (`commitments`).

export interface SubscriptionRow {
  id: string
  name: string
  amount: number
  frequency: string
  status: string
  source: string | null
  occurrences: number | null
  last_seen: string | null
  confidence: number | null
  dormant: boolean
}

export async function listSubscriptions(): Promise<SubscriptionRow[]> {
  const b = await backend()
  if (b.kind === 'local') return readRows<SubscriptionRow>(b.kv, LOCAL_KEYS.subscriptions)
  return apiGet<SubscriptionRow[]>('/api/subscriptions')
}

/** Enregistre un lot d'abonnements détectés (déjà dédoublonné par l'appelant). */
export async function saveDetectedSubscriptions(rows: DetectedSubscriptionRow[]): Promise<SubscriptionRow[]> {
  if (rows.length === 0) return []
  const b = await backend()
  if (b.kind === 'local') {
    const withStatus = rows.map(r => ({ ...r, status: 'active' }))
    return insertRows(b.kv, LOCAL_KEYS.subscriptions, withStatus) as SubscriptionRow[]
  }
  return Promise.all(rows.map(r => apiPost<SubscriptionRow>('/api/subscriptions', r)))
}

export async function deleteSubscription(id: string): Promise<void> {
  const b = await backend()
  if (b.kind === 'local') { deleteRow(b.kv, LOCAL_KEYS.subscriptions, id); return }
  await apiDelete(`/api/subscriptions/${id}`)
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
  const kv = safeKV()
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

  const localFactures = readRows<FactureRow>(kv, LOCAL_KEYS.factures)
  if (localFactures.length) {
    const { data: existing } = await b.supabase.from('factures_ponctuelles').select('name')
    const toPush = rowsToMigrate(localFactures, (existing ?? []).map(e => e.name))
    if (toPush.length) {
      const { error } = await b.supabase.from('factures_ponctuelles').insert(toPush.map(f => ({
        user_id: b.userId,
        name: f.name, amount: f.amount, mode: f.mode,
        start_date: f.start_date, interval_months: f.interval_months,
        next_due_date: f.next_due_date, notice_days: f.notice_days ?? 14,
        status: f.status,
      })))
      if (error) fail(`Migration des factures impossible : ${error.message}`)
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
