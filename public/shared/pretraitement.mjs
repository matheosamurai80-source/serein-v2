/**
 * PRÉTRAITEMENT D'IMAGE POUR OCR — module pur, partagé Serein + PanierMalin.
 * Une photo brute (ombres, jaunâtre, faible contraste) se lit mal ; en la
 * passant en niveaux de gris puis en noir/blanc franc (seuil d'Otsu), le
 * taux de reconnaissance de Tesseract grimpe nettement.
 * Aucune dépendance navigateur : tout opère sur des tableaux → testable en Node.
 */

/** RGBA (Uint8ClampedArray) → niveaux de gris (luminance Rec.601). */
export function versNiveauxDeGris(rgba) {
  const n = rgba.length >> 2
  const gris = new Uint8Array(n)
  for (let i = 0; i < n; i++) {
    const j = i << 2
    gris[i] = (0.299 * rgba[j] + 0.587 * rgba[j + 1] + 0.114 * rgba[j + 2]) | 0
  }
  return gris
}

/** Histogramme 256 niveaux d'une image en gris. */
export function histogramme(gris) {
  const h = new Uint32Array(256)
  for (let i = 0; i < gris.length; i++) h[gris[i]]++
  return h
}

/**
 * Seuil d'Otsu : sépare automatiquement « encre » et « papier » en maximisant
 * la variance inter-classes. Retourne un niveau 0-255.
 */
export function seuilOtsu(hist) {
  let total = 0, sommeTotale = 0
  for (let t = 0; t < 256; t++) { total += hist[t]; sommeTotale += t * hist[t] }
  if (total === 0) return 127

  let sommeFond = 0, poidsFond = 0
  let meilleureVariance = -1, seuil = 127
  for (let t = 0; t < 256; t++) {
    poidsFond += hist[t]
    if (poidsFond === 0) continue
    const poidsEncre = total - poidsFond
    if (poidsEncre === 0) break
    sommeFond += t * hist[t]
    const moyFond = sommeFond / poidsFond
    const moyEncre = (sommeTotale - sommeFond) / poidsEncre
    const variance = poidsFond * poidsEncre * (moyFond - moyEncre) ** 2
    if (variance > meilleureVariance) { meilleureVariance = variance; seuil = t }
  }
  return seuil
}

/** Binarise en place un tampon RGBA : au-dessus du seuil → blanc, sinon noir. */
export function binariser(rgba, gris, seuil) {
  for (let i = 0; i < gris.length; i++) {
    const v = gris[i] > seuil ? 255 : 0
    const j = i << 2
    rgba[j] = rgba[j + 1] = rgba[j + 2] = v
    rgba[j + 3] = 255
  }
  return rgba
}

/** Chaîne complète : RGBA bruité → RGBA noir/blanc prêt pour l'OCR. */
export function pretraiterRgba(rgba) {
  const gris = versNiveauxDeGris(rgba)
  return binariser(rgba, gris, seuilOtsu(histogramme(gris)))
}

/**
 * Un texte extrait d'un PDF est-il inexploitable (PDF scanné → passer à
 * l'OCR) ? Trop court, ou sans le moindre chiffre (un relevé, un contrat ou
 * un ticket en contiennent toujours).
 */
export function texteIllisible(texte) {
  const t = String(texte ?? '').trim()
  return t.length < 40 || !/[0-9]/.test(t)
}
