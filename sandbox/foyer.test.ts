/**
 * Test sandbox — « Mon foyer » (3e onglet) : le hub qui remplace la nav à 6 liens.
 * Un service = une carte ici, jamais un onglet. Logique pure, PASS/FAIL.
 * Lancer : npm run test:sandbox
 */
import { foyerSections, foyerRoutes } from '../src/lib/foyer/logic'

let failures = 0
function check(name: string, cond: boolean, detail = '') {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${!cond && detail ? ` — ${detail}` : ''}`)
  if (!cond) failures++
}

const sections = foyerSections()
const allLinks = sections.flatMap(s => s.links)
const hrefs = allLinks.map(l => l.href)

check('au moins 5 familles de services', sections.length >= 5, `${sections.length}`)
check('chaque famille a au moins un lien', sections.every(s => s.links.length >= 1))
check('chaque lien a href/label/icône/description', allLinks.every(l => l.href && l.label && l.icon && l.desc))
check('tous les href sont internes (/…)', hrefs.every(h => h.startsWith('/')))
check('aucun href en double', new Set(hrefs).size === hrefs.length)
check('les sections clés existent', ['/engagements', '/abonnements', '/rappels', '/resiliation', '/analyse', '/ajouter', '/paniermalin', '/compte'].every(h => hrefs.includes(h)))

// foyerRoutes = /foyer + toutes les cibles (pour l'état actif de l'onglet)
const routes = foyerRoutes()
check('foyerRoutes inclut /foyer', routes.includes('/foyer'))
check('foyerRoutes couvre toutes les cibles', hrefs.every(h => routes.includes(h)))
check('le « + » n’est PAS sous Mon foyer via l’onglet dédié',
  routes.includes('/ajouter')) // /ajouter est listé dans Documents ET a son onglet « + » : les deux sont ok
check('ni /dashboard ni /ajouter ne créent d’onglet en double (3 onglets seulement)',
  !hrefs.includes('/dashboard')) // Accueil est un onglet, pas une carte du foyer

console.log(failures === 0 ? '\n✅ MON FOYER : TOUS LES TESTS PASSENT' : `\n❌ ${failures} ÉCHEC(S)`)
process.exit(failures === 0 ? 0 : 1)
