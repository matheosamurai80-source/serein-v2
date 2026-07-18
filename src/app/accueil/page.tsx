'use client'
import { useEffect, useState } from 'react'
import { FoyerTabs } from '@/components/ui/foyer-tabs'
import { listCommitments, listFactures, listReminders } from '@/lib/data/store'
import { listEquipment } from '@/lib/equipment/store'
import { warrantyEnd } from '@/lib/equipment/logic'
import { construireAFaire, type Carte, type Urgence } from '@/lib/accueil/logic'

// Accueil « À faire » : l'essentiel de tous les services, trié par urgence.
// Chaque carte pointe vers sa page existante. Le reste vit dans Mon foyer.

const ICONE: Record<Carte['type'], string> = { resiliation: '✉️', facture: '💶', garantie: '📦', rappel: '⏰' }

const URGENCE_UI: Record<Urgence, { carte: string; badge: string; label: (j: number) => string }> = {
  retard:   { carte: 'border-crimson/40', badge: 'bg-crimson/12 text-crimson border-crimson/30', label: j => `En retard de ${Math.abs(j)} j` },
  critique: { carte: 'border-amber/50',   badge: 'bg-amber/15 text-amber border-amber/30',       label: j => (j === 0 ? 'Aujourd’hui' : `Dans ${j} j`) },
  bientot:  { carte: 'border-sage/30',    badge: 'bg-sage/12 text-moss border-sage/25',          label: j => `Dans ${j} j` },
  ok:       { carte: 'border-ink/10',     badge: 'bg-sage/12 text-moss border-sage/25',          label: j => `Dans ${j} j` },
}

export default function AccueilPage() {
  const [cartes, setCartes] = useState<Carte[] | null>(null)

  useEffect(() => {
    void (async () => {
      // Passe par la couche services (store → socle API / localStorage), jamais
      // Supabase en direct. Chaque source est best-effort.
      const [commitments, factures, reminders] = await Promise.all([
        listCommitments().catch(() => []),
        listFactures().catch(() => []),
        listReminders().catch(() => []),
      ])
      // Garanties : localStorage (pas de table) — fin calculée côté client.
      const garanties = listEquipment().map(e => ({ name: e.name, end: warrantyEnd(e.purchase_date, e.warranty_months) }))
      const today = new Date().toISOString().slice(0, 10)
      setCartes(construireAFaire({ commitments, factures, reminders, garanties }, today))
    })()
  }, [])

  return (
    <>
      <FoyerTabs />
      <main className="min-h-screen max-w-[640px] mx-auto px-5 py-10 animate-fade-up">
        <p className="font-mono text-[11px] tracking-[.17em] uppercase text-moss mb-4 flex items-center gap-2.5">
          <span className="w-6 h-px bg-moss" />À faire<span className="w-6 h-px bg-moss" />
        </p>
        <h1 className="font-serif text-[clamp(28px,6vw,44px)] tracking-[-0.02em] leading-[1.1] text-ink mb-8">
          Ce qui compte <em className="text-moss">aujourd’hui.</em>
        </h1>

        {cartes === null ? (
          <p className="text-sm text-ink/50">Un instant…</p>
        ) : cartes.length === 0 ? (
          <div className="bg-surface border border-ink/10 rounded-2xl p-8 text-center">
            <div className="text-[34px] mb-2">🌿</div>
            <p className="font-serif text-xl text-ink mb-1">Rien d’urgent.</p>
            <p className="text-sm text-ink/55 leading-[1.6]">Aucune échéance dans les 30 jours. Tout le reste t’attend dans <a href="/foyer" className="text-moss underline">Mon foyer</a>.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {cartes.map((c, i) => {
              const ui = URGENCE_UI[c.urgence]
              return (
                <a key={`${c.type}-${i}`} href={c.lien} data-testid="afaire-carte"
                  className={`flex items-center gap-4 bg-surface border rounded-2xl p-4 hover:shadow-[0_10px_28px_rgba(38,48,42,.08)] transition-shadow ${ui.carte}`}>
                  <span className="text-[24px] leading-none">{ICONE[c.type]}</span>
                  <span className="flex-1 min-w-0">
                    <span className="block font-serif text-[17px] text-ink leading-tight truncate">{c.titre}</span>
                    <span className="block text-xs text-ink/50 mt-0.5">{c.sousTitre}</span>
                  </span>
                  <span className={`shrink-0 text-[11px] font-semibold border rounded-full px-3 py-1 ${ui.badge}`}>
                    {ui.label(c.joursRestants)}
                  </span>
                </a>
              )
            })}
          </div>
        )}
      </main>
    </>
  )
}
