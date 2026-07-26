/**
 * SEREIN — Coffre chiffré (chiffrement à enveloppe)
 *
 * Principe : une clé de données (DEK) aléatoire chiffre le contenu.
 * Cette DEK est elle-même emballée deux fois :
 *   - par une clé dérivée de la phrase de passe (usage quotidien)
 *   - par une clé de secours imprimable (récupération)
 *
 * Le serveur ne stocke QUE des enveloppes et du chiffré.
 * Il ne détient aucune clé permettant de déchiffrer.
 *
 * (Base64 rendu ISOMORPHE — Node ET navigateur — pour que la démo « voir ce
 * que le serveur voit » tourne côté client ; le reste de la crypto est inchangé.)
 */

const KDF_ITERATIONS = 600_000
const enc = new TextEncoder()
const dec = new TextDecoder()

export interface VaultEnvelope {
  /** Sel de dérivation, public */
  salt: string
  /** DEK emballée par la phrase de passe */
  wrappedByPassphrase: string
  /** DEK emballée par la clé de secours */
  wrappedByRecovery: string
  kdf: 'PBKDF2-SHA256'
  iterations: number
  version: 1
}

export interface SealedRecord {
  iv: string
  ciphertext: string
}

// ─── encodage (isomorphe Node / navigateur) ─────────────────────────────────
function b64(buf: ArrayBuffer | Uint8Array): string {
  const b = buf instanceof Uint8Array ? buf : new Uint8Array(buf)
  if (typeof Buffer !== 'undefined') return Buffer.from(b).toString('base64')
  let s = ''
  for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]!)
  return btoa(s)
}
function unb64(s: string): Uint8Array {
  if (typeof Buffer !== 'undefined') return new Uint8Array(Buffer.from(s, 'base64'))
  const bin = atob(s)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}
function randomBytes(n: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(n))
}

// ─── dérivation ────────────────────────────────────────────────────────────
async function deriveWrappingKey(secret: string, salt: Uint8Array): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey('raw', enc.encode(secret), 'PBKDF2', false, [
    'deriveKey',
  ])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations: KDF_ITERATIONS, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

async function wrapDek(dekRaw: Uint8Array, wrappingKey: CryptoKey): Promise<string> {
  const iv = randomBytes(12)
  const ct = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    wrappingKey,
    dekRaw as BufferSource,
  )
  return `${b64(iv)}.${b64(ct)}`
}

async function unwrapDek(wrapped: string, wrappingKey: CryptoKey): Promise<CryptoKey> {
  const [ivPart, ctPart] = wrapped.split('.')
  if (!ivPart || !ctPart) throw new Error('Enveloppe malformée')
  const raw = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: unb64(ivPart) as BufferSource },
    wrappingKey,
    unb64(ctPart) as BufferSource,
  )
  // extractable: la DEK reste en mémoire côté client, jamais transmise ;
  // l'extraction est requise pour le ré-emballage lors d'un changement de phrase.
  return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM', length: 256 }, true, [
    'encrypt',
    'decrypt',
  ])
}

// ─── clé de secours ────────────────────────────────────────────────────────
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // sans I, O, 0, 1

/** Clé imprimable : SEREIN-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX */
export function generateRecoveryKey(): string {
  const bytes = randomBytes(24)
  let out = ''
  for (let i = 0; i < 24; i++) {
    out += ALPHABET[bytes[i]! % ALPHABET.length]
    if (i % 4 === 3 && i < 23) out += '-'
  }
  return `SEREIN-${out}`
}

// ─── cycle de vie du coffre ────────────────────────────────────────────────
export async function createVault(passphrase: string): Promise<{
  envelope: VaultEnvelope
  recoveryKey: string
}> {
  const dekRaw = randomBytes(32)
  const salt = randomBytes(16)
  const recoveryKey = generateRecoveryKey()

  const passKey = await deriveWrappingKey(passphrase, salt)
  const recKey = await deriveWrappingKey(recoveryKey, salt)

  return {
    envelope: {
      salt: b64(salt),
      wrappedByPassphrase: await wrapDek(dekRaw, passKey),
      wrappedByRecovery: await wrapDek(dekRaw, recKey),
      kdf: 'PBKDF2-SHA256',
      iterations: KDF_ITERATIONS,
      version: 1,
    },
    recoveryKey,
  }
}

export async function unlock(envelope: VaultEnvelope, secret: string): Promise<CryptoKey> {
  const salt = unb64(envelope.salt)
  const key = await deriveWrappingKey(secret, salt)
  const isRecovery = secret.startsWith('SEREIN-')
  const wrapped = isRecovery ? envelope.wrappedByRecovery : envelope.wrappedByPassphrase
  try {
    return await unwrapDek(wrapped, key)
  } catch {
    throw new Error('Phrase de passe ou clé de secours incorrecte')
  }
}

/** Changement de phrase de passe : on ré-emballe la DEK, on ne rechiffre rien. */
export async function changePassphrase(
  envelope: VaultEnvelope,
  oldSecret: string,
  newPassphrase: string,
): Promise<VaultEnvelope> {
  const dek = await unlock(envelope, oldSecret)
  const dekRaw = new Uint8Array(await crypto.subtle.exportKey('raw', dek))
  const salt = unb64(envelope.salt)
  const newPassKey = await deriveWrappingKey(newPassphrase, salt)
  return { ...envelope, wrappedByPassphrase: await wrapDek(dekRaw, newPassKey) }
}

// ─── scellement des enregistrements ────────────────────────────────────────
export async function seal(dek: CryptoKey, data: unknown): Promise<SealedRecord> {
  const iv = randomBytes(12)
  const ct = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    dek,
    enc.encode(JSON.stringify(data)) as BufferSource,
  )
  return { iv: b64(iv), ciphertext: b64(ct) }
}

export async function open<T>(dek: CryptoKey, rec: SealedRecord): Promise<T> {
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: unb64(rec.iv) as BufferSource },
    dek,
    unb64(rec.ciphertext) as BufferSource,
  )
  return JSON.parse(dec.decode(plain)) as T
}
