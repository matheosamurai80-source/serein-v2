/**
 * Test sandbox — dashboard administrateur (méthode BUILD, étape 3)
 * Mise en forme des stats + interprétation des refus d'accès.
 * Lancer : npm run test:sandbox
 */
import { statCards, breakdownRows, isAccessDenied, TYPE_LABELS } from '@/lib/admin/logic'

let failures = 0
function check(name: string, cond: boolean, detail = '') {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${!cond && detail ? ` — ${detail}` : ''}`)
  if (!cond) failures++
}

// ─── 1. CARTES DE SYNTHÈSE ──────────────────────────────────────────────────
const raw = {
  users_total: 42, users_7j: 5,
  commitments_total: 130, commitments_actifs: 110, commitments_detectes_auto: 37,
  lettres_total: 18, reminders_total: 25, reminders_pending: 9,
  factures_total: 12, listes_partagees: 7,
}
const cards = statCards(raw)
check('6 cartes de synthèse', cards.length === 6)
check('Utilisateurs : total + progression 7 jours',
  cards[0]?.value === '42' && cards[0]?.hint?.includes('+5') === true)
check('Utilisateurs : rappel honnête que le mode local est invisible',
  cards[0]?.hint?.includes('invisibles') === true)
check('Engagements : actifs et détectés auto en sous-titre',
  cards[1]?.value === '130' && cards[1]?.hint?.includes('110 actifs') === true && cards[1]?.hint?.includes('37') === true)
check('Lettres, rappels (9 en attente), factures, listes famille',
  cards[2]?.value === '18' && cards[3]?.hint?.includes('9 en attente') === true
  && cards[4]?.value === '12' && cards[5]?.value === '7')

// ─── 2. DONNÉES MANQUANTES : jamais de crash ────────────────────────────────
const vide = statCards(null)
check('JSON absent → 6 cartes à zéro', vide.length === 6 && vide.every(c => c.value === '0'))
check('Clés partielles → zéros ailleurs', statCards({ users_total: 3 })[1]?.value === '0')

// ─── 3. RÉPARTITIONS ────────────────────────────────────────────────────────
const rows = breakdownRows({ streaming: 12, insurance: 30, telecom: 12, bidule: 0 }, TYPE_LABELS)
check('Répartition : triée par volume décroissant, libellés FR',
  rows[0]?.label === 'Assurance' && rows[0]?.count === 30 && rows.length === 3, JSON.stringify(rows))
check('Répartition : égalité départagée par ordre alphabétique',
  rows[1]?.label === 'Streaming' && rows[2]?.label === 'Téléphone / internet')
check('Répartition : objet invalide → liste vide',
  breakdownRows(null).length === 0 && breakdownRows([1, 2]).length === 0 && breakdownRows('x').length === 0)
check('Lettres : libellés hamon/chatel traduits',
  breakdownRows({ hamon: 3, chatel: 1 }, TYPE_LABELS)[0]?.label === 'Loi Hamon')

// ─── 4. REFUS D'ACCÈS ───────────────────────────────────────────────────────
check('« accès refusé » et « non authentifié » reconnus',
  isAccessDenied('accès refusé') && isAccessDenied('non authentifié') && isAccessDenied('Acces refuse'))
check('Autre erreur (réseau…) → pas un refus', !isAccessDenied('fetch failed') && !isAccessDenied(null))

console.log(failures === 0 ? '\n✅ TOUS LES TESTS PASSENT' : `\n❌ ${failures} ÉCHEC(S)`)
process.exit(failures === 0 ? 0 : 1)
