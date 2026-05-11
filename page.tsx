'use client'
import { useState, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { useOnboardingStore } from '@/stores/onboarding'
import { useToast, Toast } from '@/components/ui/toast'
import { isValidEmail } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { ConversionType } from '@/types'

export function ScreenConversion() {
  const { simulation, email, setEmail, setLeadId, setConversionType, leadId } = useOnboardingStore()
  const toast = useToast()

  const [loadingType, setLoadingType] = useState<ConversionType | null>(null)
  const [emailError, setEmailError] = useState(false)
  const [showPdf, setShowPdf] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle')
  const [uploadMsg, setUploadMsg] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Create lead ───────────────────────────────────────────────────────────
  const createLead = useCallback(async (type: ConversionType): Promise<string | null> => {
    if (leadId) return leadId

    const res = await fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        choice: type,
        estimated_subscriptions: simulation?.unused ?? 0,
        monthly_loss: simulation?.monthlyLoss ?? 0,
        annual_loss: simulation?.annualLoss ?? 0,
      }),
    })

    const json = await res.json()
    if (!json.success) throw new Error(json.error ?? 'Erreur serveur')
    return json.data.id as string
  }, [leadId, email, simulation])

  // ── Handle conversion click ───────────────────────────────────────────────
  const handleConversion = async (type: ConversionType) => {
    if (!isValidEmail(email)) {
      setEmailError(true)
      setTimeout(() => setEmailError(false), 600)
      toast.show('✉️ Entrez votre adresse e-mail pour continuer')
      return
    }

    setLoadingType(type)
    setConversionType(type)

    try {
      const id = await createLead(type)
      if (id) setLeadId(id)

      if (type === 'bank') {
        toast.show('🏦 Inscription confirmée ! Connexion bancaire bientôt disponible.')
      } else {
        setShowPdf(true)
        setTimeout(() => fileInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100)
      }
    } catch {
      toast.show('⚠️ Une erreur est survenue. Réessayez dans un instant.')
    } finally {
      setLoadingType(null)
    }
  }

  // ── Handle PDF upload ─────────────────────────────────────────────────────
  const handleFile = async (file: File) => {
    if (file.type !== 'application/pdf') { toast.show('⚠️ Fichier PDF uniquement'); return }
    if (file.size > 10 * 1024 * 1024) { toast.show('⚠️ Fichier trop lourd (max 10 Mo)'); return }

    setUploadStatus('uploading')
    setUploadMsg('Envoi en cours…')

    try {
      let currentLeadId = leadId
      if (!currentLeadId) {
        currentLeadId = await createLead('pdf')
        if (currentLeadId) setLeadId(currentLeadId)
      }

      const formData = new FormData()
      formData.append('file', file)
      if (currentLeadId) formData.append('lead_id', currentLeadId)

      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const json = await res.json()

      if (!json.success) throw new Error(json.error)

      setUploadStatus('done')
      setUploadMsg(`✓ ${file.name} reçu — analyse en cours…`)
      toast.show('📄 Relevé reçu ! Vous recevrez votre analyse par email.')

      // Trigger async analysis (fire & forget)
      fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ upload_id: json.data.uploadId }),
      }).catch(() => {})
    } catch {
      setUploadStatus('error')
      setUploadMsg('Échec envoi. Vérifiez votre connexion.')
    }
  }

  return (
    <div className="flex flex-col items-center w-full animate-fade-up">
      {/* Shield */}
      <div className="w-[72px] h-[72px] rounded-[22px] bg-sage/12 border border-sage/20 flex items-center justify-center text-[30px] mb-6 animate-float">
        🛡️
      </div>

      <p className="font-mono text-[11px] tracking-[.17em] uppercase text-sage mb-4 flex items-center gap-2.5">
        <span className="w-6 h-px bg-moss" />Prêt à commencer<span className="w-6 h-px bg-moss" />
      </p>

      <h2 className="font-serif text-[clamp(24px,5.5vw,44px)] tracking-[-0.025em] leading-[1.15] text-warm mb-2 text-center">
        Serein veille.<br /><em className="text-sage-light">Vous économisez.</em>
      </h2>
      <p className="text-[clamp(15px,3.5vw,17px)] text-white/65 font-light mb-6">Sans effort. Sans risque. En silence.</p>

      {/* Saving summary */}
      {simulation && (
        <div className="w-full bg-sage/8 border border-sage/18 rounded-[18px] p-5 mb-5 flex justify-between items-center">
          <div>
            <p className="text-sm text-white/65 mb-0.5">Votre potentiel d&apos;économie</p>
            <p className="font-serif text-[30px] tracking-[-0.02em] text-sage-light">{simulation.annualLoss} €</p>
            <p className="font-mono text-[11px] text-white/38">par an · estimation personnalisée</p>
          </div>
          <div className="text-right">
            <p className="font-mono text-[11px] text-white/38 leading-[1.7]">
              Serein Actif<br />
              <strong className="text-sage-light text-sm">3,99 €/mois</strong>
            </p>
          </div>
        </div>
      )}

      {/* Email input */}
      <div className="w-full mb-5">
        <label className="block font-mono text-[12px] tracking-[.08em] uppercase text-white/38 mb-2.5">
          Votre e-mail pour recevoir votre analyse
        </label>
        <input
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="vous@exemple.fr"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className={cn(
            'w-full px-[18px] py-4 bg-white/5 border rounded-2xl',
            'text-base font-sans text-[#F8F7F3] outline-none',
            'transition-all duration-200 placeholder:text-white/28',
            emailError
              ? 'border-crimson animate-[shake_0.35s_ease]'
              : 'border-white/12 focus:border-sage focus:shadow-[0_0_0_3px_rgba(130,168,132,.14)]'
          )}
        />
      </div>

      {/* Conversion options */}
      <div className="flex flex-col gap-3 w-full mb-4">
        <button
          onClick={() => handleConversion('bank')}
          disabled={!!loadingType}
          className="w-full bg-sage/10 border-2 border-sage rounded-[18px] p-5 flex items-center gap-4 text-left hover:bg-sage/17 transition-all"
        >
          <div className="w-11 h-11 rounded-xl bg-sage/15 flex items-center justify-center text-xl flex-shrink-0">🏦</div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-warm mb-0.5">Connecter ma banque</p>
            <p className="text-xs text-white/38 leading-[1.5]">Détection automatique · Alertes en temps réel</p>
          </div>
          <span className="font-mono text-[10px] tracking-wider uppercase px-2.5 py-1 rounded-full bg-sage/20 text-sage flex-shrink-0">
            {loadingType === 'bank' ? '...' : 'Recommandé'}
          </span>
        </button>

        <button
          onClick={() => handleConversion('pdf')}
          disabled={!!loadingType}
          className="w-full bg-white/3 border-2 border-white/7 rounded-[18px] p-5 flex items-center gap-4 text-left hover:border-sage hover:bg-sage/7 transition-all"
        >
          <div className="w-11 h-11 rounded-xl bg-amber/12 flex items-center justify-center text-xl flex-shrink-0">📄</div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-warm mb-0.5">Importer un relevé PDF</p>
            <p className="text-xs text-white/38 leading-[1.5]">Sans connexion bancaire · Analyse en 60 secondes</p>
          </div>
          <span className="text-sage text-base flex-shrink-0">{loadingType === 'pdf' ? '…' : '→'}</span>
        </button>
      </div>

      {/* PDF Upload zone */}
      {showPdf && (
        <div
          className="w-full mb-5 rounded-2xl border-2 border-dashed border-sage/30 overflow-hidden transition-all"
          onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('border-sage', 'bg-sage/7') }}
          onDragLeave={e => { e.currentTarget.classList.remove('border-sage', 'bg-sage/7') }}
          onDrop={e => { e.preventDefault(); e.currentTarget.classList.remove('border-sage', 'bg-sage/7'); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
        >
          <label htmlFor="pdf-file" className="flex flex-col items-center justify-center gap-2.5 p-8 cursor-pointer text-center">
            <span className="text-[28px]">📄</span>
            <span className="text-sm text-sage-light leading-[1.6]">
              Glissez votre relevé ici<br />
              <small className="text-xs text-white/38 font-mono">ou cliquez pour sélectionner · PDF uniquement · max 10 Mo</small>
            </span>
            <input
              id="pdf-file"
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
            />
          </label>
          {uploadMsg && (
            <p className={cn(
              'px-4 pb-4 text-sm font-mono tracking-wider text-center',
              uploadStatus === 'done' ? 'text-sage' : uploadStatus === 'error' ? 'text-crimson' : 'text-white/38'
            )}>
              {uploadMsg}
            </p>
          )}
        </div>
      )}

      <p className="font-mono text-[11.5px] text-white/38 text-center tracking-wider leading-[1.7]">
        Analyse gratuite · Résiliation Serein en 1 clic · Aucun engagement
      </p>

      <Toast message={toast.message} visible={toast.visible} onHide={toast.hide} />
    </div>
  )
}
