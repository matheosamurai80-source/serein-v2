'use client'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { SereinNav } from '@/components/ui/nav'
import { useToast, Toast } from '@/components/ui/toast'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { ensureUserId } from '@/lib/supabase/session'
import {
  monthlyEquivalent, effectiveDeadline, urgencyOf, sortCommitments,
  totalMonthly, serviceTypeToCategory,
  type ServiceType, type CommitmentFrequency, type Urgency,
} from '@/lib/commitments/logic'

interface Commitment {
  id: string
  name: string
  provider: string | null
  service_type: ServiceType
  amount: number | null
  frequency: CommitmentFrequency
  anniversary_date: string | null
  cancellation_deadline: string | null
  cancellation_notice_days: number | null
  status: string
}

const SERVICE_TYPES: { value: ServiceType; label: string }[] = [
  { value: 'insurance', label: 'Assurance' },
  { value: 'energy',    label: 'Électricité / gaz' },
  { value: 'water',     label: 'Eau' },
  { value: 'telecom',   label: 'Téléphone / internet' },
  { value: 'streaming', label: 'Streaming' },
  { value: 'gym',       label: 'Salle de sport' },
  { value: 'loan',      label: 'Crédit' },
  { value: 'rent',      label: 'Loyer' },
  { value: 'tax',       label: 'Impôts / taxes' },
  { value: 'other',     label: 'Autre' },
]

const FREQUENCIES: { value: CommitmentFrequency; label: string }[] = [
  { value: 'monthly',   label: 'Mensuel' },
  { value: 'quarterly', label: 'Trimestriel' },
  { value: 'yearly',    label: 'Annuel' },
  { value: 'weekly',    label: 'Hebdomadaire' },
  { value: 'one_time',  label: 'Ponctuel' },
]

const URGENCY_UI: Record<Urgency, { label: string; cls: string }> = {
  critique: { label: 'À résilier sous 7 j', cls: 'bg-crimson/15 text-crimson border-crimson/30' },
  bientot:  { label: 'Fenêtre dans 30 j',   cls: 'bg-amber/15 text-amber-light border-amber/30' },
  ok:       { label: 'Fenêtre ouverte',     cls: 'bg-sage/12 text-sage-light border-sage/25' },
  depassee: { label: 'Échéance passée',     cls: 'bg-white/6 text-white/38 border-white/10' },
}

const inputCls =
  'w-full bg-white/4 border border-white/10 rounded-xl px-4 py-3 text-sm text-warm ' +
  'placeholder:text-white/25 focus:outline-none focus:border-sage/60 transition-colors'
const labelCls = 'font-mono text-[11px] tracking-[.13em] uppercase text-white/38 mb-1.5 block text-left'

const frDate = (iso: string) => new Date(iso).toLocaleDateString('fr-FR')

