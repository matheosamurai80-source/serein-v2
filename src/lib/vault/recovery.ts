/**
 * SEREIN — Restauration du coffre sur un nouvel appareil.
 *
 * Le coffre vit sur l'appareil (option C). Pour retrouver ses données chiffrées
 * ailleurs, il faut deux choses NON secrètes séparément :
 *   - l'ENVELOPPE (sel + DEK emballée) — sauvegardée côté serveur, illisible seule ;
 *   - la CLÉ DE SECOURS — connue du seul utilisateur.
 * L'une sans l'autre ne donne rien. Réunies, elles déverrouillent la DEK.
 *
 * Ce module ne fait QUE la partie décidable/crypto (format de la clé, ouverture
 * de la DEK depuis l'enveloppe). Le va-et-vient réseau vit dans session.ts.
 */
import { unlock, type VaultEnvelope } from './crypto'

// Format d'une clé remise par `generateRecoveryKey` : SEREIN- puis 6 groupes de 4.
const RECOVERY_RE = /^SEREIN-[A-Z0-9]{4}(-[A-Z0-9]{4}){5}$/

/** Uniformise la saisie (espaces, minuscules) avant contrôle. */
export function normalizeRecoveryKey(raw: string): string {
  return (raw ?? '').trim().toUpperCase().replace(/\s+/g, '')
}

export interface KeyCheck { ok: boolean; error?: string }

/** Valide le FORMAT de la clé avant tout appel réseau. */
export function validateRecoveryKey(raw: string): KeyCheck {
  const k = normalizeRecoveryKey(raw)
  if (!k) return { ok: false, error: 'Entrez votre clé de secours.' }
  if (!RECOVERY_RE.test(k)) return { ok: false, error: 'Clé de secours invalide (format SEREIN-XXXX-XXXX-…).' }
  return { ok: true }
}

/**
 * Déverrouille la DEK depuis l'enveloppe + la clé de secours.
 * Lève si la clé ne correspond pas à l'enveloppe.
 */
export function openDekWithRecovery(envelope: VaultEnvelope, recoveryKey: string): Promise<CryptoKey> {
  return unlock(envelope, normalizeRecoveryKey(recoveryKey))
}
