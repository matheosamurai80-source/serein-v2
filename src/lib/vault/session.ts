/**
 * SEREIN — Session du coffre (option C : la clé vit sur l'appareil).
 *
 * Aucune phrase à retaper : au premier lancement, l'app tire un secret
 * aléatoire, le garde sur l'appareil, et remet une clé de secours à noter
 * pour changer d'appareil.
 *
 * MIGRATION : les enregistrements déjà écrits EN CLAIR restent lisibles.
 * `openRow` accepte les deux formes ; `sealRow` scelle à la prochaine écriture.
 * Rien n'est effacé, rien n'est perdu.
 */
import {
  createVault, unlock, seal, open,
  type VaultEnvelope, type SealedRecord,
} from './crypto'
import { tierOf } from './tiers'
import { normalizeRecoveryKey } from './recovery'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

const DEVICE_KEY = 'serein.vault.device'
const ENVELOPE_KEY = 'serein.vault.envelope'
const RECOVERY_SEEN = 'serein.vault.recovery_seen'

export interface SealedEnvelopeFields {
  iv: string
  ciphertext: string
}

function kv(): Storage | null {
  try {
    const probe = '__serein_vault_probe__'
    window.localStorage.setItem(probe, '1')
    window.localStorage.removeItem(probe)
    return window.localStorage
  } catch {
    return null
  }
}

function randomSecret(): string {
  const b = crypto.getRandomValues(new Uint8Array(32))
  let s = ''
  for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]!)
  return btoa(s)
}

let cachedDek: CryptoKey | null = null

/**
 * Ouvre le coffre sans rien demander. Le crée au premier appel.
 * Retourne null si le stockage local est interdit : l'app continue alors
 * SANS chiffrement plutôt que de casser (et ne prétend rien à l'écran).
 */
export async function getDek(): Promise<CryptoKey | null> {
  if (cachedDek) return cachedDek
  const store = kv()
  if (!store) return null

  let secret = store.getItem(DEVICE_KEY)
  let raw = store.getItem(ENVELOPE_KEY)

  if (!secret || !raw) {
    secret = randomSecret()
    const { envelope, recoveryKey } = await createVault(secret)
    store.setItem(DEVICE_KEY, secret)
    store.setItem(ENVELOPE_KEY, JSON.stringify(envelope))
    store.setItem(RECOVERY_SEEN, JSON.stringify({ key: recoveryKey, shown: false }))
    raw = JSON.stringify(envelope)
    void backupEnvelope() // best effort : rend la restauration possible ailleurs
  }

  try {
    cachedDek = await unlock(JSON.parse(raw) as VaultEnvelope, secret)
    return cachedDek
  } catch {
    return null
  }
}

/** La clé de secours à montrer une fois, puis à ne plus jamais réafficher. */
export function pendingRecoveryKey(): string | null {
  const store = kv()
  if (!store) return null
  const raw = store.getItem(RECOVERY_SEEN)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as { key: string; shown: boolean }
    return parsed.shown ? null : parsed.key
  } catch {
    return null
  }
}

export function markRecoveryKeySeen(): void {
  const store = kv()
  if (!store) return
  const raw = store.getItem(RECOVERY_SEEN)
  if (!raw) return
  try {
    const parsed = JSON.parse(raw) as { key: string; shown: boolean }
    store.setItem(RECOVERY_SEEN, JSON.stringify({ ...parsed, shown: true }))
  } catch { /* rien à faire */ }
}

/** Vrai si la ligne est déjà scellée. Sert à distinguer l'ancien du nouveau. */
export function isSealed(row: Record<string, unknown>): boolean {
  return typeof row.iv === 'string' && typeof row.ciphertext === 'string'
}

/**
 * Prépare une ligne pour le stockage : champs « serveur » en clair,
 * champs « coffre » dans un blob scellé.
 * Sans coffre disponible → la ligne repart telle quelle (pas de perte).
 */
