/**
 * Accueil « À faire » (Brique A) — logique pure, assertions PASS/FAIL.
 * `aujourdhui` injecté → déterministe. Lancer : npx tsx sandbox/test-afaire.mjs
 */
import { construireAFaire } from '../src/lib/accueil/logic'

const AUJ = '2026-07-17'
let failures = 0
const check = (name, cond, detail = '') => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${!cond && detail ? ` — ${detail}` : ''}`)
  if (!cond) failures++
}
// Date à J+n depuis AUJ
const dans = n => { const d = new Date(Date.parse(AUJ + 'T00:00:00Z')); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10) }

// ─── 1. résiliation (12 j) passe avant garantie ; garantie à 60 j exclue ─────
const r1 = construireAFaire({
  commitments: [{ name: 'AXA', cancellation_deadline: dans(12), status: 'active' }],
  garanties: [{ name: 'Lave-linge', end: dans(20) }, { name: 'TV', end: dans(60) }],
}, AUJ)
const iRes = r1.findIndex(c => c.type === 'resiliation')
const iGar = r1.findIndex(c => c.type === 'garantie')
check('résiliation présente et avant la garantie', iRes >= 0 && iGar >= 0 && iRes < iGar, JSON.stringify(r1.map(c => `${c.type}:${c.joursRestants}`)))
check('garantie à 60 j exclue (au-delà de 30 j)', !r1.some(c => c.titre.includes('TV')))

// À jour égal, le poids du type départage (résiliation > garantie)
const r1b = construireAFaire({
  commitments: [{ name: 'AXA', cancellation_deadline: dans(12), status: 'active' }],
  garanties: [{ name: 'Frigo', end: dans(12) }],
}, AUJ)
check('à 12 j chacun : résiliation (poids fort) en tête', r1b[0].type === 'resiliation')

// ─── 2. un élément EN RETARD passe avant tout le reste ───────────────────────
const r2 = construireAFaire({
  commitments: [{ name: 'SFR', cancellation_deadline: dans(3), status: 'active' }],
  reminders: [{ kind: 'payment_due', message: 'Rappel en retard', scheduled_for: dans(-5), status: 'pending' }],
  factures: [{ name: 'Cantine', next_due_date: dans(2), amount: 40 }],
}, AUJ)
check('l’élément en retard est en tête même s’il est un simple rappel', r2[0].type === 'rappel' && r2[0].joursRestants === -5, JSON.stringify(r2.map(c => `${c.type}:${c.joursRestants}`)))
check('l’élément en retard a l’urgence « retard »', r2[0].urgence === 'retard')

// ─── 3. au-delà de 30 j : exclu ──────────────────────────────────────────────
const r3 = construireAFaire({ factures: [{ name: 'Assurance', next_due_date: dans(45), amount: 200 }] }, AUJ)
check('facture à 45 j exclue', r3.length === 0)

// ─── 4. jamais plus de 5 cartes ──────────────────────────────────────────────
const r4 = construireAFaire({
  reminders: Array.from({ length: 8 }, (_, i) => ({ kind: 'custom', message: `R${i}`, scheduled_for: dans(i + 1), status: 'pending' })),
}, AUJ)
check('8 sources → 5 cartes max', r4.length === 5)

// ─── 5. aucune donnée → tableau vide, pas d’erreur ──────────────────────────
check('aucune donnée → []', construireAFaire({}, AUJ).length === 0)
check('null → [] (pas de crash)', construireAFaire(null, AUJ).length === 0)
check('aujourdhui invalide → []', construireAFaire({ factures: [{ name: 'x', next_due_date: dans(2) }] }, 'nope').length === 0)

// ─── Filtres de statut ───────────────────────────────────────────────────────
check('commitment non actif ignoré',
  construireAFaire({ commitments: [{ name: 'Vieux', cancellation_deadline: dans(3), status: 'cancelled' }] }, AUJ).length === 0)
check('facture déjà payée ignorée',
  construireAFaire({ factures: [{ name: 'Payée', next_due_date: dans(3), status: 'paid' }] }, AUJ).length === 0)
check('garantie déjà expirée ignorée',
  construireAFaire({ garanties: [{ name: 'Vieux grille-pain', end: dans(-10) }] }, AUJ).length === 0)

// ─── Forme des cartes ────────────────────────────────────────────────────────
const carte = construireAFaire({ commitments: [{ name: 'Netflix', cancellation_deadline: dans(4), status: 'active', provider: 'Netflix' }] }, AUJ)[0]
check('carte : champs présents + lien vers la page existante',
  carte.type === 'resiliation' && carte.titre.includes('Netflix') && carte.lien.startsWith('/resiliation?service=') && carte.urgence === 'critique',
  JSON.stringify(carte))

console.log('\n— aperçu d’un « À faire » mixte —')
for (const c of r2) console.log(`  [${c.urgence}] ${c.type} · ${c.joursRestants} j · ${c.titre} → ${c.lien}`)

console.log(failures === 0 ? '\n✅ À FAIRE : TOUS LES TESTS PASSENT' : `\n❌ ${failures} ÉCHEC(S)`)
process.exit(failures === 0 ? 0 : 1)
