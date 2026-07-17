'use client'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { FoyerTabs } from '@/components/ui/foyer-tabs'
import { useToast, Toast } from '@/components/ui/toast'
import { listCommitments, addCommitments, listSubscriptions, saveDetectedSubscriptions } from '@/lib/data/store'
import { parseStatement } from '@/lib/pdf/parser'
import { scoreSubscriptions } from '@/lib/scoring/engine'
import { buildSuggestions, analyseStats, type CommitmentSuggestion } from '@/lib/analyse/logic'
import { buildDetectedRows } from '@/lib/subscriptions/detect'
import { extractPdfTextResilient } from '@/lib/pdf/browser'

// Analyse de relevé : Serein détecte et suggère ; le client choisit ce qu'il
// ajoute. Le traitement du document est décrit dans /confidentialite.

const RISK_UI: Record<string, string> = {
  high:   'bg-crimson/15 text-crimson border-crimson/30',
  medium: 'bg-amber/15 text-amber border-amber/30',
  low:    'bg-sage/12 text-moss border-sage/25',
}
const RISK_LABEL: Record<string, string> = { high: 'À examiner', medium: 'À surveiller', low: 'OK' }

export default function AnalysePage() {
  const toast = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const [pasted, setPasted] = useState('')
  const [busy, setBusy] = useState(false)
  const [adding, setAdding] = useState(false)
  const [suggestions, setSuggestions] = useState<CommitmentSuggestion[] | null>(null)
  const [stats, setStats] = useState<ReturnType<typeof analyseStats> | null>(null)
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [existingNames, setExistingNames] = useState<string[]>([])
  const [unmatched, setUnmatched] = useState<string[]>([])
  const [savedCount, setSavedCount] = useState(0)

  // Mémorise la détection dans « abonnements détectés » (best-effort, non bloquant).
  const persistDetected = async (scored: Parameters<typeof buildDetectedRows>[0]) => {
    try {
      const existing = await listSubscriptions()
      const rows = buildDetectedRows(scored, existing.map(s => s.name), { todayISO: new Date().toISOString().slice(0, 10) })
      if (!rows.length) return
      await saveDetectedSubscriptions(rows)
      setSavedCount(rows.length)
    } catch { /* mémorisation best-effort : l'analyse reste utilisable */ }
  }

  useEffect(() => {
    void (async () => {
      try {
        const data = await listCommitments()
        setExistingNames(data.filter(d => d.status === 'active').map(d => d.name))
      } catch { /* stockage indisponible : dédoublonnage désactivé */ }
    })()
  }, [])

  // Document envoyé depuis le « + » : on pré-remplit le texte (l'utilisateur lance).
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('serein.intake')
      if (!raw) return
      sessionStorage.removeItem('serein.intake')
      const { text } = JSON.parse(raw) as { text?: string }
      if (text && text.trim().length > 20) {
        setPasted(text)
        toast.show('Document reçu du « + » — clique « Analyser ce texte ».')
      }
    } catch { /* pas de handoff : page normale */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const runAnalysis = (text: string) => {
    const { transactions: txs, unmatchedLines } = parseStatement(text, 'browser')
    setUnmatched(unmatchedLines)
    if (!txs.length) {
      toast.show('Aucune transaction reconnue — vérifiez que le texte contient dates et montants.')
      return
    }
    const { subscriptions } = scoreSubscriptions(txs, 'browser')
    const sugg = buildSuggestions(subscriptions, existingNames)
    setSuggestions(sugg)
    // Par défaut : on ne met en avant (et ne coche) que les abonnements RECONNUS
    // (enseignes identifiées) ; le bruit « Autre » (achats ponctuels) est masqué.
    const recognized = sugg.filter(s => s.recognized)
    setStats(analyseStats(txs, recognized))
    setChecked(new Set(recognized.filter(s => !s.alreadyTracked).map(s => s.name)))
    setSavedCount(0)
    void persistDetected(subscriptions)
    // Retour positif explicite (le succès ne doit pas être silencieux).
    const n = recognized.length
    toast.show(n > 0
      ? `✓ Relevé analysé — ${txs.length} opérations lues, ${n} abonnement${n > 1 ? 's' : ''} reconnu${n > 1 ? 's' : ''}`
      : `✓ Relevé analysé — ${txs.length} opérations lues, aucun abonnement reconnu`)
  }

  const handleFile = async (file: File) => {
    if (file.type !== 'application/pdf') { toast.show('⚠️ Fichier PDF uniquement'); return }
    if (file.size > 15 * 1024 * 1024) { toast.show('⚠️ Fichier trop lourd (max 15 Mo)'); return }
    setBusy(true)
    try {
      const text = await extractPdfTextResilient(file, phase => {
        if (phase === 'ocr') toast.show('Document scanné détecté — analyse en cours (jusqu\'à 30 s)…')
      })
      if (text.trim().length < 40) {
        toast.show('Rien de lisible, même en lecture optique — collez plutôt le texte du relevé ci-dessous.')
        return
      }
      runAnalysis(text)
    } catch {
      toast.show('Lecture du PDF impossible — collez plutôt le texte du relevé ci-dessous.')
    } finally {
      setBusy(false)
    }
  }

  const toggle = (name: string) => setChecked(prev => {
    const next = new Set(prev)
    if (next.has(name)) next.delete(name); else next.add(name)
    return next
  })

  const addSelected = async () => {
    if (!suggestions || adding) return
    const selected = suggestions.filter(s => checked.has(s.name) && !s.alreadyTracked)
    if (!selected.length) { toast.show('Cochez au moins un abonnement à suivre.'); return }
    setAdding(true)
    try {
      await addCommitments(selected.map(s => ({
        name: s.name,
        service_type: s.service_type,
        amount: s.amount,
        frequency: 'monthly',
        detected_automatically: true,
      })))
      toast.show(`${selected.length} engagement${selected.length > 1 ? 's' : ''} ajouté${selected.length > 1 ? 's' : ''} ✓`)
      setTimeout(() => { window.location.href = '/engagements' }, 900)
    } catch (e) {
      toast.show(e instanceof Error ? e.message : 'Ajout impossible.')
      setAdding(false)
    }
  }

  const renderSuggestion = (s: CommitmentSuggestion) => (
    <label key={s.name} data-testid="suggestion"
      className={`flex items-start gap-3 bg-surface border rounded-2xl p-4 cursor-pointer transition-colors ${checked.has(s.name) && !s.alreadyTracked ? 'border-sage/50' : 'border-ink/10'} ${s.alreadyTracked ? 'opacity-60' : ''}`}>
      <input type="checkbox" className="mt-1 accent-[#557A59]" disabled={s.alreadyTracked}
        checked={s.alreadyTracked || checked.has(s.name)} onChange={() => toggle(s.name)} />
      <span className="flex-1 min-w-0">
        <span className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-ink text-sm">{s.name}</span>
          {s.alreadyTracked
            ? <span className="text-[10.5px] font-semibold border rounded-full px-2.5 py-0.5 bg-ink/8 text-ink/50 border-ink/12">Déjà suivi</span>
            : <span className={`text-[10.5px] font-semibold border rounded-full px-2.5 py-0.5 ${RISK_UI[s.risk_level]}`}>{RISK_LABEL[s.risk_level]}</span>}
        </span>
        <span className="block text-xs text-ink/50 mt-0.5">
          {s.amount.toLocaleString('fr-FR')} €/mois · vu {s.occurrences} fois · {s.why}
        </span>
      </span>
    </label>
  )

  const recognized = (suggestions ?? []).filter(s => s.recognized)
  const others = (suggestions ?? []).filter(s => !s.recognized)

  return (
    <>
      <FoyerTabs />
      <main className="min-h-screen max-w-[640px] mx-auto px-5 py-8 flex flex-col items-center animate-fade-up">
        <p className="font-mono text-[11px] tracking-[.17em] uppercase text-moss mb-5 flex items-center gap-2.5">
          <span className="w-6 h-px bg-moss" />Analyse de relevé<span className="w-6 h-px bg-moss" />
        </p>
        <h1 className="font-serif text-[clamp(26px,5.5vw,44px)] tracking-[-0.025em] leading-[1.15] text-ink mb-3 text-center">
          Votre relevé, <em className="text-moss">vos abonnements révélés.</em>
        </h1>
        <p className="text-sm text-ink/70 leading-[1.6] mb-8 text-center max-w-[460px]">
          Serein détecte vos abonnements récurrents à partir de votre relevé ; vous
          choisissez lesquels suivre. Le traitement du document est décrit dans notre{' '}
          <a href="/confidentialite" className="text-moss underline">politique de confidentialité</a>.
        </p>

        {/* Zone PDF */}
        <div
          className="w-full rounded-2xl border-2 border-dashed border-sage/40 bg-surface mb-4 transition-colors"
          onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('border-sage', 'bg-sage/7') }}
          onDragLeave={e => e.currentTarget.classList.remove('border-sage', 'bg-sage/7')}
          onDrop={e => { e.preventDefault(); e.currentTarget.classList.remove('border-sage', 'bg-sage/7'); const f = e.dataTransfer.files[0]; if (f) void handleFile(f) }}
        >
          <label htmlFor="pdf" className="flex flex-col items-center justify-center gap-2 p-8 cursor-pointer text-center">
            <span className="text-[28px]">📄</span>
            <span className="text-sm text-ink leading-[1.6]">
              {busy ? 'Analyse en cours…' : <>Déposez votre relevé PDF ici<br />
              <small className="text-xs text-ink/45 font-mono">ou cliquez · max 15 Mo</small></>}
            </span>
            <input id="pdf" ref={fileRef} type="file" accept=".pdf,application/pdf" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) void handleFile(f) }} />
          </label>
        </div>

        {/* Ou coller le texte */}
        <div className="w-full mb-6">
          <label htmlFor="paste" className="font-mono text-[11px] tracking-[.13em] uppercase text-ink/50 mb-1.5 block">
            …ou collez le texte de votre relevé (depuis votre appli bancaire)
          </label>
          <textarea id="paste" rows={4} value={pasted} onChange={e => setPasted(e.target.value)}
            placeholder={'05/01/2026 PRLV SEPA NETFLIX.COM -13,49\n12/01/2026 PRLV SPOTIFY -10,99\n…'}
            className="w-full bg-surface border border-ink/12 rounded-xl px-4 py-3 text-[13px] font-mono text-ink placeholder:text-ink/30 focus:outline-none focus:border-sage/60 transition-colors" />
          <Button size="md" className="mt-2" disabled={pasted.trim().length < 20}
            onClick={() => runAnalysis(pasted)}>
            Analyser ce texte
          </Button>
        </div>

        {/* Résultats */}
        {suggestions && stats && (
          <div className="w-full animate-pop-in">
            <div className="w-full bg-sage/8 border border-sage/20 rounded-2xl p-5 mb-4" data-testid="analyse-stats">
              <p className="text-[13.5px] text-ink leading-[1.6]">
                <strong>{stats.transactionCount} transactions lues</strong> ·{' '}
                <strong>{stats.subscriptionCount} abonnement{stats.subscriptionCount > 1 ? 's' : ''} récurrent{stats.subscriptionCount > 1 ? 's' : ''} détecté{stats.subscriptionCount > 1 ? 's' : ''}</strong>
                {stats.newCount < stats.subscriptionCount && <> (dont {stats.subscriptionCount - stats.newCount} déjà suivi{stats.subscriptionCount - stats.newCount > 1 ? 's' : ''})</>}
                {' '}— soit ≈ {stats.monthlyTotal.toLocaleString('fr-FR')} €/mois ({stats.annualTotal.toLocaleString('fr-FR')} €/an).
              </p>
              {savedCount > 0 && (
                <p className="text-[12.5px] text-ink/60 leading-[1.55] mt-2" data-testid="saved-hint">
                  🗂️ {savedCount} abonnement{savedCount > 1 ? 's' : ''} mémorisé{savedCount > 1 ? 's' : ''} dans vos{' '}
                  <a href="/abonnements" className="text-moss underline">abonnements détectés</a>.
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2.5 mb-4">
              {recognized.length > 0
                ? recognized.map(renderSuggestion)
                : <p className="text-sm text-ink/60 text-center py-2">Aucun abonnement d’enseigne connue repéré sur ce relevé.</p>}
            </div>

            {/* Bruit « Autre » (achats ponctuels, courses…) : masqué par défaut,
                 accessible si l'utilisateur veut quand même en suivre un. */}
            {others.length > 0 && (
              <details className="w-full mb-4">
                <summary className="cursor-pointer font-mono text-[11px] tracking-[.13em] uppercase text-ink/50 hover:text-ink/70">
                  + Voir {others.length} autre{others.length > 1 ? 's' : ''} opération{others.length > 1 ? 's' : ''} repérée{others.length > 1 ? 's' : ''} (achats ponctuels, courses…)
                </summary>
                <div className="flex flex-col gap-2.5 mt-3">
                  {others.map(renderSuggestion)}
                </div>
              </details>
            )}

            {unmatched.length > 0 && (
              <div className="w-full bg-surface border border-ink/10 rounded-2xl p-4 mb-4" data-testid="unmatched">
                <p className="text-[12.5px] text-ink/70 leading-[1.55] mb-2">
                  ⚠️ {unmatched.length} ligne{unmatched.length > 1 ? 's' : ''} du relevé n&apos;a{unmatched.length > 1 ? 'ont' : ''} pas
                  été comprise{unmatched.length > 1 ? 's' : ''}. Copiez-les et envoyez-les nous : la détection s&apos;améliorera.
                </p>
                <pre className="text-[11px] font-mono text-ink/50 whitespace-pre-wrap leading-[1.6] max-h-32 overflow-y-auto">{unmatched.join('\n')}</pre>
                <button
                  onClick={() => { void navigator.clipboard.writeText(unmatched.join('\n')); toast.show('Lignes copiées ✓') }}
                  className="text-[12px] text-moss underline mt-1">
                  Copier ces lignes
                </button>
              </div>
            )}

            <Button onClick={addSelected} loading={adding} data-testid="add-selected">
              Suivre la sélection dans mes engagements →
            </Button>
            <p className="font-mono text-[11px] text-ink/45 tracking-wider text-center mt-3">
              Détection indicative — c&apos;est vous qui décidez de ce que Serein suit.
            </p>
          </div>
        )}

        <Toast message={toast.message} visible={toast.visible} onHide={toast.hide} />
      </main>
    </>
  )
}