export default function EngagementsPage() {
  const toast = useToast()
  const [items, setItems] = useState<Commitment[]>([])
  const [letteredIds, setLetteredIds] = useState<Set<string>>(new Set())
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState('')
  const [serviceType, setServiceType] = useState<ServiceType>('insurance')
  const [amount, setAmount] = useState('')
  const [frequency, setFrequency] = useState<CommitmentFrequency>('monthly')
  const [anniversary, setAnniversary] = useState('')
  const [noticeDays, setNoticeDays] = useState('')

  useEffect(() => {
    void (async () => {
      try {
        const supabase = createSupabaseBrowserClient()
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          const [{ data }, { data: letters }] = await Promise.all([
            supabase.from('commitments').select('id, name, provider, service_type, amount, frequency, anniversary_date, cancellation_deadline, cancellation_notice_days, status'),
            supabase.from('cancellation_letters').select('commitment_id'),
          ])
          if (data) setItems(data)
          if (letters) setLetteredIds(new Set(letters.map(l => l.commitment_id).filter(Boolean) as string[]))
        }
      } catch { /* env Supabase absente : la page reste consultable */ }
      setLoaded(true)
    })()
  }, [])

  const addCommitment = async () => {
    if (!name || saving) return
    setSaving(true)
    try {
      const supabase = createSupabaseBrowserClient()
      const userId = await ensureUserId(supabase)
      const parsedAmount = parseFloat(amount.replace(',', '.'))
      const { data, error } = await supabase
        .from('commitments')
        .insert({
          user_id: userId,
          name,
          service_type: serviceType,
          amount: parsedAmount > 0 ? parsedAmount : null,
          frequency,
          anniversary_date: anniversary || null,
          cancellation_notice_days: Number.isInteger(parseInt(noticeDays, 10)) && parseInt(noticeDays, 10) >= 0
            ? parseInt(noticeDays, 10) : null,
        })
        .select('id, name, provider, service_type, amount, frequency, anniversary_date, cancellation_deadline, cancellation_notice_days, status')
        .single()
      if (error) throw new Error(error.message)
      if (data) setItems(prev => [...prev, data])
      setName(''); setAmount(''); setAnniversary(''); setNoticeDays('')
      toast.show('Engagement ajouté ✓')
    } catch (e) {
      toast.show(e instanceof Error ? e.message : 'Ajout impossible.')
    } finally {
      setSaving(false)
    }
  }

  const markCancelled = async (c: Commitment) => {
    try {
      const supabase = createSupabaseBrowserClient()
      const { error } = await supabase.from('commitments').update({ status: 'cancelled' }).eq('id', c.id)
      if (error) throw new Error(error.message)
      setItems(prev => prev.map(i => i.id === c.id ? { ...i, status: 'cancelled' } : i))
      toast.show(`${c.name} marqué comme résilié 🎉`)
    } catch (e) { toast.show(e instanceof Error ? e.message : 'Mise à jour impossible.') }
  }

  const remove = async (c: Commitment) => {
    try {
      const supabase = createSupabaseBrowserClient()
      const { error } = await supabase.from('commitments').delete().eq('id', c.id)
      if (error) throw new Error(error.message)
      setItems(prev => prev.filter(i => i.id !== c.id))
    } catch (e) { toast.show(e instanceof Error ? e.message : 'Suppression impossible.') }
  }

  const actives = items.filter(i => i.status === 'active')
  const total = totalMonthly(items)
  const sorted = sortCommitments(actives)
  const cancelled = items.filter(i => i.status !== 'active')

  return (
    <>
    <SereinNav />
    <main className="min-h-screen max-w-[640px] mx-auto px-5 py-8 flex flex-col items-center animate-fade-up">
      <p className="font-mono text-[11px] tracking-[.17em] uppercase text-sage mb-5 flex items-center gap-2.5">
        <span className="w-6 h-px bg-moss" />Engagements<span className="w-6 h-px bg-moss" />
      </p>
      <h1 className="font-serif text-[clamp(26px,5.5vw,44px)] tracking-[-0.025em] leading-[1.15] text-warm mb-3 text-center">
        Vos engagements, <em className="text-sage-light">sous contrôle.</em>
      </h1>
      <p className="text-sm text-white/65 leading-[1.6] mb-8 text-center max-w-[440px]">
        Serein surveille les fenêtres de résiliation et vous prévient avant qu&apos;elles ne se referment.
        À vous de décider — la lettre est prête quand vous l&apos;êtes.
      </p>

      {/* Total mensuel */}
      <div className="w-full bg-sage/7 border border-sage/16 rounded-2xl p-5 mb-6 flex items-baseline justify-between">
        <span className="font-mono text-[11px] tracking-[.13em] uppercase text-sage">Total récurrent</span>
        <span className="font-serif text-3xl text-warm" data-testid="total">
          {total.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} €<span className="text-base text-white/38">/mois</span>
        </span>
      </div>

      {/* Formulaire d'ajout */}
      <div className="w-full bg-white/3 border border-white/7 rounded-2xl p-6 flex flex-col gap-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls} htmlFor="cname">Nom de l&apos;engagement *</label>
            <input id="cname" className={inputCls} placeholder="Ex. Assurance auto AXA"
              value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div>
            <label className={labelCls} htmlFor="ctype">Type</label>
            <select id="ctype" className={inputCls} value={serviceType}
              onChange={e => setServiceType(e.target.value as ServiceType)}>
              {SERVICE_TYPES.map(s => <option key={s.value} value={s.value} className="bg-night-2">{s.label}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <label className={labelCls} htmlFor="camount">Montant (€)</label>
            <input id="camount" className={inputCls} inputMode="decimal" placeholder="29,90"
              value={amount} onChange={e => setAmount(e.target.value)} />
          </div>
          <div>
            <label className={labelCls} htmlFor="cfreq">Fréquence</label>
            <select id="cfreq" className={inputCls} value={frequency}
              onChange={e => setFrequency(e.target.value as CommitmentFrequency)}>
              {FREQUENCIES.map(f => <option key={f.value} value={f.value} className="bg-night-2">{f.label}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls} htmlFor="cann">Échéance annuelle</label>
            <input id="cann" type="date" className={inputCls}
              value={anniversary} onChange={e => setAnniversary(e.target.value)} />
          </div>
          <div>
            <label className={labelCls} htmlFor="cnotice">Préavis (jours)</label>
            <input id="cnotice" className={inputCls} inputMode="numeric" placeholder="60"
              value={noticeDays} onChange={e => setNoticeDays(e.target.value)} />
          </div>
        </div>
        <Button onClick={addCommitment} disabled={!name} loading={saving}
          className={!name ? 'opacity-40 cursor-not-allowed' : ''}>
          Ajouter cet engagement
        </Button>
      </div>

      {/* Liste triée par urgence */}
      <div className="w-full flex flex-col gap-3">
        {loaded && actives.length === 0 && (
          <p className="text-center text-sm text-white/38 py-6">
            Aucun engagement suivi pour l&apos;instant — ajoutez le premier ci-dessus.
          </p>
        )}
        {sorted.map(c => {
          const u = urgencyOf(c)
          const deadline = effectiveDeadline(c)
          const monthly = monthlyEquivalent(c.amount, c.frequency)
          return (
            <div key={c.id} className="bg-white/3 border border-white/7 rounded-2xl p-5" data-testid="commitment">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="min-w-0">
                  <p className="font-serif text-lg text-warm truncate">{c.name}</p>
                  <p className="font-mono text-[11px] text-white/38 tracking-wider">
                    {SERVICE_TYPES.find(s => s.value === c.service_type)?.label}
                    {monthly > 0 && <> · {monthly.toLocaleString('fr-FR')} €/mois</>}
                    {deadline && <> · résiliable avant le {frDate(deadline)}</>}
                  </p>
                </div>
                {u && (
                  <span className={`flex-shrink-0 text-[11px] font-semibold border rounded-full px-3 py-1 ${URGENCY_UI[u].cls}`}>
                    {URGENCY_UI[u].label}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                <a href={`/resiliation?service=${encodeURIComponent(c.name)}&category=${serviceTypeToCategory(c.service_type)}&commitment=${c.id}`}
                  className="text-[13px] font-semibold bg-sage text-night-2 rounded-full px-4 py-2 hover:bg-sage-light transition-colors">
                  {letteredIds.has(c.id) ? 'Revoir la lettre →' : 'Générer la lettre →'}
                </a>
                <button onClick={() => markCancelled(c)}
                  className="text-[13px] text-sage-light border border-sage/30 rounded-full px-4 py-2 hover:bg-sage/8 transition-colors">
                  Résilié ✓
                </button>
                <button onClick={() => remove(c)}
                  className="text-[13px] text-white/38 rounded-full px-3 py-2 hover:text-crimson transition-colors" aria-label="supprimer">
                  Supprimer
                </button>
              </div>
            </div>
          )
        })}
        {cancelled.length > 0 && (
          <p className="font-mono text-[11px] text-white/38 tracking-wider text-center mt-2">
            {cancelled.length} engagement{cancelled.length > 1 ? 's' : ''} résilié{cancelled.length > 1 ? 's' : ''} —
            {' '}{cancelled.map(c => c.name).join(', ')}
          </p>
        )}
      </div>

      <Toast message={toast.message} visible={toast.visible} onHide={toast.hide} />
    </main>
    </>
  )
}
