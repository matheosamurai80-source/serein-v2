'use client'
import { useEffect, useState } from 'react'
import { SereinNav } from '@/components/ui/nav'
import { useToast, Toast } from '@/components/ui/toast'
import {
  listSubscriptions, deleteSubscription, addCommitments, isGuest,
  type SubscriptionRow,
} from '@/lib/data/store'

// Abonnements détectés : la mémoire de la détection (relevés). Le client décide
// de suivre (→ engagement) ou d'ignorer. Serein arme, il n'agit jamais seul.

const FREQ_LABEL: Record<string, string> = {
  weekly: '/semaine', monthly: '/mois', quarterly: '/trimestre', yearly: '/an',
}

export default function AbonnementsPage() {
  const toast = useToast()
  const [items, setItems] = useState<SubscriptionRow[]>([])
  const [loaded, setLoaded] = useState(false)
  const [guest, setGuest] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      try {
        const [subs, g] = await Promise.all([listSubscriptions(), isGuest()])
        setItems(subs)
        setGuest(g)
      } catch { /* stockage indisponible : page consultable */ }
      setLoaded(true)
    })()
  }, [])

  const follow = async (s: SubscriptionRow) => {
    if (busy) return
    setBusy(s.id)
    try {
      await addCommitments([{ name: s.name, service_type: 'other', amount: s.amount, frequency: s.frequency, detected_automatically: true }])
      await deleteSubscription(s.id)
      setItems(prev => prev.filter(i => i.id !== s.id))
      toast.show(`${s.name} suivi dans vos engagements ✓`)
    } catch (e) {
      toast.show(e instanceof Error ? e.message : 'Impossible de suivre cet abonnement.')
    } finally { setBusy(null) }
  }

  const dismiss = async (s: SubscriptionRow) => {
    if (busy) return
    setBusy(s.id)
    try {
      await deleteSubscription(s.id)
      setItems(prev => prev.filter(i => i.id !== s.id))
    } catch (e) {
      toast.show(e instanceof Error ? e.message : 'Suppression impossible.')
    } finally { setBusy(null) }
  }

  const dormant = items.filter(i => i.dormant)

  return (
    <>
      <SereinNav />
      <main className="min-h-screen max-w-[640px] mx-auto px-5 py-8 flex flex-col items-center animate-fade-up">
        <p className="font-mono text-[11px] tracking-[.17em] uppercase text-moss mb-5 flex items-center gap-2.5">
          <span className="w-6 h-px bg-moss" />Abonnements détectés<span className="w-6 h-px bg-moss" />
        </p>
        <h1 className="font-serif text-[clamp(26px,5.5vw,44px)] tracking-[-0.025em] leading-[1.15] text-ink mb-3 text-center">
          Ce que Serein a <em className="text-moss">repéré.</em>
        </h1>
        <p className="text-sm text-ink/70 leading-[1.6] mb-6 text-center max-w-[440px]">
          Les prélèvements récurrents trouvés dans vos relevés — dont les
          « dormants », plus vus depuis longtemps. À vous de suivre ou d&apos;ignorer.
        </p>

        {loaded && guest && (
          <p data-testid="guest-hint" className="w-full font-mono text-[11px] text-ink/50 tracking-wider text-center mb-4">
            Mode sans compte : tout reste sur cet appareil.
          </p>
        )}

        {dormant.length > 0 && (
          <div className="w-full bg-amber/8 border border-amber/20 rounded-2xl p-4 mb-5" data-testid="dormant-banner">
            <p className="text-[13px] text-ink/80 leading-[1.55]">
              💤 <strong>{dormant.length} abonnement{dormant.length > 1 ? 's' : ''} dormant{dormant.length > 1 ? 's' : ''}</strong>
              {' '}— plus vu{dormant.length > 1 ? 's' : ''} récemment. Candidats à la résiliation.
            </p>
          </div>
        )}

        <div className="w-full flex flex-col gap-3">
          {loaded && items.length === 0 && (
            <p className="text-center text-sm text-ink/50 py-8">
              Rien de détecté pour l&apos;instant. Lancez une{' '}
              <a href="/analyse" className="text-moss underline">analyse de relevé</a>.
            </p>
          )}
          {items.map(s => (
            <div key={s.id} className="bg-surface border border-ink/10 rounded-2xl p-5" data-testid="detected-sub">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="min-w-0">
                  <p className="font-serif text-lg text-ink truncate flex items-center gap-2">
                    {s.name}
                    {s.dormant && <span className="flex-shrink-0 text-[10.5px] font-semibold border rounded-full px-2.5 py-0.5 bg-amber/12 text-amber border-amber/30">Dormant</span>}
                  </p>
                  <p className="font-mono text-[11px] text-ink/50 tracking-wider">
                    {s.amount.toLocaleString('fr-FR')} €{FREQ_LABEL[s.frequency] ?? ''}
                    {s.occurrences ? <> · vu {s.occurrences} fois</> : null}
                    {s.confidence != null ? <> · fiabilité {Math.round(s.confidence * 100)} %</> : null}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                <a href={`/resiliation?service=${encodeURIComponent(s.name)}`} data-testid="sub-resiliation"
                  className="text-[13px] font-semibold bg-sage text-cream rounded-full px-4 py-2 hover:bg-sage-light transition-colors">
                  Résilier — générer la lettre →
                </a>
                <button onClick={() => follow(s)} disabled={busy === s.id}
                  className="text-[13px] text-moss border border-sage/30 rounded-full px-4 py-2 hover:bg-sage/8 transition-colors disabled:opacity-50">
                  Suivre
                </button>
                <button onClick={() => dismiss(s)} disabled={busy === s.id}
                  className="text-[13px] text-ink/50 rounded-full px-3 py-2 hover:text-crimson transition-colors disabled:opacity-50" aria-label="ignorer">
                  Ignorer
                </button>
              </div>
            </div>
          ))}
        </div>

        <Toast message={toast.message} visible={toast.visible} onHide={toast.hide} />
      </main>
    </>
  )
}