export async function sealRow<T extends Record<string, unknown>>(
  entity: string,
  row: T,
): Promise<Record<string, unknown>> {
  const dek = await getDek()
  if (!dek) return { ...row }

  const secret: Record<string, unknown> = {}
  const clair: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(row)) {
    if (k === 'iv' || k === 'ciphertext') continue
    if (tierOf(`${entity}.${k}`).tier === 'coffre') secret[k] = v
    else clair[k] = v
  }
  const sealed = await seal(dek, secret)
  return { ...clair, iv: sealed.iv, ciphertext: sealed.ciphertext }
}

/**
 * Reconstitue une ligne lue. Accepte les DEUX formes :
 *  - scellée   → on déchiffre et on refusionne
 *  - en clair  → ancienne donnée, rendue telle quelle (migration douce)
 */
export async function openRow<T>(row: Record<string, unknown>): Promise<T> {
  if (!isSealed(row)) return row as T
  const dek = await getDek()
  if (!dek) return row as T
  try {
    const secret = await open<Record<string, unknown>>(dek, {
      iv: row.iv as string,
      ciphertext: row.ciphertext as string,
    } as SealedRecord)
    const rest = { ...row }
    delete rest.iv
    delete rest.ciphertext
    return { ...rest, ...secret } as T
  } catch {
    // Coffre d'un autre appareil : on rend ce qui est lisible plutôt que rien.
    const rest = { ...row }
    delete rest.iv
    delete rest.ciphertext
    return rest as T
  }
}

/** Combien de lignes restent en clair — alimente l'écran de transparence. */
export function countLegacy(rows: Record<string, unknown>[]): number {
  return rows.filter(r => !isSealed(r)).length
}

// ─── RESTAURATION MULTI-APPAREILS ────────────────────────────────────────────
// L'enveloppe (sel + DEK emballée) n'est PAS secrète seule : on la sauvegarde
// côté serveur pour pouvoir restaurer le coffre sur un autre appareil avec la
// clé de secours. Sans la clé, l'enveloppe stockée ne donne rien.

const ENVELOPE_TABLE = 'vault_envelopes'

/**
 * Sauvegarde l'enveloppe locale côté serveur (upsert). Sans effet en mode
 * invité ou si le stockage local est absent. Best effort : n'échoue jamais fort.
 */
export async function backupEnvelope(): Promise<void> {
  const store = kv()
  if (!store) return
  const raw = store.getItem(ENVELOPE_KEY)
  if (!raw) return
  try {
    const supabase = createSupabaseBrowserClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) return
    await supabase.from(ENVELOPE_TABLE).upsert({
      user_id: session.user.id,
      envelope: JSON.parse(raw),
      updated_at: new Date().toISOString(),
    })
  } catch { /* best effort : réessaiera au prochain passage */ }
}

export type RestoreResult = 'ok' | 'invalid' | 'aucune_sauvegarde' | 'hors_ligne' | 'sans_stockage'

/**
 * Restaure le coffre sur CET appareil à partir de la clé de secours :
 * récupère l'enveloppe serveur, la déverrouille, puis l'adopte localement.
 * La clé de secours devient le secret de cet appareil (elle vit déjà sur lui).
 */
export async function restoreFromRecoveryKey(recoveryKey: string): Promise<RestoreResult> {
  const store = kv()
  if (!store) return 'sans_stockage'
  const key = normalizeRecoveryKey(recoveryKey)

  let envelope: VaultEnvelope
  try {
    const supabase = createSupabaseBrowserClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) return 'hors_ligne'
    const { data, error } = await supabase
      .from(ENVELOPE_TABLE)
      .select('envelope')
      .eq('user_id', session.user.id)
      .maybeSingle()
    if (error) return 'hors_ligne'
    if (!data?.envelope) return 'aucune_sauvegarde'
    envelope = data.envelope as VaultEnvelope
  } catch {
    return 'hors_ligne'
  }

  try {
    const dek = await unlock(envelope, key) // lève si la clé ne correspond pas
    store.setItem(ENVELOPE_KEY, JSON.stringify(envelope))
    store.setItem(DEVICE_KEY, key)
    store.setItem(RECOVERY_SEEN, JSON.stringify({ key, shown: true }))
    cachedDek = dek
    return 'ok'
  } catch {
    return 'invalid'
  }
}
