/**
 * Test sandbox — prétraitement d'image pour OCR (méthode BUILD, étape 3)
 * Otsu, binarisation, décision « PDF scanné → OCR ». Sans navigateur.
 * Lancer : npm run test:sandbox
 */
// @ts-expect-error module ESM sans types (partagé apps statiques)
import { versNiveauxDeGris, histogramme, seuilOtsu, binariser, pretraiterRgba, texteIllisible } from '../public/shared/pretraitement.mjs'

let failures = 0
function check(name: string, cond: boolean, detail = '') {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${!cond && detail ? ` — ${detail}` : ''}`)
  if (!cond) failures++
}

// ─── 1. NIVEAUX DE GRIS ─────────────────────────────────────────────────────
const rouge = new Uint8ClampedArray([255, 0, 0, 255])
const blanc = new Uint8ClampedArray([255, 255, 255, 255])
check('Luminance : rouge pur ≈ 76, blanc = 255',
  versNiveauxDeGris(rouge)[0] === 76 && versNiveauxDeGris(blanc)[0] === 255,
  String(versNiveauxDeGris(rouge)[0]))

// ─── 2. OTSU : image bimodale « encre 40 / papier 200 » ────────────────────
const gris = new Uint8Array(1000)
for (let i = 0; i < 1000; i++) gris[i] = i < 300 ? 40 : 200 // 30 % encre
const seuil = seuilOtsu(histogramme(gris))
check('Otsu : seuil entre les deux populations (40 < seuil < 200)',
  seuil >= 40 && seuil < 200, String(seuil))
check('Otsu : image vide → seuil neutre, pas de crash', seuilOtsu(histogramme(new Uint8Array(0))) === 127)
check('Otsu : image uniforme → pas de crash', typeof seuilOtsu(histogramme(new Uint8Array(50).fill(128))) === 'number')

// ─── 3. BINARISATION ────────────────────────────────────────────────────────
const rgba = new Uint8ClampedArray(8)
rgba.set([40, 40, 40, 255, 200, 200, 200, 255])
binariser(rgba, new Uint8Array([40, 200]), seuil)
check('Binarisation : encre → noir pur, papier → blanc pur',
  rgba[0] === 0 && rgba[4] === 255 && rgba[3] === 255 && rgba[7] === 255)

// Chaîne complète sur une photo simulée (ticket jauni, faible contraste)
const photo = new Uint8ClampedArray(400 * 4)
for (let i = 0; i < 400; i++) {
  const encre = i % 7 === 0 // ~14 % de pixels d'encre
  const j = i * 4
  // papier jaunâtre ~ (210, 200, 170), encre grise ~ (90, 85, 80)
  photo[j] = encre ? 90 : 210; photo[j + 1] = encre ? 85 : 200
  photo[j + 2] = encre ? 80 : 170; photo[j + 3] = 255
}
pretraiterRgba(photo)
const valeurs = new Set<number>()
for (let i = 0; i < 400; i++) valeurs.add(photo[i * 4])
check('Chaîne complète : photo jaunâtre → uniquement noir et blanc francs',
  valeurs.size === 2 && valeurs.has(0) && valeurs.has(255), JSON.stringify([...valeurs]))

// ─── 4. DÉCISION « PDF SCANNÉ → OCR » ──────────────────────────────────────
check('Texte de vrai relevé → lisible (pas d\'OCR inutile)',
  !texteIllisible('03/01/2026 PRLV SEPA NETFLIX.COM -13,49\n05/01 CARTE SPOTIFY 10,99'))
check('PDF scanné (texte vide) → OCR', texteIllisible('') && texteIllisible(null))
check('Bribes sans chiffres (« Relevé de compte ») → OCR quand même',
  texteIllisible('Relevé de compte — page un — document numérisé sans texte réel'))
check('Court mais avec chiffres… trop court quand même → OCR', texteIllisible('12/01 3,50'))

console.log(failures === 0 ? '\n✅ TOUS LES TESTS PASSENT' : `\n❌ ${failures} ÉCHEC(S)`)
process.exit(failures === 0 ? 0 : 1)
