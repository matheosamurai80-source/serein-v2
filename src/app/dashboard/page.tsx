'use client'
import { useEffect, useState } from 'react'
import { SereinNav } from '@/components/ui/nav'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { serviceTypeToCategory, type ServiceType, type CommitmentFrequency, type Urgency } from '@/lib/commitments/logic'
import { buildDashboardSummary, type DashCommitment, type DashReminder } from '@/lib/dashboard/logic'
import { reminderTiming, daysUntil } from '@/lib/reminders/logic'

interface CommitmentRow extends DashCommitment {
  service_type: ServiceType
  amount: number | null
  frequency: CommitmentFrequency
  anniversary_date: string | null
  cancellation_deadline: string | null
  cancellation_notice_days: number | null
}

const eur = (n: number) => n.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
const frDate = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })

const URGENCY_CLS: Record<Urgency, string> = {
  critique: 'bg-crimson/15 text-crimson border-crimson/30',
  bientot:  'bg-amber/15 text-amber border-amber/30',
  ok:       'bg-sage/12 text-moss border-sage/25',
  depassee: 'bg-ink/8 text-ink/50 border-ink/12',
}
const URGENCY_LABEL: Record<Urgency, string> = {
  critique: 'À résilier vite', bientot: 'Fenêtre proche', ok: 'Fenêtre ouverte', depassee: 'Échéance passée',
}

