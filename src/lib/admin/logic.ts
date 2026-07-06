// ─── DASHBOARD ADMINISTRATEUR — logique pure ────────────────────────────────
// La sécurité est CÔTÉ SERVEUR : la fonction SQL admin_stats() vérifie que le
// compte connecté est celui de l'administrateur avant d'agréger quoi que ce
// soit. Ici : uniquement la mise en forme des chiffres reçus.

export interface StatCard {
  label: string
  value: string
  hint?: string
}

const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0)
const fr = (n: number) => n.toLocaleString('fr-FR')

/** Cartes de synthèse à partir du JSON brut d'admin_stats(). */
export function statCards(raw: Record<string, unknown> | null | undefined): StatCard[] {
  const r = raw ?? {}
  return [
    {
      label: 'Comptes utilisateurs',
      value: fr(num(r['users_total'])),
      hint: `+${fr(num(r['users_7j']))} sur 7 jours · les utilisateurs sans compte (mode local) sont invisibles par conception`,
    },
    {
      label: 'Engagements suivis',
      value: fr(num(r['commitments_total'])),
      hint: `${fr(num(r['commitments_actifs']))} actifs · ${fr(num(r['commitments_detectes_auto']))} détectés par l'analyse`,
    },
    {
      label: 'Lettres de résiliation',
      value: fr(num(r['lettres_total'])),
    },
    {
      label: 'Rappels programmés',
      value: fr(num(r['reminders_total'])),
      hint: `${fr(num(r['reminders_pending']))} en attente`,
    },
    {
      label: 'Factures ponctuelles',
      value: fr(num(r['factures_total'])),
    },
    {
      label: 'Listes famille PanierMalin',
      value: fr(num(r['listes_partagees'])),
      hint: 'listes synchronisées actives (anonymes, par code)',
    },
  ]
}

/** Répartition {clé: nombre} → lignes triées par volume décroissant. */
export function breakdownRows(
  obj: unknown,
  labels: Record<string, string> = {}
): { label: string; count: number }[] {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return []
  return Object.entries(obj as Record<string, unknown>)
    .map(([k, v]) => ({ label: labels[k] ?? k, count: num(v) }))
    .filter(r => r.count > 0)
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'fr'))
}

export const TYPE_LABELS: Record<string, string> = {
  insurance: 'Assurance', energy: 'Électricité / gaz', water: 'Eau',
  telecom: 'Téléphone / internet', streaming: 'Streaming', gym: 'Salle de sport',
  loan: 'Crédit', rent: 'Loyer', tax: 'Impôts / taxes', other: 'Autre',
  standard: 'Standard', chatel: 'Loi Chatel', hamon: 'Loi Hamon', negotiation: 'Négociation',
}

/** L'erreur renvoyée signifie-t-elle « pas admin / pas connecté » ? */
export function isAccessDenied(message?: string | null): boolean {
  return /acc[eè]s refus|non authentifi/i.test(message ?? '')
}
