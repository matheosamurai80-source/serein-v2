'use client'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { SereinNav } from '@/components/ui/nav'
import { useToast, Toast } from '@/components/ui/toast'
import { generateCancellationLetter, type GeneratedLetter } from '@/lib/letters/generator'
import { buildLetterRow } from '@/lib/letters/db'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { ensureUserId } from '@/lib/supabase/session'
import type { TransactionCategory } from '@/types'

interface SavedLetter { id: string; letter_type: string; generated_at: string }

const LETTER_TYPE_LABELS: Record<string, string> = {
  standard: 'Standard', chatel: 'Loi Chatel', hamon: 'Loi Hamon', negotiation: 'Négociation',
}

const CATEGORIES: { value: TransactionCategory; label: string }[] = [
  { value: 'streaming', label: 'Streaming / divertissement' },
  { value: 'saas',      label: 'Logiciel / application' },
  { value: 'telecom',   label: 'Téléphone / internet' },
  { value: 'insurance', label: 'Assurance' },
  { value: 'utility',   label: 'Électricité / gaz' },
  { value: 'fitness',   label: 'Salle de sport' },
  { value: 'press',     label: 'Presse / magazine' },
  { value: 'other',     label: 'Autre abonnement' },
]

const inputCls =
  'w-full bg-surface border border-ink/12 rounded-xl px-4 py-3 text-sm text-ink ' +
  'placeholder:text-ink/35 focus:outline-none focus:border-sage/60 transition-colors'

const labelCls = 'font-mono text-[11px] tracking-[.13em] uppercase text-ink/50 mb-1.5 block text-left'