export default function DashboardPage() {
  const [commitments, setCommitments] = useState<CommitmentRow[]>([])
  const [reminders, setReminders] = useState<DashReminder[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    void (async () => {
      try {
        const supabase = createSupabaseBrowserClient()
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          const [{ data: c }, { data: r }] = await Promise.all([
            supabase.from('commitments').select('id, name, service_type, amount, frequency, anniversary_date, cancellation_deadline, cancellation_notice_days, status'),
            supabase.from('reminders').select('id, commitment_id, scheduled_for, status, message'),
          ])
          if (c) setCommitments(c as CommitmentRow[])
          if (r) setReminders(r as DashReminder[])
        }
      } catch { /* env Supabase absente */ }
      setLoaded(true)
    })()
  }, [])

  const s = buildDashboardSummary(commitments, reminders)
  const nameOf = (id: string) => commitments.find(c => c.id === id)?.name ?? 'Engagement'
  const isEmpty = loaded && commitments.length === 0

  return (
    <>
      <SereinNav />
      <main className="min-h-screen max-w-[720px] mx-auto px-5 py-8 flex flex-col items-center animate-fade-up">
        <p className="font-mono text-[11px] tracking-[.17em] uppercase text-moss mb-4 flex items-center gap-2.5">
          <span className="w-6 h-px bg-moss" />Tableau de bord<span className="w-6 h-px bg-moss" />
        </p>
        <h1 className="font-serif text-[clamp(26px,5.5vw,42px)] tracking-[-0.025em] leading-[1.15] text-ink mb-8 text-center">
          Tout Serein, <em className="text-moss">en un coup d&apos;œil.</em>
        </h1>

        {/* Chiffres clés */}
        <div className="w-full grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-surface border border-ink/10 rounded-2xl p-4 text-center">
            <p className="font-serif text-[28px] tracking-[-0.02em] text-ink" data-testid="kpi-monthly">{eur(s.monthlyTotal)} €</p>
            <p className="font-mono text-[10px] tracking-wider uppercase text-ink/45 mt-0.5">par mois</p>
          </div>
          <div className="bg-surface border border-ink/10 rounded-2xl p-4 text-center">
            <p className="font-serif text-[28px] tracking-[-0.02em] text-moss">{eur(s.annualTotal)} €</p>
            <p className="font-mono text-[10px] tracking-wider uppercase text-ink/45 mt-0.5">par an</p>
          </div>
          <div className="bg-surface border border-ink/10 rounded-2xl p-4 text-center">
            <p className="font-serif text-[28px] tracking-[-0.02em] text-ink" data-testid="kpi-active">{s.activeCount}</p>
            <p className="font-mono text-[10px] tracking-wider uppercase text-ink/45 mt-0.5">engagements</p>
          </div>
          <div className="bg-surface border border-ink/10 rounded-2xl p-4 text-center">
            <p className={`font-serif text-[28px] tracking-[-0.02em] ${s.dueRemindersCount > 0 ? 'text-amber' : 'text-ink'}`}>{s.dueRemindersCount}</p>
            <p className="font-mono text-[10px] tracking-wider uppercase text-ink/45 mt-0.5">à traiter</p>
          </div>
        </div>

        {isEmpty && (
          <div className="w-full bg-sage/8 border border-sage/20 rounded-2xl p-6 text-center mb-6">
            <p className="text-sm text-ink/70 leading-[1.6] mb-4">
              Rien à afficher pour l&apos;instant. Ajoutez votre premier engagement pour voir Serein travailler.
            </p>
            <a href="/engagements" className="inline-block text-[13px] font-semibold bg-sage text-cream rounded-full px-5 py-2.5 hover:bg-sage-light transition-colors">
              Ajouter un engagement →
            </a>
          </div>
        )}

        {/* Prochaine échéance */}
        {s.nextDeadline && (
          <div className="w-full bg-surface border border-ink/10 rounded-2xl p-5 mb-6">
            <div className="flex items-center justify-between gap-3 mb-1">
              <p className="font-mono text-[11px] tracking-[.13em] uppercase text-ink/50">Prochaine fenêtre de résiliation</p>
              <span className={`text-[11px] font-semibold border rounded-full px-3 py-1 ${URGENCY_CLS[s.nextDeadline.urgency]}`}>
                {URGENCY_LABEL[s.nextDeadline.urgency]}
              </span>
            </div>
            <p className="font-serif text-xl text-ink" data-testid="next-name">{s.nextDeadline.name}</p>
            <p className="text-[13.5px] text-ink/70 mb-3">à résilier avant le <strong className="text-ink">{frDate(s.nextDeadline.date)}</strong></p>
            <a href={`/resiliation?service=${encodeURIComponent(s.nextDeadline.name)}&category=${serviceTypeToCategory(commitments.find(c => c.id === s.nextDeadline!.commitmentId)?.service_type ?? 'other')}&commitment=${s.nextDeadline.commitmentId}`}
              className="inline-block text-[13px] font-semibold bg-sage text-cream rounded-full px-5 py-2.5 hover:bg-sage-light transition-colors">
              Générer la lettre →
            </a>
          </div>
        )}

        {/* Prochains rappels */}
        {s.upcomingReminders.length > 0 && (
          <div className="w-full bg-surface border border-ink/10 rounded-2xl p-5 mb-6">
            <p className="font-mono text-[11px] tracking-[.13em] uppercase text-ink/50 mb-3">Prochains rappels</p>
            <ul className="flex flex-col gap-2.5">
              {s.upcomingReminders.map(r => {
                const t = reminderTiming(r.scheduled_for)
                const when = t === 'aujourdhui' ? "Aujourd'hui" : t === 'passe' ? 'À traiter' : `Dans ${daysUntil(r.scheduled_for)} j`
                return (
                  <li key={r.id} className="flex items-center justify-between gap-3 text-[13.5px]">
                    <span className="text-ink truncate">{nameOf(r.commitment_id)}</span>
                    <span className={`font-mono text-[11px] flex-shrink-0 ${t !== 'a_venir' ? 'text-amber font-semibold' : 'text-ink/50'}`}>{when}</span>
                  </li>
                )
              })}
            </ul>
            <a href="/rappels" className="inline-block font-mono text-[11px] tracking-wider text-moss underline mt-3">Voir tous mes rappels →</a>
          </div>
        )}

        {/* Accès rapides */}
        <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { href: '/engagements', emoji: '📋', title: 'Engagements', desc: 'Suivre mes abonnements' },
            { href: '/rappels', emoji: '🔔', title: 'Rappels', desc: 'Être prévenu à temps' },
            { href: '/resiliation', emoji: '✉️', title: 'Lettre', desc: 'Générer une résiliation' },
          ].map(x => (
            <a key={x.href} href={x.href} className="bg-surface border border-ink/10 rounded-2xl p-5 hover:border-sage/40 transition-colors">
              <span className="text-2xl block mb-2">{x.emoji}</span>
              <p className="font-semibold text-ink text-sm">{x.title}</p>
              <p className="text-xs text-ink/50 mt-0.5">{x.desc}</p>
            </a>
          ))}
        </div>
      </main>
    </>
  )
}
