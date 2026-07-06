'use client'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { SereinNav } from '@/components/ui/nav'
import { useToast, Toast } from '@/components/ui/toast'
import {
  listCommitments, addCommitments, updateCommitment, deleteCommitment,
  listLetterCommitmentIds, isGuest,
  listFactures, addFacture, updateFacture, deleteFacture, type FactureRow,
} from '@/lib/data/store'
import {
  nextDueDate, refreshedDueDate, factureUrgency, validateFacture,
  addMonthsClamped, type FactureMode,
} from '@/lib/factures/logic'
import {
  monthlyEquivalent, effectiveDeadline, urgencyOf, sortCommitments,
  totalMonthly, serviceTypeToCategory,
  type ServiceType, type CommitmentFrequency, type Urgency,
} from '@/lib/commitments/logic'
import { unikAdviceFor } from '@/lib/unik/logic'
import { offerLineFor } from '@/lib/offres/logic'
import { LiensUtiles } from '@/components/liens-utiles'

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
  bientot:  { label: 'Fenêtre dans 30 j',   cls: 'bg-amber/15 text-amber border-amber/30' },
  ok:       { label: 'Fenêtre ouverte',     cls: 'bg-sage/12 text-moss border-sage/25' },
  depassee: { label: 'Échéance passée',     cls: 'bg-ink/8 text-ink/50 border-ink/12' },
}

const inputCls =
  'w-full bg-surface border border-ink/12 rounded-xl px-4 py-3 text-sm text-ink ' +
  'placeholder:text-ink/35 focus:outline-none focus:border-sage/60 transition-colors'
