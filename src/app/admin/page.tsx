'use client'
import { useEffect, useState } from 'react'
import { SereinNav } from '@/components/ui/nav'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { statCards, breakdownRows, isAccessDenied, TYPE_LABELS, type StatCard } from '@/lib/admin/logic'

// Dashboard administrateur. La page ne contient AUCUN secret : c'est la
// fonction SQL admin_stats() qui refuse tout compte autre que l'éditeur.

type Etat = 'chargement' | 'ok' | 'refuse' | 'anonyme' | 'erreur'

export default function AdminPage() {
  const [etat, setEtat] = useState<Etat>('chargement')
  const [cards, setCards] = useState<StatCard[]>([])
  const [parType, setParType] = useState<{ label: string; count: number }[]>([])
  const [lettres, setLettres] = useState<{ label: string; count: number }[]>([])
  const [genereLe, setGenereLe] = useState('')

  useEffect(() => {
    void (async () => {
      try {
        const supabase = createSupabaseBrowserClient()
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) { setEtat('anonyme'); return }
        const { data, error } = await supabase.rpc('admin_stats')
        if (error) { setEtat(isAccessDenied(error.message) ? 'refuse' : 'erreur'); return }
        const raw = data as Record<string, unknown>
        setCards(statCards(raw))
        setParType(breakdownRows(raw['par_type'], TYPE_LABELS))
        setLettres(breakdownRows(raw['lettres_par_type'], TYPE_LABELS))
        setGenereLe(typeof raw['genere_le'] === 'string'
          ? new Date(raw['genere_le']).toLocaleString('fr-FR') : '')
        setEtat('ok')
      } catch {
        setEtat('erreur')
      }
    })()
  }, [])

  return (
    <>
      <SereinNav />
      <main className="min-h-screen max-w-[720px] mx-auto px-5 py-8 flex flex-col items-center animate-fade-up">
        <p className="font-mono text-[11px] tracking-[.17em] uppercase text-moss mb-4 flex items-center gap-2.5">
          <span className="w-6 h-px bg-moss" />Administration<span className="w-6 h-px bg-moss" />
        </p>
        <h1 className="font-serif text-[clamp(26px,5.5vw,42px)] tracking-[-0.025em] leading-[1.15] text-ink mb-6 text-center">
          Les chiffres, <em className="text-moss">en direct.</em>
        </h1>

        {etat === 'chargement' && <p className="text-sm text-ink/50">Chargement…</p>}

        {etat === 'anonyme' && (
          <p className="text-sm text-ink/70 text-center" data-testid="admin-anonyme">
            Espace réservé à l&apos;administrateur —{' '}
            <a href="/connexion" className="text-moss underline">connectez-vous</a> d&apos;abord.
          </p>
        )}

        {etat === 'refuse' && (
          <p className="text-sm text-ink/70 text-center" data-testid="admin-refuse">
            🔒 Accès réservé à l&apos;administrateur. Ce compte n&apos;y est pas autorisé.
          </p>
        )}

        {etat === 'erreur' && (
          <p className="text-sm text-ink/70 text-center">
            Impossible de charger les statistiques — réessayez dans un instant.
          </p>
        )}

        {etat === 'ok' && (
          <>
            <div className="w-full grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
              {cards.map(c => (
                <div key={c.label} className="bg-surface border border-ink/10 rounded-2xl p-4" data-testid="admin-card">
                  <p className="font-serif text-[30px] tracking-[-0.02em] text-ink leading-none">{c.value}</p>
                  <p className="font-mono text-[10px] tracking-wider uppercase text-ink/45 mt-1.5">{c.label}</p>
                  {c.hint && <p className="text-[11px] text-ink/50 leading-[1.5] mt-1.5">{c.hint}</p>}
                </div>
              ))}
            </div>

            <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-surface border border-ink/10 rounded-2xl p-5" data-testid="admin-types">
                <p className="font-mono text-[11px] tracking-[.13em] uppercase text-ink/50 mb-3">Engagements par type</p>
                {parType.length === 0 ? <p className="text-sm text-ink/50">Aucune donnée.</p> : (
                  <ul className="flex flex-col gap-1.5">
                    {parType.map(r => (
                      <li key={r.label} className="flex justify-between text-[13.5px]">
                        <span className="text-ink/75">{r.label}</span>
                        <span className="font-mono text-ink">{r.count.toLocaleString('fr-FR')}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="bg-surface border border-ink/10 rounded-2xl p-5" data-testid="admin-lettres">
                <p className="font-mono text-[11px] tracking-[.13em] uppercase text-ink/50 mb-3">Lettres par régime</p>
                {lettres.length === 0 ? <p className="text-sm text-ink/50">Aucune lettre sauvegardée.</p> : (
                  <ul className="flex flex-col gap-1.5">
                    {lettres.map(r => (
                      <li key={r.label} className="flex justify-between text-[13.5px]">
                        <span className="text-ink/75">{r.label}</span>
                        <span className="font-mono text-ink">{r.count.toLocaleString('fr-FR')}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <p className="font-mono text-[11px] text-ink/45 tracking-wider mt-6">
              Chiffres agrégés uniquement, aucune donnée individuelle{genereLe ? ` · générés le ${genereLe}` : ''}.
            </p>
          </>
        )}
      </main>
    </>
  )
}
