'use client'
import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { useOnboardingStore } from '@/stores/onboarding'
import { isValidEmail } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { ConversionType } from '@/types'
export function ScreenConversion() {
  const { simulation, email, setEmail, setLeadId, setConversionType, leadId } = useOnboardingStore()
  const [loading, setLoading] = useState<ConversionType | null>(null)
  const [err, setErr] = useState(false)
  const [showPdf, setShowPdf] = useState(false)
  const [msg, setMsg] = useState('')
  const createLead = useCallback(async (type: ConversionType) => {
    if (leadId) return leadId
    const res = await fetch('/api/leads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, choice: type, estimated_subscriptions: simulation?.unused??0, monthly_loss: simulation?.monthlyLoss??0, annual_loss: simulation?.annualLoss??0 }) })
    const json = await res.json(); if (!json.success) throw new Error('Error')
    return json.data.id as string
  }, [leadId, email, simulation])
  const handle = async (type: ConversionType) => {
    if (!isValidEmail(email)) { setErr(true); setTimeout(() => setErr(false), 600); return }
    setLoading(type); setConversionType(type)
    try { const id = await createLead(type); if (id) setLeadId(id); if (type==='pdf') setShowPdf(true); else setMsg('🏦 Connexion bancaire bientôt disponible!')
    } catch { setMsg('⚠ Erreur, réessayez') } finally { setLoading(null) }
  }
  const handleFile = async (file: File) => {
    if (file.type !== 'application/pdf') { setMsg('⚠ PDF uniquement'); return }
    setMsg('Envi en cours…')
    try {
      let id = leadId; if (!id) { id = await createLead('pdf'); if (id) setLeadId(id) }
      const fd = new FormData(); fd.append('file', file); if (id) fd.append('lead_id', id)
      const r = await fetch('/api/upload', { method: 'POST', body: fd }); const j = await r.json()
      if (!j.success) throw new Error('Upload failed')
      setMsg('⟓ Relevé reçu - analyse en cours')
      fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ upload_id: j.data.uploadId }) }).catch(() => {})
    } catch { setMsg('⚠ Échec envoi') }
  }
  return (<div className="flex flex-col gap-5">
    {simulation && <p className="font-serif text-2xl text-[#EAB95E]">Potentiel {simulation.annualLoss} €/an</p>}
    <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="vous@exemple.fr"
      className={cn('w-full p-3 rounded-xl bg-white/5 border text-white outline-none placeholder:text-white/3', err ? 'border-red-500' : 'border-white/10')} />
    <div className="flex flex-col gap-2">
      <Button onClick={() => handle('bank')} loading={loading==='bank'}>Connecter ma banque</Button>
      <Button variant="secondary" onClick={() => handle('pdf')} loading={loading==='pdf'}>Importer un relevé PDF</Button>
    </div>
    {showPdf && <label className="flex flex-col gap-2 border-2 border-dashed border-[#82A884]/30 p-6 rounded-xl cursor-pointer text-center hover:border-[#82A884]">
      <span className="text-[#AECBB0]">Glissez/votre relevé PDF ici</span>
      <span className="text-xs text-white/38">ou cliquez pour sélectionner</span>
      <input type="file" accept=".pdf" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
    </label?}
    {msg && <p className="text-sm text-[#82A884]">{msg}</p>}
  </div>)
}
