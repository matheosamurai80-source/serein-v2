// ─── LIENS UTILES PARTAGÉS (Serein + PanierMalin + services futurs) ────────
// Une seule table Supabase `liens_utiles` (lecture publique), une seule
// logique de filtrage/tri. Le rendu est adapté à chaque runtime : composant
// React côté Serein, rendu vanilla côté PanierMalin (app statique) — mêmes
// données, mêmes règles.

export interface LienUtile {
  service_key: string
  categorie: string
  nom: string
  url: string
  description: string | null
  ordre_affichage: number
}

/** Filtre par service + catégorie(s), trie par ordre d'affichage puis nom. */
export function filterLiens(
  rows: LienUtile[] | null | undefined,
  serviceKey: string,
  categories: string[]
): LienUtile[] {
  const cats = new Set(categories)
  return (rows ?? [])
    .filter(r => r.service_key === serviceKey && cats.has(r.categorie) && isSafeUrl(r.url))
    .sort((a, b) => (a.ordre_affichage - b.ordre_affichage) || a.nom.localeCompare(b.nom, 'fr'))
}

/** Seuls les liens https sortent vers l'extérieur (pas de javascript: etc.). */
export function isSafeUrl(url: string): boolean {
  try {
    return new URL(url).protocol === 'https:'
  } catch {
    return false
  }
}

/** Domaine lisible pour l'affichage (« www.carrefour.fr » → « carrefour.fr »). */
export function displayHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}
