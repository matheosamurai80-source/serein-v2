/**
 * Test sandbox — PanierMalin Enseignes & fidélité (liens, pas de carte stockée)
 * Validation d'un lien, fusion/dédoublonnage des sources. Logique pure.
 * Lancer : npm run test:sandbox
 */
// @ts-expect-error module ESM sans types (app statique)
import { DEFAULT_ENSEIGNES, isValidHttpsUrl, normalizeEnseigne, mergeEnseignes } from '../public/paniermalin/logic.mjs'

let failures = 0
function check(name: string, cond: boolean, detail = '') {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${!cond && detail ? ` — ${detail}` : ''}`)
  if (!cond) failures++
}

type Ens = { name: string; url: string }

// ─── VALIDATION URL ─────────────────────────────────────────────────────────
check('https valide accepté', isValidHttpsUrl('https://www.carrefour.fr'))
check('http (non sécurisé) refusé', !isValidHttpsUrl('http://exemple.fr'))
check('texte non-URL refusé', !isValidHttpsUrl('carrefour'))
check('javascript: refusé', !isValidHttpsUrl('javascript:alert(1)'))

// ─── NORMALISATION ──────────────────────────────────────────────────────────
check('enseigne valide nettoyée (trim)', JSON.stringify(normalizeEnseigne({ name: '  Grand Frais ', url: 'https://www.grandfrais.com ' })) === JSON.stringify({ name: 'Grand Frais', url: 'https://www.grandfrais.com' }))
check('nom vide refusé', normalizeEnseigne({ name: '', url: 'https://x.fr' }) === null)
check('lien non-https refusé', normalizeEnseigne({ name: 'X', url: 'http://x.fr' }) === null)
check('lien manquant refusé', normalizeEnseigne({ name: 'X' }) === null)

// ─── LISTE PAR DÉFAUT ───────────────────────────────────────────────────────
check('≥ 8 enseignes par défaut', DEFAULT_ENSEIGNES.length >= 8)
check('toutes les enseignes par défaut en https', DEFAULT_ENSEIGNES.every((e: Ens) => isValidHttpsUrl(e.url)))

// ─── FUSION ─────────────────────────────────────────────────────────────────
const remote: Ens[] = [{ name: 'Cora', url: 'https://www.cora.fr' }, { name: 'Carrefour', url: 'https://www.carrefour.fr' }]
const custom: Ens[] = [{ name: 'Grand Frais', url: 'https://www.grandfrais.com' }, { name: 'carrefour', url: 'https://x' }]
const merged = mergeEnseignes(DEFAULT_ENSEIGNES, remote, custom)
check('Carrefour dédoublonné (une seule fois, insensible à la casse)',
  merged.filter((e: Ens) => e.name.toLowerCase() === 'carrefour').length === 1)
check('Enseigne distante ajoutée (Cora)', merged.some((e: Ens) => e.name === 'Cora'))
check('Ajout perso valide inclus (Grand Frais)', merged.some((e: Ens) => e.name === 'Grand Frais'))
check('Ajout perso invalide (carrefour url « x ») exclu du doublon',
  !merged.some((e: Ens) => e.url === 'https://x' || e.url === 'x'))
check('Ordre préservé : défaut avant distant avant perso',
  merged.findIndex((e: Ens) => e.name === 'Carrefour') < merged.findIndex((e: Ens) => e.name === 'Cora')
  && merged.findIndex((e: Ens) => e.name === 'Cora') < merged.findIndex((e: Ens) => e.name === 'Grand Frais'))
check('Sources vides ne plantent pas', mergeEnseignes(undefined, [], null as unknown as Ens[]).length === 0)

console.log(failures === 0 ? '\n✅ ENSEIGNES : TOUS LES TESTS PASSENT' : `\n❌ ${failures} ÉCHEC(S)`)
process.exit(failures === 0 ? 0 : 1)