const labelCls = 'font-mono text-[11px] tracking-[.13em] uppercase text-ink/50 mb-1.5 block text-left'

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
  const [guest, setGuest] = useState(false)
  const [factures, setFactures] = useState<FactureRow[]>([])
  const [fName, setFName] = useState('')
  const [fAmount, setFAmount] = useState('')
  const [fMode, setFMode] = useState<FactureMode>('interval')
  const [fStart, setFStart] = useState('')
  const [fInterval, setFInterval] = useState('6')
  const [fDue, setFDue] = useState('')
  const [fNotice, setFNotice] = useState('14')
  const [fSaving, setFSaving] = useState(false)

  useEffect(() => {
    void (async () => {
      try {
        const [data, letterIds, g, facts] = await Promise.all([
          listCommitments(), listLetterCommitmentIds(), isGuest(), listFactures(),
        ])
        setItems(data as Commitment[])
        setLetteredIds(new Set(letterIds))
        setGuest(g)
        // Mode A : les échéances passées avancent automatiquement (et on persiste)
        const refreshed = await Promise.all(facts.map(async f => {
          const due = refreshedDueDate(f)
          if (f.mode === 'interval' && due && due !== f.next_due_date) {
            try { await updateFacture(f.id, { next_due_date: due }) } catch { /* réessaiera */ }
            return { ...f, next_due_date: due }
          }
          return f
        }))
        setFactures(refreshed)
      } catch { /* stockage indisponible : la page reste consultable */ }
      setLoaded(true)
    })()
  }, [])

  const addFactureSubmit = async () => {
    if (fSaving) return
    const parsedAmount = parseFloat(fAmount.replace(',', '.'))
    const input = {
      name: fName.trim(),
      amount: parsedAmount > 0 ? parsedAmount : null,
      mode: fMode,
      start_date: fMode === 'interval' ? (fStart || null) : null,
      interval_months: fMode === 'interval' ? (parseInt(fInterval, 10) || null) : null,
      next_due_date: fMode === 'manual' ? (fDue || null) : null,
      notice_days: Number.isInteger(parseInt(fNotice, 10)) ? parseInt(fNotice, 10) : 14,
    }
    const err = validateFacture(input)
    if (err) { toast.show(err); return }
    setFSaving(true)
    try {
      const withDue = { ...input, next_due_date: nextDueDate({ ...input, status: 'active' } as FactureRow) }
      const row = await addFacture(withDue)
      setFactures(prev => [...prev, row])
      setFName(''); setFAmount(''); setFStart(''); setFDue('')
      toast.show('Facture ajoutée ✓ — rappel visible dans Rappels')
    } catch (e) {
      toast.show(e instanceof Error ? e.message : 'Ajout impossible.')
    } finally {
      setFSaving(false)
    }
  }

  const markFacturePaid = async (f: FactureRow) => {
    if (f.mode !== 'interval' || !f.next_due_date || !f.interval_months) return
    try {
      // payée = on passe à l'échéance suivante (échéance courante + intervalle)
      const bumped = addMonthsClamped(f.next_due_date, f.interval_months)
      await updateFacture(f.id, { next_due_date: bumped })
      setFactures(prev => prev.map(x => x.id === f.id ? { ...x, next_due_date: bumped } : x))
      toast.show(`${f.name} payée ✓ — prochaine échéance ${frDate(bumped)}`)
    } catch (e) { toast.show(e instanceof Error ? e.message : 'Mise à jour impossible.') }
  }

  const setFactureDate = async (f: FactureRow, date: string) => {
    if (!date) return
    try {
      await updateFacture(f.id, { next_due_date: date })
      setFactures(prev => prev.map(x => x.id === f.id ? { ...x, next_due_date: date } : x))
      toast.show('Échéance mise à jour ✓')
    } catch (e) { toast.show(e instanceof Error ? e.message : 'Mise à jour impossible.') }
  }

  const removeFacture = async (f: FactureRow) => {
    try {
      await deleteFacture(f.id)
      setFactures(prev => prev.filter(x => x.id !== f.id))
    } catch (e) { toast.show(e instanceof Error ? e.message : 'Suppression impossible.') }
  }

  const addCommitment = async () => {
    if (!name || saving) return
    setSaving(true)
    try {
      const parsedAmount = parseFloat(amount.replace(',', '.'))
      const [data] = await addCommitments([{
        name,
        service_type: serviceType,
        amount: parsedAmount > 0 ? parsedAmount : null,
        frequency,
        anniversary_date: anniversary || null,
        cancellation_notice_days: Number.isInteger(parseInt(noticeDays, 10)) && parseInt(noticeDays, 10) >= 0
          ? parseInt(noticeDays, 10) : null,
      }])
      if (data) setItems(prev => [...prev, data as Commitment])
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
      await updateCommitment(c.id, { status: 'cancelled' })
      setItems(prev => prev.map(i => i.id === c.id ? { ...i, status: 'cancelled' } : i))
      toast.show(`${c.name} marqué comme résilié 🎉`)
    } catch (e) { toast.show(e instanceof Error ? e.message : 'Mise à jour impossible.') }
  }

  const remove = async (c: Commitment) => {
    try {
      await deleteCommitment(c.id)
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
      <p className="font-mono text-[11px] tracking-[.17em] uppercase text-moss mb-5 flex items-center gap-2.5">
        <span className="w-6 h-px bg-moss" />Engagements<span className="w-6 h-px bg-moss" />
      </p>
      <h1 className="font-serif text-[clamp(26px,5.5vw,44px)] tracking-[-0.025em] leading-[1.15] text-ink mb-3 text-center">
        Vos engagements, <em className="text-moss">sous contrôle.</em>
      </h1>
      <p className="text-sm text-ink/70 leading-[1.6] mb-8 text-center max-w-[440px]">
        Serein surveille les fenêtres de résiliation et vous prévient avant qu&apos;elles ne se referment.
        À vous de décider — la lettre est prête quand vous l&apos;êtes.
      </p>

      {loaded && guest && (
        <p data-testid="guest-hint" className="w-full font-mono text-[11px] text-ink/50 tracking-wider text-center mb-4 leading-[1.7]">
          Mode sans compte : tout est enregistré sur cet appareil.{' '}
          <a href="/connexion" className="text-moss underline">Créez un compte</a> pour retrouver vos données partout.
        </p>
      )}

      {/* Total mensuel */}
      <div className="w-full bg-sage/7 border border-sage/16 rounded-2xl p-5 mb-6 flex items-baseline justify-between">
        <span className="font-mono text-[11px] tracking-[.13em] uppercase text-moss">Total récurrent</span>
        <span className="font-serif text-3xl text-ink" data-testid="total">
          {total.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} €<span className="text-base text-ink/50">/mois</span>
        </span>
      </div>

      {/* Formulaire d'ajout */}
      <div className="w-full bg-surface border border-ink/10 rounded-2xl p-6 flex flex-col gap-4 mb-6">
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
              {SERVICE_TYPES.map(s => <option key={s.value} value={s.value} className="bg-surface">{s.label}</option>)}
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
              {FREQUENCIES.map(f => <option key={f.value} value={f.value} className="bg-surface">{f.label}</option>)}
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
          <p className="text-center text-sm text-ink/50 py-6">
            Aucun engagement suivi pour l&apos;instant — ajoutez le premier ci-dessus.
          </p>
        )}
        {sorted.map(c => {
          const u = urgencyOf(c)
          const deadline = effectiveDeadline(c)
          const monthly = monthlyEquivalent(c.amount, c.frequency)
          const advice = unikAdviceFor(c)
          const offer = c.status === 'active' ? offerLineFor(c) : null
          return (
            <div key={c.id} className="bg-surface border border-ink/10 rounded-2xl p-5" data-testid="commitment">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="min-w-0">
                  <p className="font-serif text-lg text-ink truncate">{c.name}</p>
                  <p className="font-mono text-[11px] text-ink/50 tracking-wider">
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
              {advice && (
                <p className="text-[12.5px] text-ink/70 leading-[1.55] bg-sage/7 border border-sage/15 rounded-xl px-3.5 py-2.5 mt-2" data-testid="unik-advice">
                  <span className="font-semibold text-moss">Unik · </span>{advice.text}
                </p>
              )}
              {offer && (
                <p className="text-[12.5px] text-ink/70 leading-[1.55] bg-amber/8 border border-amber/20 rounded-xl px-3.5 py-2.5 mt-2" data-testid="offer-line">
                  <span className="font-semibold text-amber">💡 Offre · </span>{offer}
                </p>
              )}
              <div className="flex flex-wrap gap-2 mt-3">
                <a href={`/resiliation?service=${encodeURIComponent(c.name)}&category=${serviceTypeToCategory(c.service_type)}&commitment=${c.id}`}
                  className="text-[13px] font-semibold bg-sage text-cream rounded-full px-4 py-2 hover:bg-sage-light transition-colors">
                  {letteredIds.has(c.id) ? 'Revoir la lettre →' : 'Générer la lettre →'}
                </a>
                <button onClick={() => markCancelled(c)}
                  className="text-[13px] text-moss border border-sage/30 rounded-full px-4 py-2 hover:bg-sage/8 transition-colors">
                  Résilié ✓
                </button>
                <button onClick={() => remove(c)}
                  className="text-[13px] text-ink/50 rounded-full px-3 py-2 hover:text-crimson transition-colors" aria-label="supprimer">
                  Supprimer
                </button>
              </div>
            </div>
          )
        })}
        {cancelled.length > 0 && (
          <p className="font-mono text-[11px] text-ink/50 tracking-wider text-center mt-2">
            {cancelled.length} engagement{cancelled.length > 1 ? 's' : ''} résilié{cancelled.length > 1 ? 's' : ''} —
            {' '}{cancelled.map(c => c.name).join(', ')}
          </p>
        )}
      </div>

      {/* ── FACTURES PONCTUELLES — séparées des abonnements récurrents ── */}
      <div className="w-full mt-8" data-testid="factures-section">
        <p className="font-mono text-[11px] tracking-[.17em] uppercase text-moss mb-3 flex items-center gap-2.5">
          <span className="w-6 h-px bg-moss" />Factures ponctuelles<span className="w-6 h-px bg-moss" />
        </p>
        <p className="text-[13px] text-ink/60 leading-[1.6] mb-4 text-center">
          Eau, taxe foncière, assurance annuelle… les factures qui tombent 1 à 2 fois par an.
          Serein calcule (ou retient) l&apos;échéance et vous prévient avant.
        </p>

        <div className="w-full bg-surface border border-ink/10 rounded-2xl p-6 flex flex-col gap-4 mb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls} htmlFor="fname">Nom de la facture *</label>
              <input id="fname" className={inputCls} placeholder="Ex. Facture d'eau Veolia"
                value={fName} onChange={e => setFName(e.target.value)} />
            </div>
            <div>
              <label className={labelCls} htmlFor="famount">Montant (€)</label>
              <input id="famount" className={inputCls} inputMode="decimal" placeholder="85"
                value={fAmount} onChange={e => setFAmount(e.target.value)} />
            </div>
          </div>

          <div>
            <label className={labelCls}>Mode de rappel</label>
            <div className="flex gap-2" data-testid="facture-mode">
              <button type="button" onClick={() => setFMode('interval')}
                className={`flex-1 text-[13px] font-semibold rounded-xl px-3 py-2.5 border transition-colors ${fMode === 'interval' ? 'bg-sage/12 text-moss border-sage/40' : 'bg-surface text-ink/55 border-ink/12'}`}>
                A · Fréquence calculée
              </button>
              <button type="button" onClick={() => setFMode('manual')}
                className={`flex-1 text-[13px] font-semibold rounded-xl px-3 py-2.5 border transition-colors ${fMode === 'manual' ? 'bg-sage/12 text-moss border-sage/40' : 'bg-surface text-ink/55 border-ink/12'}`}>
                B · Dates fixes manuelles
              </button>
            </div>
            <p className="text-[11.5px] text-ink/50 mt-1.5 leading-[1.5]">
              {fMode === 'interval'
                ? 'La prochaine échéance est calculée automatiquement et se relance après chaque passage.'
                : 'Vous saisissez chaque date vous-même — rien n\'est recalculé sans vous.'}
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {fMode === 'interval' ? (
              <>
                <div>
                  <label className={labelCls} htmlFor="fstart">1re échéance *</label>
                  <input id="fstart" type="date" className={inputCls}
                    value={fStart} onChange={e => setFStart(e.target.value)} />
                </div>
                <div>
                  <label className={labelCls} htmlFor="finterval">Tous les (mois) *</label>
                  <input id="finterval" className={inputCls} inputMode="numeric" placeholder="6"
                    value={fInterval} onChange={e => setFInterval(e.target.value)} />
                </div>
              </>
            ) : (
              <div className="col-span-2">
                <label className={labelCls} htmlFor="fdue">Prochaine échéance *</label>
                <input id="fdue" type="date" className={inputCls}
                  value={fDue} onChange={e => setFDue(e.target.value)} />
              </div>
            )}
            <div>
              <label className={labelCls} htmlFor="fnotice">Préavis (jours)</label>
              <input id="fnotice" className={inputCls} inputMode="numeric" placeholder="14"
                value={fNotice} onChange={e => setFNotice(e.target.value)} />
            </div>
          </div>

          <Button onClick={addFactureSubmit} disabled={!fName.trim()} loading={fSaving}
            className={!fName.trim() ? 'opacity-40 cursor-not-allowed' : ''} data-testid="add-facture">
            Ajouter cette facture
          </Button>
        </div>

        <div className="flex flex-col gap-3">
          {factures.filter(f => f.status === 'active').map(f => {
            const u = factureUrgency(f)
            const due = refreshedDueDate(f)
            return (
              <div key={f.id} className="bg-surface border border-ink/10 rounded-2xl p-5" data-testid="facture">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0">
                    <p className="font-serif text-lg text-ink truncate">{f.name}</p>
                    <p className="font-mono text-[11px] text-ink/50 tracking-wider">
                      {f.mode === 'interval' ? `tous les ${f.interval_months} mois` : 'dates manuelles'}
                      {f.amount ? <> · {f.amount.toLocaleString('fr-FR')} €</> : null}
                      {due && <> · échéance le {frDate(due)}</>}
                      {' '}· rappel {f.notice_days ?? 14} j avant
                    </p>
                  </div>
                  {u && (
                    <span className={`flex-shrink-0 text-[11px] font-semibold border rounded-full px-3 py-1 ${URGENCY_UI[u].cls}`}>
                      {u === 'critique' ? 'À régler sous 7 j' : u === 'bientot' ? 'Échéance dans 30 j' : URGENCY_UI[u].label}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  {f.mode === 'interval' ? (
                    <button onClick={() => markFacturePaid(f)}
                      className="text-[13px] text-moss border border-sage/30 rounded-full px-4 py-2 hover:bg-sage/8 transition-colors">
                      Payée ✓ (passe à la suivante)
                    </button>
                  ) : (
                    <label className="text-[13px] text-ink/70 flex items-center gap-2">
                      Nouvelle date :
                      <input type="date" className="bg-surface border border-ink/12 rounded-lg px-2 py-1.5 text-[13px]"
                        defaultValue={f.next_due_date ?? ''}
                        onChange={e => setFactureDate(f, e.target.value)} />
                    </label>
                  )}
                  <button onClick={() => removeFacture(f)}
                    className="text-[13px] text-ink/50 rounded-full px-3 py-2 hover:text-crimson transition-colors">
                    Supprimer
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="w-full mt-6">
        <LiensUtiles
          serviceKey="serein"
          categories={['eau', 'energie']}
          titre="Liens utiles — eau & énergie"
          note="L'eau est gérée par commune en France : vérifiez votre facture pour connaître votre distributeur local."
        />
      </div>

      <Toast message={toast.message} visible={toast.visible} onHide={toast.hide} />
    </main>
    </>
  )
}
