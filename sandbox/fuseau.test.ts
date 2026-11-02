// Calculs de dates en heure de Paris, à cheval sur les changements d'heure.
// Le fuseau est fixé AVANT tout calcul : les fonctions ne sont appelées qu'ensuite.
process.env.TZ = 'Europe/Paris'
import { effectiveDeadline } from '../src/lib/commitments/logic'
import { buildReminderForCommitment } from '../src/lib/reminders/logic'

let ok = 0, ko = 0
const check = (nom: string, cond: boolean, detail = '') => {
  cond ? ok++ : ko++
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${nom}${cond ? '' : ' — ' + detail}`)
}
const butoir = (anniv: string, preavis: number) =>
  effectiveDeadline({ anniversary_date: anniv, cancellation_notice_days: preavis } as never)

check('Fuseau actif : Europe/Paris', Intl.DateTimeFormat().resolvedOptions().timeZone === 'Europe/Paris')
check('Traverse fin octobre : 01/12 − 60 j = 02/10', butoir('2026-12-01', 60) === '2026-10-02', String(butoir('2026-12-01', 60)))
check('Traverse fin mars : 15/04 − 30 j = 16/03', butoir('2027-04-15', 30) === '2027-03-16', String(butoir('2027-04-15', 30)))
check('Sans changement d\'heure : 31/01 − 30 j = 01/01', butoir('2027-01-31', 30) === '2027-01-01', String(butoir('2027-01-31', 30)))
check('Préavis 0 jour : la date reste l\'échéance', butoir('2026-12-01', 0) === '2026-12-01', String(butoir('2026-12-01', 0)))
check('Année bissextile : 01/03/2028 − 1 j = 29/02', butoir('2028-03-01', 1) === '2028-02-29', String(butoir('2028-03-01', 1)))
check('Date avec heure ignorée : 2026-12-01T10:00 − 60 j = 02/10', butoir('2026-12-01T10:00:00Z', 60) === '2026-10-02', String(butoir('2026-12-01T10:00:00Z', 60)))

const r = buildReminderForCommitment(
  { name: 'Box internet', anniversary_date: '2026-12-01', cancellation_notice_days: 60 } as never,
  { daysBefore: 14, todayISO: '2026-08-01' }
)
const jourRappel = r ? new Date(r.scheduled_for).toLocaleDateString('fr-FR') : 'aucun'
check('Rappel 14 j avant le 02/10 : le 18/09/2026', jourRappel === '18/09/2026', jourRappel)

console.log(`\n=== RÉSULTAT : ${ok} PASS / ${ko} FAIL ===`)
if (ko) process.exit(1)
