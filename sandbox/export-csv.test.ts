/**
 * Test sandbox — Export CSV RGPD (méthode BUILD, étape 3 : AVANT toute UI)
 * Jeu de données factices → logique d'export → assertions PASS/FAIL :
 * comptage des lignes, accents (BOM UTF-8), étanchéité entre utilisateurs.
 * Lancer : npm run test:sandbox
 */
import {
  buildExportCsv, toCsvValue, onlyMine,
  type CommitmentExportRow, type UserServiceExportRow,
} from '@/lib/export/csv'

let failures = 0
function check(name: string, cond: boolean, detail = '') {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${!cond && detail ? ` — ${detail}` : ''}`)
  if (!cond) failures++
}

// ─── JEU DE DONNÉES FACTICES (2 utilisateurs mélangés exprès) ───────────────
const MOI = 'user-moi'
const AUTRE = 'user-autre'

const commitment = (over: Partial<CommitmentExportRow>): CommitmentExportRow => ({
  user_id: MOI, name: 'X', provider: null, service_type: 'streaming', amount: 10,
  frequency: 'monthly', start_date: null, anniversary_date: null,
  commitment_end_date: null, next_due_date: null, cancellation_deadline: null,
  cancellation_notice_days: null, importance: 'normal', status: 'active',
  detected_automatically: false, notes: null, created_at: '2026-07-01T10:00:00Z', ...over,
})

const commitments: CommitmentExportRow[] = [
  commitment({ name: 'Assurance habitation Créteil', service_type: 'insurance', amount: 42.5, anniversary_date: '2026-09-01', cancellation_notice_days: 60, detected_automatically: true }),
  commitment({ name: 'Électricité — chauffage été/hiver', service_type: 'energy', amount: 68.4, notes: 'Relevé à vérifier ; compteur n°7' }),
  commitment({ name: 'Netflix', amount: 13.49, status: 'cancelled' }),
  // pièges : guillemets, injection de formule, retour à la ligne
  commitment({ name: 'Salle "Le Gymnase"', service_type: 'gym', notes: 'ligne 1\nligne 2' }),
  commitment({ name: '=1+2', service_type: 'other' }),
  // fuite potentielle : lignes d'un AUTRE utilisateur
  commitment({ user_id: AUTRE, name: 'SECRET-ABONNEMENT-AUTRUI', amount: 99 }),
]

const services: UserServiceExportRow[] = [
  { user_id: MOI, service_key: 'serein', status: 'active', activated_at: '2026-07-05T09:00:00Z', deactivated_at: null },
  { user_id: MOI, service_key: 'paniermalin', status: 'inactive', activated_at: '2026-07-05T09:00:00Z', deactivated_at: '2026-07-06T09:00:00Z' },
  { user_id: AUTRE, service_key: 'serein', status: 'active', activated_at: '2026-07-05T09:00:00Z', deactivated_at: null },
]

const csv = buildExportCsv({ userId: MOI, commitments, services, exportedAt: new Date('2026-07-06T12:00:00Z') })
const lignes = csv.split('\r\n')

// ─── 1. COMPTAGE : lignes exportées = lignes attendues ──────────────────────
check('Section engagements annoncée à 5 (les miens), pas 6', csv.includes('MES ENGAGEMENTS (5)'))
check('Section services annoncée à 2 (les miens), pas 3', csv.includes('MES SERVICES (2)'))
check('Nombre de lignes de données engagements = 5', (() => {
  const debut = lignes.findIndex(l => l.startsWith('Nom;'))
  const fin = lignes.findIndex((l, i) => i > debut && l === '')
  return fin - debut - 1 === 5
})(), csv)
check('Nombre de lignes de données services = 2', (() => {
  const debut = lignes.findIndex(l => l.startsWith('Service;'))
  return lignes.slice(debut + 1).filter(Boolean).length === 2
})())

// ─── 2. ENCODAGE : BOM UTF-8 + accents intacts ──────────────────────────────
check('BOM UTF-8 en tout premier caractère (Excel FR)', csv.charCodeAt(0) === 0xFEFF)
check('Accents corrects dans les en-têtes (Échéance, Fréquence, Préavis)',
  csv.includes('Échéance anniversaire') && csv.includes('Fréquence') && csv.includes('Préavis (jours)'))
check('Accents corrects dans les données (Créteil, été/hiver, Électricité / gaz)',
  csv.includes('Créteil') && csv.includes('été/hiver') && csv.includes('Électricité / gaz'))
check('Octets UTF-8 réels valides après BOM (é = 0xC3 0xA9)', (() => {
  const buf = Buffer.from(csv, 'utf8')
  return buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF && buf.includes(Buffer.from('Créteil', 'utf8'))
})())

// ─── 3. ÉTANCHÉITÉ : rien d'un autre utilisateur ────────────────────────────
check('Aucune donnée d\'autrui dans le fichier', !csv.includes('SECRET-ABONNEMENT-AUTRUI') && !csv.includes(AUTRE))
check('onlyMine : filtre défensif (3 services → 2)', onlyMine(services, MOI).length === 2)
check('onlyMine : null/undefined → liste vide, pas de crash',
  onlyMine(null, MOI).length === 0 && onlyMine(undefined, MOI).length === 0)

// ─── 4. FORMAT : traductions FR + échappements + anti-injection ─────────────
check('Valeurs traduites (Assurance, Mensuel, Résilié, Oui)',
  csv.includes('Assurance') && csv.includes('Mensuel') && csv.includes('Résilié') && csv.includes(';Oui;'))
check('Montant à virgule française (42,5)', csv.includes(';42,5;'))
check('Dates au format FR (01/09/2026)', csv.includes('01/09/2026'))
check('Guillemets échappés RFC 4180', csv.includes('"Salle ""Le Gymnase"""'))
check('Retour à la ligne dans une cellule → cellule entre guillemets',
  csv.includes('"ligne 1\nligne 2"'))
check('Point-virgule dans une cellule → cellule entre guillemets',
  csv.includes('"Relevé à vérifier ; compteur n°7"'))
check('Injection de formule neutralisée (=1+2 → \'=1+2)', csv.includes("'=1+2"))
check('toCsvValue : null/undefined → vide, +@- neutralisés',
  toCsvValue(null) === '' && toCsvValue('@cmd') === "'@cmd" && toCsvValue('+33 6') === "'+33 6")

// ─── 5. UTILISATEUR SANS DONNÉES ────────────────────────────────────────────
const vide = buildExportCsv({ userId: 'user-nouveau', commitments, services })
check('Utilisateur sans données → fichier valide avec sections à 0',
  vide.includes('MES ENGAGEMENTS (0)') && vide.includes('MES SERVICES (0)') && !vide.includes('Netflix'))

console.log(failures === 0 ? '\n✅ TOUS LES TESTS PASSENT' : `\n❌ ${failures} ÉCHEC(S)`)
process.exit(failures === 0 ? 0 : 1)
