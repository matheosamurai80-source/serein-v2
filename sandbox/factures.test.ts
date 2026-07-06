/**
 * Test sandbox — Brique 1 : factures ponctuelles (méthode BUILD, étape 3)
 * Mode A (fréquence calculée) vs mode B (dates fixes manuelles), réutilisation
 * du mécanisme de rappel existant. Lancer : npm run test:sandbox
 */
import {
  addMonthsClamped, nextDueDate, refreshedDueDate, factureUrgency,
  factureReminderDraft, validateFacture, type FactureLike,
} from '@/lib/factures/logic'

let failures = 0
function check(name: string, cond: boolean, detail = '') {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${!cond && detail ? ` — ${detail}` : ''}`)
  if (!cond) failures++
}

const base: FactureLike = {
  name: 'Facture d\'eau', amount: 85, mode: 'interval',
  start_date: '2026-01-01', interval_months: 6, next_due_date: null, notice_days: 14,
}

// ─── 1. MODE A : FRÉQUENCE CALCULÉE (exemple du cahier des charges) ─────────
check('Départ 1er janvier, tous les 6 mois, on est en mars → prochaine le 1er juillet',
  nextDueDate(base, '2026-03-15') === '2026-07-01', String(nextDueDate(base, '2026-03-15')))
check('Après passage du 1er juillet → redéclenche au 1er janvier suivant',
  nextDueDate(base, '2026-07-02') === '2027-01-01', String(nextDueDate(base, '2026-07-02')))
check('Le jour J compte encore comme échéance courante',
  nextDueDate(base, '2026-07-01') === '2026-07-01')
check('Départ dans le futur → première échéance = date de départ',
  nextDueDate({ ...base, start_date: '2026-09-10' }, '2026-07-05') === '2026-09-10')
check('31 janvier + 1 mois → 28 février (bornage fin de mois)',
  addMonthsClamped('2026-01-31', 1) === '2026-02-28', addMonthsClamped('2026-01-31', 1))
check('31 janvier + 1 mois en année bissextile → 29 février',
  addMonthsClamped('2024-01-31', 1) === '2024-02-29')
check('Intervalle annuel : taxe foncière départ 15/10/2025, aujourd\'hui 2026-07-05 → 15/10/2026',
  nextDueDate({ ...base, start_date: '2025-10-15', interval_months: 12 }, '2026-07-05') === '2026-10-15')
check('Données manquantes en mode A → null (pas de crash)',
  nextDueDate({ ...base, start_date: null }, '2026-07-05') === null
  && nextDueDate({ ...base, interval_months: 0 }, '2026-07-05') === null)
check('Mode A : une échéance déjà payée (stockée dans le futur) N\'EST PAS ramenée en arrière',
  nextDueDate({ ...base, next_due_date: '2027-07-01' }, '2026-07-05') === '2027-07-01')
check('Mode A : une échéance stockée passée avance depuis elle (pas depuis le départ)',
  nextDueDate({ ...base, start_date: '2020-03-15', next_due_date: '2026-07-01' }, '2026-07-05') === '2027-01-01',
  String(nextDueDate({ ...base, start_date: '2020-03-15', next_due_date: '2026-07-01' }, '2026-07-05')))

// ─── 2. MODE B : DATES FIXES MANUELLES ──────────────────────────────────────
const manuelle: FactureLike = { ...base, mode: 'manual', start_date: null, interval_months: null, next_due_date: '2026-05-10' }
check('Mode B : la date saisie est renvoyée telle quelle', nextDueDate(manuelle, '2026-03-01') === '2026-05-10')
check('Mode B : la date reste FIGÉE même une fois passée (pas de recalcul)',
  nextDueDate(manuelle, '2026-09-01') === '2026-05-10'
  && refreshedDueDate(manuelle, '2026-09-01') === '2026-05-10')
check('Mode A : refreshedDueDate avance automatiquement après passage',
  refreshedDueDate(base, '2026-07-02') === '2027-01-01')

// ─── 3. URGENCE (même échelle que les abonnements) ─────────────────────────
check('Échéance dans 5 jours → critique', factureUrgency({ ...manuelle, next_due_date: '2026-07-10' }, '2026-07-05') === 'critique')
check('Échéance dans 20 jours → bientôt', factureUrgency({ ...manuelle, next_due_date: '2026-07-25' }, '2026-07-05') === 'bientot')
check('Échéance passée (mode B figé) → dépassée', factureUrgency(manuelle, '2026-09-01') === 'depassee')

// ─── 4. RAPPEL : réutilise le mécanisme existant ────────────────────────────
const draft = factureReminderDraft({ ...manuelle, next_due_date: '2026-08-01', notice_days: 10 }, '2026-07-05')
check('Rappel : programmé notice_days avant l\'échéance (1er août − 10 j = 22 juillet, 9 h)',
  draft?.scheduled_for.startsWith('2026-07-22'), String(draft?.scheduled_for))
check('Rappel : même structure que les abonnements (kind + canal in_app)',
  draft?.kind === 'cancellation_window' && draft?.channel === 'in_app')
check('Rappel : message facture explicite', Boolean(draft?.message.includes('Facture d\'eau') && draft?.message.includes('régler')))
check('Rappel : jamais programmé dans le passé (préavis 90 j, échéance dans 20 j → aujourd\'hui)',
  factureReminderDraft({ ...manuelle, next_due_date: '2026-07-25', notice_days: 90 }, '2026-07-05')?.scheduled_for.startsWith('2026-07-05') === true)
check('Rappel : pas d\'échéance → pas de rappel', factureReminderDraft({ ...manuelle, next_due_date: null }) === null)

// ─── 5. VALIDATION DU FORMULAIRE ────────────────────────────────────────────
check('Validation : nom obligatoire', validateFacture({ mode: 'interval' })?.includes('nom') === true)
check('Validation : mode A exige départ + intervalle 1-60',
  validateFacture({ name: 'X', mode: 'interval', start_date: '2026-01-01', interval_months: 0 }) !== null
  && validateFacture({ name: 'X', mode: 'interval', start_date: '2026-01-01', interval_months: 6 }) === null)
check('Validation : mode B exige une date', validateFacture({ name: 'X', mode: 'manual' }) !== null
  && validateFacture({ name: 'X', mode: 'manual', next_due_date: '2026-08-01' }) === null)

console.log(failures === 0 ? '\n✅ TOUS LES TESTS PASSENT' : `\n❌ ${failures} ÉCHEC(S)`)
process.exit(failures === 0 ? 0 : 1)
