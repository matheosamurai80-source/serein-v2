/**
 * Test sandbox — Brique 2 : liens utiles partagés (méthode BUILD, étape 3)
 * Filtrage par service + catégorie, tri, sécurité des URL, cas vide.
 * Lancer : npm run test:sandbox
 */
import { filterLiens, isSafeUrl, displayHost, type LienUtile } from '@/lib/liens/logic'

let failures = 0
function check(name: string, cond: boolean, detail = '') {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${!cond && detail ? ` — ${detail}` : ''}`)
  if (!cond) failures++
}

const rows: LienUtile[] = [
  { service_key: 'serein', categorie: 'energie', nom: 'EDF', url: 'https://particulier.edf.fr', description: null, ordre_affichage: 1 },
  { service_key: 'serein', categorie: 'eau', nom: 'Veolia', url: 'https://www.eau.veolia.fr', description: 'Eau potable', ordre_affichage: 1 },
  { service_key: 'serein', categorie: 'eau', nom: 'Suez', url: 'https://www.toutsurmoneau.fr', description: null, ordre_affichage: 2 },
  { service_key: 'paniermalin', categorie: 'grande_distribution', nom: 'Lidl', url: 'https://www.lidl.fr', description: null, ordre_affichage: 6 },
  { service_key: 'paniermalin', categorie: 'grande_distribution', nom: 'Leclerc', url: 'https://www.e.leclerc', description: null, ordre_affichage: 1 },
  // pièges
  { service_key: 'serein', categorie: 'eau', nom: 'Piège JS', url: 'javascript:alert(1)', description: null, ordre_affichage: 0 },
  { service_key: 'serein', categorie: 'eau', nom: 'Piège HTTP', url: 'http://pas-securise.fr', description: null, ordre_affichage: 0 },
]

// ─── 1. FILTRAGE PAR SERVICE + CATÉGORIE ────────────────────────────────────
const eau = filterLiens(rows, 'serein', ['eau'])
check('Filtre : eau Serein → Veolia puis Suez (ordre d\'affichage)',
  eau.map(l => l.nom).join(',') === 'Veolia,Suez', JSON.stringify(eau.map(l => l.nom)))
check('Filtre : les liens PanierMalin n\'apparaissent pas côté Serein',
  !filterLiens(rows, 'serein', ['eau', 'energie', 'grande_distribution']).some(l => l.service_key === 'paniermalin'))
check('Filtre : plusieurs catégories combinables (eau + énergie)',
  filterLiens(rows, 'serein', ['eau', 'energie']).length === 3)
check('Filtre : tri par ordre_affichage côté PanierMalin (Leclerc avant Lidl)',
  filterLiens(rows, 'paniermalin', ['grande_distribution']).map(l => l.nom).join(',') === 'Leclerc,Lidl')

// ─── 2. TABLE VIDE / ENTRÉES DANGEREUSES ────────────────────────────────────
check('Table vide → liste vide, pas de crash', filterLiens([], 'serein', ['eau']).length === 0)
check('null → liste vide, pas de crash', filterLiens(null, 'serein', ['eau']).length === 0)
check('URL javascript: exclue', !eau.some(l => l.nom === 'Piège JS'))
check('URL http non chiffrée exclue', !eau.some(l => l.nom === 'Piège HTTP'))
check('isSafeUrl : https ✓, http ✗, javascript ✗, charabia ✗',
  isSafeUrl('https://ok.fr') && !isSafeUrl('http://ko.fr') && !isSafeUrl('javascript:x') && !isSafeUrl('pas une url'))

// ─── 3. AFFICHAGE ───────────────────────────────────────────────────────────
check('displayHost : www retiré', displayHost('https://www.carrefour.fr/promos') === 'carrefour.fr')

// ─── 4. SÉLECTEUR « MA BANQUE » (même table, catégorie banque) ─────────────
const banques: LienUtile[] = [
  { service_key: 'serein', categorie: 'banque', nom: 'BoursoBank (Boursorama)', url: 'https://www.boursobank.com', description: 'Espace particuliers', ordre_affichage: 10 },
  { service_key: 'serein', categorie: 'banque', nom: 'Crédit Agricole', url: 'https://www.credit-agricole.fr', description: 'Espace particuliers', ordre_affichage: 1 },
  { service_key: 'paniermalin', categorie: 'banque', nom: 'Crédit Agricole', url: 'https://www.credit-agricole.fr', description: 'Espace particuliers', ordre_affichage: 1 },
]
const banquesSerein = filterLiens(banques, 'serein', ['banque'])
check('Banques : filtrées par service, triées par ordre (Crédit Agricole avant Boursorama)',
  banquesSerein.length === 2 && banquesSerein[0]?.nom === 'Crédit Agricole')
check('Banques : disponibles aussi côté PanierMalin (mêmes données)',
  filterLiens(banques, 'paniermalin', ['banque']).length === 1)
check('Banques : ne polluent pas les catégories eau/énergie',
  !filterLiens([...rows, ...banques], 'serein', ['eau', 'energie']).some(l => l.categorie === 'banque'))

console.log(failures === 0 ? '\n✅ TOUS LES TESTS PASSENT' : `\n❌ ${failures} ÉCHEC(S)`)
process.exit(failures === 0 ? 0 : 1)
