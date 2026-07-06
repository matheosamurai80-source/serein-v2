'use client'
import { useEffect, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { filterLiens, type LienUtile } from '@/lib/liens/logic'

// Menu déroulant « 🏦 Ma banque » : lien direct vers l'espace particuliers
// (pratique pour télécharger le relevé à analyser). Données partagées avec
// PanierMalin via la table liens_utiles. Invisible si la liste est vide.

export function BanqueSelect() {
  const [banques, setBanques] = useState<LienUtile[]>([])

  useEffect(() => {
    void (async () => {
      try {
        const supabase = createSupabaseBrowserClient()
        const { data } = await supabase
          .from('liens_utiles')
          .select('service_key, categorie, nom, url, description, ordre_affichage')
          .eq('service_key', 'serein')
          .eq('categorie', 'banque')
        setBanques(filterLiens(data, 'serein', ['banque']))
      } catch { /* hors ligne : le sélecteur reste masqué */ }
    })()
  }, [])

  if (!banques.length) return null

  return (
    <select
      aria-label="Ouvrir le site de ma banque"
      data-testid="banque-select"
      value=""
      onChange={e => {
        const url = e.target.value
        if (url) window.open(url, '_blank', 'noopener,noreferrer')
        e.target.value = ''
      }}
      className="font-mono text-[11px] tracking-[.1em] uppercase rounded-full px-3 py-2 bg-surface border border-ink/12 text-ink/60 hover:border-sage/50 transition-colors cursor-pointer max-w-[150px]"
    >
      <option value="">🏦 Ma banque…</option>
      {banques.map(b => <option key={b.nom} value={b.url}>{b.nom}</option>)}
    </select>
  )
}
