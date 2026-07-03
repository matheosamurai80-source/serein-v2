'use client'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { SereinNav } from '@/components/ui/nav'
import { useToast, Toast } from '@/components/ui/toast'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { ensureUserId } from '@/lib/supabase/session'
import { effectiveDeadline, type ServiceType, type CommitmentFrequency } from '@/lib/commitments/logic'
import {
  buildReminderForCommitment, reminderTiming, daysUntil, isDue, sortReminders,
  type ReminderStatus,
} from '@/lib/reminders/logic'

interface Commitment {
  id: string
  name: string
  service_type: ServiceType
  amount: number | null
  frequency: CommitmentFrequency
  anniversary_date: string | null
  cancellation_deadline: string | null
  cancellation_notice_days: number | null
  status: string
}

interface Reminder {
  id: string
  commitment_id: string
  kind: string
  scheduled_for: string
  channel: string
  message: string | null
  status: ReminderStatus
}

const frDateTime = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

function timingLabel(scheduled: string): string {
  const t = reminderTiming(scheduled)
  if (t === 'aujourdhui') return "Aujourd'hui"
  if (t === 'passe') return 'À traiter'
  const d = daysUntil(scheduled)
  return d === 1 ? 'Demain' : `Dans ${d} jours`
}

export default function RappelsPage() {
  const toast = useToast()
  const [commitments, setCommitments] = useState<Commitment[]>([])
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [loaded, setLoaded] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      try {
        const supabase = createSupabaseBrowserClient()
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          const [{ data: c }, { data: r }] = await Promise.all([
            supabase.from('commitments').select('id, name, service_type, amount, frequency, anniversary_date, cancellation_deadline, cancellation_notice_days, status'),
            supabase.from('reminders').select('id, commitment_id, kind, scheduled_for, channel, message, status'),
          ])
          if (c) setCommitments(c)
          if (r) setReminders(r)
        }
      } catch { /* env Supabase absente : la page reste consultable */ }
      setLoaded(true)
    })()
  }, [])

  // Engagements actifs, avec échéance, sans rappel en attente → suggestions
  const suggestions = commitments.filter(c =>
    c.status === 'active'
    && effectiveDeadline(c)
    && !reminders.some(r => r.commitment_id === c.id && r.status === 'pending')
  )

  const createReminder = async (c: Commitment) => {
    if (busy) return
    setBusy(c.id)
    try {
      const draft = buildReminderForCommitment(c)
      if (!draft) return
      const supabase = createSupabaseBrowserClient()
      const userId = await ensureUserId(supabase)
      const { data, error } = await supabase
        .from('reminders')
        .insert({ user_id: userId, commitment_id: c.id, ...draft })
        .select('id, commitment_id, kind, scheduled_for, channel, message, status')
        .single()
      if (error) throw new Error(error.message)
      if (data) setReminders(prev => [...prev, data])
      toast.show('Rappel programmé ✓')
    } catch (e) {
      toast.show(e instanceof Error ? e.message : 'Impossible de créer le rappel.')
    } finally {
      setBusy(null)
    }
  }

  const setStatus = async (r: Reminder, status: ReminderStatus, msg: string) => {
    try {
      const supabase = createSupabaseBrowserClient()
      const { error } = await supabase.from('reminders').update({ status }).eq('id', r.id)
      if (error) throw new Error(error.message)
      setReminders(prev => prev.map(x => x.id === r.id ? { ...x, status } : x))
      toast.show(msg)
    } catch (e) { toast.show(e instanceof Error ? e.message : 'Mise à jour impossible.') }
  }

  const remove = async (r: Reminder) => {
    try {
      const supabase = createSupabaseBrowserClient()
      const { error } = await supabase.from('reminders').delete().eq('id', r.id)
      if (error) throw new Error(error.message)
      setReminders(prev => prev.filter(x => x.id !== r.id))
    } catch (e) { toast.show(e instanceof Error ? e.message : 'Suppression impossible.') }
  }

  const nameOf = (id: string) => commitments.find(c => c.id === id)?.name ?? 'Engagement'
  const sorted = sortReminders(reminders.filter(r => r.status !== 'cancelled'))
  const dueCount = reminders.filter(r => isDue(r)).length

  return (
    <>
      <SereinNav />
      <main className="min-h-screen max-w-[640px] mx-auto px-5 py-8 flex flex-col items-center animate-fade-up">
        <p className="font-mono text-[11px] tracking-[.17em] uppercase text-moss mb-5 flex items-center gap-2.5">
          <span className="w-6 h-px bg-moss" />Rappels<span className="w-6 h-px bg-moss" />
        </p>
        <h1 className="font-serif text-[clamp(26px,5.5vw,44px)] tracking-[-0.025em] leading-[1.15] text-ink mb-3 text-center">
          Serein vous prévient <em className="text-moss">à temps.</em>
        </h1>
        <p className="text-sm text-ink/70 leading-[1.6] mb-8 text-center max-w-[440px]">
          Un rappel avant chaque fenêtre de résiliation. Vous gardez la main :
          Serein alerte, c&apos;est vous qui agissez.
          {dueCount > 0 && <><br /><span className="text-amber font-semibold">{dueCount} rappel{dueCount > 1 ? 's' : ''} à traiter maintenant.</span></>}
        </p>

        {/* Suggestions depuis les engagements */}
        {suggestions.length > 0 && (
          <div className="w-full mb-6">
            <p className="font-mono text-[11px] tracking-[.13em] uppercase text-ink/50 mb-3">
              À programmer ({suggestions.length})
            </p>
            <div className="flex flex-col gap-3">
              {suggestions.map(c => {
                const deadline = effectiveDeadline(c)!
                return (
                  <div key={c.id} className="bg-amber/8 border border-amber/20 rounded-2xl p-4 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-serif text-base text-ink truncate">{c.name}</p>
                      <p className="font-mono text-[11px] text-ink/50 tracking-wider">
                        résiliable avant le {frDateTime(deadline)}
                      </p>
                    </div>
                    <Button size="sm" onClick={() => createReminder(c)} loading={busy === c.id}>
                      Me rappeler
                    </Button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Liste des rappels */}
        <div className="w-full">
          <p className="font-mono text-[11px] tracking-[.13em] uppercase text-ink/50 mb-3">Mes rappels</p>
          {loaded && sorted.length === 0 && suggestions.length === 0 && (
            <p className="text-center text-sm text-ink/50 py-6">
              Aucun rappel. Ajoutez des engagements avec une échéance depuis la page{' '}
              <a href="/engagements" className="text-moss underline">Engagements</a>.
            </p>
          )}
          <div className="flex flex-col gap-3">
            {sorted.map(r => {
              const due = isDue(r)
              const read = r.status === 'read'
              return (
                <div key={r.id} data-testid="reminder"
                  className={`rounded-2xl p-5 border ${due ? 'bg-amber/10 border-amber/25' : read ? 'bg-surface border-ink/10' : 'bg-surface border-ink/10'}`}>
                  <div className="flex items-start justify-between gap-3 mb-1.5">
                    <p className={`font-serif text-lg ${read ? 'text-ink/45 line-through' : 'text-ink'} truncate`}>{nameOf(r.commitment_id)}</p>
                    <span className={`flex-shrink-0 text-[11px] font-semibold border rounded-full px-3 py-1 ${
                      due ? 'bg-amber/15 text-amber border-amber/30' : 'bg-sage/12 text-moss border-sage/25'}`}>
                      {read ? 'Lu' : timingLabel(r.scheduled_for)}
                    </span>
                  </div>
                  {r.message && <p className="text-[13.5px] text-ink/70 leading-[1.55] mb-3">{r.message}</p>}
                  <div className="flex flex-wrap gap-2">
                    {!read && (
                      <button onClick={() => setStatus(r, 'read', 'Rappel marqué comme lu')}
                        className="text-[13px] text-moss border border-sage/30 rounded-full px-4 py-2 hover:bg-sage/8 transition-colors">
                        Marquer comme lu
                      </button>
                    )}
                    <a href={`/resiliation?service=${encodeURIComponent(nameOf(r.commitment_id))}`}
                      className="text-[13px] font-semibold bg-sage text-cream rounded-full px-4 py-2 hover:bg-sage-light transition-colors">
                      Générer la lettre →
                    </a>
                    <button onClick={() => remove(r)}
                      className="text-[13px] text-ink/50 rounded-full px-3 py-2 hover:text-crimson transition-colors">
                      Supprimer
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <Toast message={toast.message} visible={toast.visible} onHide={toast.hide} />
      </main>
    </>
  )
}
