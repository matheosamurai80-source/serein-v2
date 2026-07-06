'use client'
import { useEffect, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { filterLiens, displayHost, type LienUtile } from '@/lib/liens/logic'

// Composant partagé (côté Serein) : lit la table publique `liens_utiles`
// et affiche un annuaire filtré. PanierMalin (app statique) consomme la
// même table et la même logique via son propre rendu vanilla.

export function LiensUtiles({ serviceKey, categories, titre, note }: {
  serviceKey: string
  categories: string[]
  titre: string
  note?: string
}) {
  const [rows, setRows] = useState<LienUtile[] | null>(null)

  useEffect(() => {
    void (async () => {
      try {
        const supabase = createSupabaseBrowserClient()
        const { data } = await supabase
          .from('liens_utiles')
          .select('service_key, categorie, nom, url, description, ordre_affichage')
          .eq('service_key', serviceKey)
        setRows(data ?? [])
      } catch {
        setRows([]) // hors ligne : message « aucun lien » plutôt qu'un crash
      }
    })()
  }, [serviceKey])

  const liens = filterLiens(rows, serviceKey, categories)

  return (
    <div className="w-full bg-surface border border-ink/10 rounded-2xl p-5" data-testid="liens-utiles">
      <p className="font-mono text-[11px] tracking-[.13em] uppercase text-ink/50 mb-3">{titre}</p>
      {rows === null ? (
        <p className="text-sm text-ink/50">Chargement…</p>
      ) : liens.length === 0 ? (
        <p className="text-sm text-ink/50">Aucun lien disponible pour l&apos;instant.</p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {liens.map(l => (
            <li key={`${l.categorie}-${l.nom}`} className="flex items-baseline justify-between gap-3 text-[13.5px]">
              <span className="min-w-0">
                <a href={l.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-moss underline">
                  {l.nom} ↗
                </a>
                {l.description && <span className="block text-xs text-ink/50 mt-0.5">{l.description}</span>}
              </span>
              <span className="font-mono text-[10.5px] text-ink/40 flex-shrink-0">{displayHost(l.url)}</span>
            </li>
          ))}
        </ul>
      )}
      {note && <p className="font-mono text-[10.5px] text-ink/45 tracking-wider leading-[1.6] mt-3">{note}</p>}
    </div>
  )
}