export default function ResiliationPage() {
  const toast = useToast()
  const [serviceName, setServiceName] = useState('')
  const [category, setCategory] = useState<TransactionCategory>('streaming')
  const [subscribedAt, setSubscribedAt] = useState('')
  const [noticeReceived, setNoticeReceived] = useState(false)
  const [senderName, setSenderName] = useState('')
  const [senderAddress, setSenderAddress] = useState('')
  const [providerName, setProviderName] = useState('')
  const [providerAddress, setProviderAddress] = useState('')
  const [contractRef, setContractRef] = useState('')
  const [letter, setLetter] = useState<GeneratedLetter | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState<SavedLetter[]>([])
  const [commitmentId, setCommitmentId] = useState<string | undefined>(undefined)

  useEffect(() => {
    // Pré-remplissage depuis la page Engagements (?service=…&category=…)
    const q = new URLSearchParams(window.location.search)
    const s = q.get('service')
    const c = q.get('category')
    if (s) setServiceName(s)
    if (c && CATEGORIES.some(x => x.value === c)) setCategory(c as TransactionCategory)
    const cid = q.get('commitment')
    if (cid) setCommitmentId(cid)
  }, [])

  useEffect(() => {
    // Liste « Mes lettres » si une session existe déjà (pas de connexion forcée)
    void (async () => {
      try {
        const supabase = createSupabaseBrowserClient()
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return
        const { data } = await supabase
          .from('cancellation_letters')
          .select('id, letter_type, generated_at')
          .order('generated_at', { ascending: false })
          .limit(5)
        if (data) setSaved(data)
      } catch { /* env Supabase absente : la page reste utilisable sans sauvegarde */ }
    })()
  }, [])

  const saveLetter = async () => {
    if (!letter || saving) return
    setSaving(true)
    try {
      const supabase = createSupabaseBrowserClient()
      const userId = await ensureUserId(supabase)
      const row = buildLetterRow({ userId, regime: letter.regime, content: letter.body, commitmentId })
      const { data, error } = await supabase
        .from('cancellation_letters')
        .insert(row)
        .select('id, letter_type, generated_at')
        .single()
      if (error) throw new Error(error.message)
      if (data) setSaved(prev => [data, ...prev].slice(0, 5))
      toast.show('Lettre sauvegardée dans votre espace ✓')
    } catch (e) {
      toast.show(e instanceof Error ? e.message : 'Sauvegarde impossible.')
    } finally {
      setSaving(false)
    }
  }

  const ready = serviceName && senderName && senderAddress && providerName && providerAddress

  const generate = () => {
    if (!ready) return
    setLetter(generateCancellationLetter({
      category,
      serviceName,
      senderName,
      senderAddress,
      providerName,
      providerAddress,
      contractRef: contractRef || undefined,
      subscribedAt: subscribedAt || undefined,
      renewalNoticeReceived: noticeReceived,
    }))
  }

  const copy = async () => {
    if (!letter) return
    await navigator.clipboard.writeText(letter.body)
    toast.show('Lettre copiée dans le presse-papiers')
  }

  const download = () => {
    if (!letter) return
    const blob = new Blob([letter.body], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `resiliation-${serviceName.toLowerCase().replace(/\s+/g, '-')}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
    <SereinNav />
    <main className="min-h-screen max-w-[640px] mx-auto px-5 py-8 flex flex-col items-center animate-fade-up">
      <p className="font-mono text-[11px] tracking-[.17em] uppercase text-moss mb-5 flex items-center gap-2.5">
        <span className="w-6 h-px bg-moss" />Lettre de résiliation<span className="w-6 h-px bg-moss" />
      </p>

      <h1 className="font-serif text-[clamp(26px,5.5vw,44px)] tracking-[-0.025em] leading-[1.15] text-ink mb-3 text-center">
        Résiliez avec <em className="text-moss">la loi de votre côté.</em>
      </h1>
      <p className="text-sm text-ink/70 leading-[1.6] mb-8 text-center max-w-[440px]">
        Serein détecte le régime légal applicable (loi Hamon, loi Chatel, télécom, énergie)
        et génère la lettre. C&apos;est vous qui l&apos;envoyez — vous gardez la main du début à la fin.
      </p>

      <div className="w-full bg-surface border border-ink/10 rounded-2xl p-7 flex flex-col gap-4 mb-6">
        <div>
          <label className={labelCls} htmlFor="service">Service à résilier *</label>
          <input id="service" className={inputCls} placeholder="Ex. Basic-Fit, Orange Livebox…"
            value={serviceName} onChange={e => setServiceName(e.target.value)} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls} htmlFor="category">Type d&apos;abonnement</label>
            <select id="category" className={inputCls} value={category}
              onChange={e => setCategory(e.target.value as TransactionCategory)}>
              {CATEGORIES.map(c => <option key={c.value} value={c.value} className="bg-surface">{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls} htmlFor="since">Souscrit le (si connu)</label>
            <input id="since" type="date" className={inputCls}
              value={subscribedAt} onChange={e => setSubscribedAt(e.target.value)} />
          </div>
        </div>

        <label className="flex items-start gap-3 text-[13.5px] text-ink/70 leading-[1.55] cursor-pointer">
          <input type="checkbox" className="mt-1 accent-[#82A884]"
            checked={noticeReceived} onChange={e => setNoticeReceived(e.target.checked)} />
          <span>
            J&apos;ai reçu l&apos;avis d&apos;échéance / de reconduction dans les délais.
            <span className="block text-ink/50">Si non coché, la loi Chatel peut permettre une résiliation gratuite à tout moment.</span>
          </span>
        </label>

        <div className="h-px bg-surface my-1" />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls} htmlFor="name">Vos nom et prénom *</label>
            <input id="name" className={inputCls} placeholder="Prénom Nom"
              value={senderName} onChange={e => setSenderName(e.target.value)} />
          </div>
          <div>
            <label className={labelCls} htmlFor="ref">N° client / contrat</label>
            <input id="ref" className={inputCls} placeholder="Optionnel"
              value={contractRef} onChange={e => setContractRef(e.target.value)} />
          </div>
        </div>

        <div>
          <label className={labelCls} htmlFor="addr">Votre adresse *</label>
          <input id="addr" className={inputCls} placeholder="N°, rue, code postal, ville"
            value={senderAddress} onChange={e => setSenderAddress(e.target.value)} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls} htmlFor="prov">Prestataire *</label>
            <input id="prov" className={inputCls} placeholder="Ex. Orange — Service Résiliation"
              value={providerName} onChange={e => setProviderName(e.target.value)} />
          </div>
          <div>
            <label className={labelCls} htmlFor="provAddr">Adresse du prestataire *</label>
            <input id="provAddr" className={inputCls} placeholder="Adresse du service résiliation"
              value={providerAddress} onChange={e => setProviderAddress(e.target.value)} />
          </div>
        </div>

        <Button onClick={generate} disabled={!ready} className={!ready ? 'opacity-40 cursor-not-allowed' : ''}>
          Générer ma lettre →
        </Button>
      </div>

      {letter && (
        <div className="w-full animate-pop-in">
          <div className="w-full bg-sage/7 border border-sage/16 rounded-2xl p-5 mb-4">
            <p className="font-mono text-[11px] tracking-[.13em] uppercase text-moss mb-1.5">
              Régime détecté — {letter.regime.label}
            </p>
            <p className="text-[13.5px] text-ink/70 leading-[1.6]">{letter.regime.summary}</p>
          </div>

          <pre className="w-full bg-surface border border-ink/10 rounded-2xl p-6 text-[13px] text-ink leading-[1.7] whitespace-pre-wrap font-sans mb-4">
            {letter.body}
          </pre>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={copy} size="md">Copier la lettre</Button>
            <Button onClick={download} variant="secondary" size="md">Télécharger (.txt)</Button>
            <Button onClick={saveLetter} variant="secondary" size="md" loading={saving}>
              Sauvegarder dans mon espace
            </Button>
          </div>
          <p className="font-mono text-[11px] text-ink/50 tracking-wider text-center mt-4">
            À envoyer en recommandé avec accusé de réception — gardez le récépissé.
          </p>
        </div>
      )}

      {saved.length > 0 && (
        <div className="w-full bg-surface border border-ink/10 rounded-2xl p-5 mt-6">
          <p className="font-mono text-[11px] tracking-[.13em] uppercase text-ink/50 mb-3">
            Mes lettres sauvegardées
          </p>
          <ul className="flex flex-col gap-2">
            {saved.map(l => (
              <li key={l.id} className="flex items-center justify-between text-[13.5px] text-ink/70">
                <span className="text-ink">{LETTER_TYPE_LABELS[l.letter_type] ?? l.letter_type}</span>
                <span className="font-mono text-[11px] text-ink/50">
                  {new Date(l.generated_at).toLocaleDateString('fr-FR')}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Toast message={toast.message} visible={toast.visible} onHide={toast.hide} />
    </main>
    </>
  )
}
