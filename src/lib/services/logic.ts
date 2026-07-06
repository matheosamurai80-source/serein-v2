// ─── FONDATION MULTISERVICE ─────────────────────────────────────────────────
// Un seul abonnement, plusieurs services activables (Serein, PanierMalin,
// puis Après, Jarvis). Cette brique pose la donnée, pas la facturation.

export const SERVICE_KEYS = ['serein', 'paniermalin', 'apres', 'jarvis'] as const
export type ServiceKey = typeof SERVICE_KEYS[number]

export const SERVICE_LABELS: Record<ServiceKey, string> = {
  serein: 'Serein — finances récurrentes',
  paniermalin: 'PanierMalin — courses malines',
  apres: 'Après — à venir',
  jarvis: 'Jarvis — à venir',
}

export interface UserServiceRow {
  service_key: string
  status: string
}

/**
 * Clés des services actifs d'un utilisateur, dans l'ordre canonique.
 * Ignore les statuts non « active » et les clés inconnues (robustesse).
 */
export function activeServiceKeys(rows: UserServiceRow[] | null | undefined): ServiceKey[] {
  const active = new Set(
    (rows ?? [])
      .filter(r => r.status === 'active' && (SERVICE_KEYS as readonly string[]).includes(r.service_key))
      .map(r => r.service_key)
  )
  return SERVICE_KEYS.filter(k => active.has(k))
}

// ─── SUPPRESSION DE COMPTE (RGPD) ───────────────────────────────────────────

/**
 * Garde-fou avant l'effacement définitif : l'utilisateur doit taper le mot
 * SUPPRIMER (majuscules exigées — l'acte doit être délibéré).
 */
export function deleteConfirmed(input: string): boolean {
  return input.trim() === 'SUPPRIMER'
}
