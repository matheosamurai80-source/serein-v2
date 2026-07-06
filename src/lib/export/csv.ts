import { SERVICE_LABELS } from '@/lib/services/logic'

// ─── EXPORT CSV — PORTABILITÉ DES DONNÉES (RGPD, art. 20) ───────────────────
// Logique PURE : aucune lecture réseau ici. L'endpoint lit sous RLS et passe
// les lignes ; cette couche ne fait que filtrer (ceinture de sécurité),
// traduire et sérialiser. Lecture seule, aucune écriture, aucune table.
//
// Format : UTF-8 avec BOM (accents corrects dans Excel FR), séparateur « ; »
// (convention Excel français), CRLF, échappement RFC 4180, et neutralisation
// de l'injection de formule (= + - @ en début de cellule).

export const CSV_BOM = '\uFEFF'
const SEP = ';'
const EOL = '\r\n'

export interface CommitmentExportRow {
  user_id: string
  name: string
  provider: string | null
  service_type: string
  amount: number | string | null
  frequency: string
  start_date: string | null
  anniversary_date: string | null
  commitment_end_date: string | null
  next_due_date: string | null
  cancellation_deadline: string | null
  cancellation_notice_days: number | null
  importance: string
  status: string
  detected_automatically: boolean
  notes: string | null
  created_at: string
}

export interface UserServiceExportRow {
  user_id: string
  service_key: string
  status: string
  activated_at: string
  deactivated_at: string | null
}

const TYPE_FR: Record<string, string> = {
  insurance: 'Assurance', energy: 'Électricité / gaz', water: 'Eau',
  telecom: 'Téléphone / internet', streaming: 'Streaming', gym: 'Salle de sport',
  loan: 'Crédit', rent: 'Loyer', tax: 'Impôts / taxes', other: 'Autre',
}
const FREQ_FR: Record<string, string> = {
  monthly: 'Mensuel', quarterly: 'Trimestriel', yearly: 'Annuel',
  weekly: 'Hebdomadaire', one_time: 'Ponctuel',
}
const STATUT_FR: Record<string, string> = {
  active: 'Actif', cancelled: 'Résilié', archived: 'Archivé', inactive: 'Inactif',
}
const IMPORTANCE_FR: Record<string, string> = {
  essential: 'Essentiel', important: 'Important', optional: 'Optionnel', normal: 'Normal',
}

const tr = (map: Record<string, string>, v: unknown): string =>
  typeof v === 'string' && v ? (map[v] ?? v) : ''

function frDate(v: unknown): string {
  if (typeof v !== 'string' || !v) return ''
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return v
  return d.toLocaleDateString('fr-FR', { timeZone: 'UTC' })
}

/**
 * Sérialise une valeur de cellule : échappement RFC 4180 (guillemets doublés,
 * encadrement si ; " ou retour à la ligne) + neutralisation des débuts de
 * formule Excel (= + - @) par une apostrophe.
 */
export function toCsvValue(v: unknown): string {
  let s = v == null ? '' : String(v)
  if (/^[=+\-@]/.test(s)) s = `'${s}`
  if (/[";\r\n]/.test(s)) s = `"${s.replace(/"/g, '""')}"`
  return s
}

/**
 * Ceinture de sécurité en plus du RLS : même si des lignes étrangères
 * arrivaient jusqu'ici, seules celles de l'utilisateur sortent.
 */
export function onlyMine<T extends { user_id: string }>(rows: T[] | null | undefined, userId: string): T[] {
  return (rows ?? []).filter(r => r.user_id === userId)
}

const COMMITMENT_HEADERS = [
  'Nom', 'Prestataire', 'Type de service', 'Montant (€)', 'Fréquence',
  'Début', 'Échéance anniversaire', "Fin d'engagement", 'Prochaine échéance',
  'Date limite de résiliation', 'Préavis (jours)', 'Importance', 'Statut',
  'Détecté automatiquement', 'Notes', 'Ajouté le',
]

function commitmentCells(c: CommitmentExportRow): unknown[] {
  return [
    c.name, c.provider ?? '', tr(TYPE_FR, c.service_type),
    c.amount == null ? '' : String(c.amount).replace('.', ','),
    tr(FREQ_FR, c.frequency), frDate(c.start_date), frDate(c.anniversary_date),
    frDate(c.commitment_end_date), frDate(c.next_due_date), frDate(c.cancellation_deadline),
    c.cancellation_notice_days ?? '', tr(IMPORTANCE_FR, c.importance), tr(STATUT_FR, c.status),
    c.detected_automatically ? 'Oui' : 'Non', c.notes ?? '', frDate(c.created_at),
  ]
}

const SERVICE_HEADERS = ['Service', 'Statut', 'Activé le', 'Désactivé le']

function serviceCells(s: UserServiceExportRow): unknown[] {
  return [
    (SERVICE_LABELS as Record<string, string>)[s.service_key] ?? s.service_key,
    tr(STATUT_FR, s.status), frDate(s.activated_at), frDate(s.deactivated_at),
  ]
}

const line = (cells: unknown[]) => cells.map(toCsvValue).join(SEP)

/**
 * Fichier CSV complet : BOM + deux sections titrées (engagements, services),
 * uniquement les lignes de l'utilisateur donné.
 */
export function buildExportCsv(params: {
  userId: string
  commitments: CommitmentExportRow[] | null | undefined
  services: UserServiceExportRow[] | null | undefined
  exportedAt?: Date
}): string {
  const commitments = onlyMine(params.commitments, params.userId)
  const services = onlyMine(params.services, params.userId)
  const quand = (params.exportedAt ?? new Date()).toLocaleDateString('fr-FR', { timeZone: 'UTC' })

  const out: string[] = [
    line([`Export de mes données Serein — ${quand} (RGPD, portabilité)`]),
    '',
    line([`MES ENGAGEMENTS (${commitments.length})`]),
    line(COMMITMENT_HEADERS),
    ...commitments.map(c => line(commitmentCells(c))),
    '',
    line([`MES SERVICES (${services.length})`]),
    line(SERVICE_HEADERS),
    ...services.map(s => line(serviceCells(s))),
  ]
  return CSV_BOM + out.join(EOL) + EOL
}
