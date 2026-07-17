'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { FoyerTabs } from '@/components/ui/foyer-tabs'
import { useToast, Toast } from '@/components/ui/toast'
import { extractPdfText } from '@/lib/pdf/browser'
import { routerDocument, describeDestination, type DocType } from '@/lib/router/logic'
import { extractSubscriptionDraft, type SubscriptionDraft, type SubscriptionFrequency } from '@/lib/subscriptions/extract'
import { createSubscription } from '@/lib/data/store'

// Le « + » : une seule porte d'entrée. L'utilisateur dépose n'importe quel
// document ; l'app le RECONNAÎT (routerDocument) et l'ORIENTE vers le bon
// service. Il ne choisit jamais un service — il fait un geste, l'app route.
// Pour un abonnement, on va plus loin : on EXTRAIT un brouillon et on l'écrit
// DIRECTEMENT dans la table `subscriptions` (via le socle API). (cf. SEREIN-PLAN-FUSION.md)

const CHOICES: DocType[] = ['courses', 'abonnement', 'demarche']
const FREQ_LABELS: Record<SubscriptionFrequency, string> = {
  weekly: 'par semaine', monthly: 'par mois', quarterly: 'par trimestre', yearly: 'par an',
}

export default function AjouterPage() {
  const toast = useToast()
  const [pasted, setPasted] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<{ type: DocType; text: string } | null>(null)
  const [draft, setDraft] = useState<SubscriptionDraft | null>(null)
  const [saving, setSaving] = useState(false)

  const recognise = (text: string) => {
    if (text.trim().length < 15) { toast.show('Colle un peu plus de texte (ou dépose le document).'); return }
    const type = routerDocument(text)
    setResult({ type, text })
    // Abonnement reconnu → on tente d'en extraire un brouillon prêt à créer.
    setDraft(type === 'abonnement' ? extractSubscriptionDraft(text) : null)
  }

  // Écrit l'abonnement DIRECTEMENT dans la table `subscriptions` (socle API en
  // ligne, localStorage en invité), puis emmène l'utilisateur voir le résultat.
  const saveSubscription = async () => {
    if (!draft) return
    if (!draft.name.trim() || !(draft.amount > 0)) { toast.show('Un nom et un montant sont requis.'); return }
    setSaving(true)
    try {
      await createSubscription(draft)
      toast.show('✓ Abonnement ajouté à tes abonnements')
      setTimeout(() => { window.location.href = '/abonnements' }, 700)
    } catch (e) {
      toast.show(e instanceof Error ? e.message : 'Ajout impossible — es-tu connecté ?')
      setSaving(false)
    }
  }

  const reset = () => { setResult(null); setPasted(''); setDraft(null) }

  const handleFile = async (file: File) => {
    if (file.type !== 'application/pdf') { toast.show('⚠️ Pour l’instant : PDF, ou colle le texte ci-dessous.'); return }
    if (file.size > 15 * 1024 * 1024) { toast.show('⚠️ Fichier trop lourd (max 15 Mo)'); return }
    setBusy(true)
    try {
      const text = await extractPdfText(file, phase => {
        if (phase === 'ocr') toast.show('Document scanné — lecture optique (jusqu’à 30 s)…')
      })
      if (text.trim().length < 40) { toast.show('Rien de lisible — colle plutôt le texte ci-dessous.'); return }
      recognise(text)
    } catch {
      toast.show('Lecture du PDF impossible — colle plutôt le texte ci-dessous.')
    } finally { setBusy(false) }
  }

  // Passe le document au bon service (même origine → sessionStorage/localStorage)
  // puis y navigue. Le service prend le relais (détection, lettre, courses).
  const handoff = (type: DocType, text: string) => {
    const dest = describeDestination(type)
    if (!dest.href) return
    try {
      sessionStorage.setItem('serein.intake', JSON.stringify({ type, text, at: Date.now() }))
      if (type === 'courses') localStorage.setItem('pm.intakeTicket', text)
    } catch { /* stockage indisponible : on navigue quand même */ }
    window.location.href = dest.href
  }

  const dest = result ? describeDestination(result.type) : null

  return (
    <>
      <FoyerTabs />
      <main className="min-h-screen max-w-[640px] mx-auto px-5 py-8 flex flex-col items-center animate-fade-up">
        <p className="font-mono text-[11px] tracking-[.17em] uppercase text-moss mb-5 flex items-center gap-2.5">
          <span className="w-6 h-px bg-moss" />Ajouter un document<span className="w-6 h-px bg-moss" />
        </p>
        <h1 className="font-serif text-[clamp(26px,5.5vw,44px)] tracking-[-0.025em] leading-[1.15] text-ink mb-3 text-center">
          Un document, <em className="text-moss">une seule porte.</em>
        </h1>
        <p className="text-sm text-ink/70 leading-[1.6] mb-8 text-center max-w-[460px]">
          Ticket de caisse, facture, prélèvement, courrier… Dépose-le ici : Serein
          reconnaît de quoi il s’agit et l’envoie au bon endroit. Tu ne choisis rien.
        </p>

        {!result && (
          <>
            {/* Zone dépôt PDF */}
            <div
              className="w-full rounded-2xl border-2 border-dashed border-sage/40 bg-surface mb-4 transition-colors"
              onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('border-sage', 'bg-sage/7') }}
              onDragLeave={e => e.currentTarget.classList.remove('border-sage', 'bg-sage/7')}
              onDrop={e => { e.preventDefault(); e.currentTarget.classList.remove('border-sage', 'bg-sage/7'); const f = e.dataTransfer.files[0]; if (f) void handleFile(f) }}
            >
              <label htmlFor="doc" className="flex flex-col items-center justify-center gap-2 p-8 cursor-pointer text-center">
                <span className="text-[28px]">➕</span>
                <span className="text-sm text-ink leading-[1.6]">
                  {busy ? 'Lecture en cours…' : <>Dépose un document (PDF)<br />
                  <small className="text-xs text-ink/45 font-mono">ou cliquez · max 15 Mo</small></>}
                </span>
                <input id="doc" type="file" accept=".pdf,application/pdf" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) void handleFile(f) }} />
              </label>
            </div>

            {/* Ou coller le texte */}
            <div className="w-full mb-6">
              <label htmlFor="paste" className="font-mono text-[11px] tracking-[.13em] uppercase text-ink/50 mb-1.5 block">
                …ou colle le texte du document (ticket, facture, courrier…)
              </label>
              <textarea id="paste" rows={5} value={pasted} onChange={e => setPasted(e.target.value)}
                placeholder={'Colle ici le texte de ton ticket, ta facture, ton courrier…'}
                className="w-full bg-surface border border-ink/12 rounded-xl px-4 py-3 text-[13px] font-mono text-ink placeholder:text-ink/30 focus:outline-none focus:border-sage/60 transition-colors" />
              <Button size="md" className="mt-2" disabled={pasted.trim().length < 15}
                onClick={() => recognise(pasted)} data-testid="recognise">
                Reconnaître ce document
              </Button>
            </div>
          </>
        )}

        {/* Résultat de la reconnaissance */}
        {result && dest && (
          <div className="w-full animate-pop-in" data-testid="route-result">
            <div className="w-full bg-sage/8 border border-sage/20 rounded-2xl p-6 mb-4 text-center">
              <div className="text-[40px] mb-2">{dest.emoji}</div>
              <p className="text-[15px] text-ink leading-[1.5] mb-1">{dest.headline}</p>
              {dest.service && (
                <p className="text-sm text-ink/60">→ <strong className="text-moss">{dest.service}</strong></p>
              )}
            </div>

            {result.type === 'abonnement' ? (
              <div data-testid="sub-form">
                {draft ? (
                  <>
                    <div className="w-full bg-surface border border-ink/10 rounded-2xl p-4 mb-4 flex flex-col gap-3">
                      <label className="flex flex-col gap-1">
                        <span className="font-mono text-[10.5px] tracking-[.12em] uppercase text-ink/50">Nom du service</span>
                        <input value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })}
                          data-testid="sub-name"
                          className="bg-cream border border-ink/12 rounded-xl px-3 py-2.5 text-sm text-ink focus:outline-none focus:border-sage/60" />
                      </label>
                      <div className="flex gap-3">
                        <label className="flex flex-col gap-1 flex-1">
                          <span className="font-mono text-[10.5px] tracking-[.12em] uppercase text-ink/50">Montant (€)</span>
                          <input inputMode="decimal" value={draft.amount}
                            onChange={e => setDraft({ ...draft, amount: parseFloat(e.target.value.replace(',', '.')) || 0 })}
                            data-testid="sub-amount"
                            className="bg-cream border border-ink/12 rounded-xl px-3 py-2.5 text-sm text-ink focus:outline-none focus:border-sage/60" />
                        </label>
                        <label className="flex flex-col gap-1 flex-1">
                          <span className="font-mono text-[10.5px] tracking-[.12em] uppercase text-ink/50">Fréquence</span>
                          <select value={draft.frequency} onChange={e => setDraft({ ...draft, frequency: e.target.value as SubscriptionFrequency })}
                            className="bg-cream border border-ink/12 rounded-xl px-3 py-2.5 text-sm text-ink focus:outline-none focus:border-sage/60">
                            {(Object.keys(FREQ_LABELS) as SubscriptionFrequency[]).map(f => (
                              <option key={f} value={f}>{FREQ_LABELS[f]}</option>
                            ))}
                          </select>
                        </label>
                      </div>
                    </div>
                    <Button onClick={saveSubscription} loading={saving} data-testid="sub-create">
                      ➕ Ajouter à mes abonnements
                    </Button>
                  </>
                ) : (
                  <p className="text-sm text-ink/70 text-center mb-3">
                    Je n’ai pas trouvé de montant automatiquement — tu peux l’analyser comme un relevé complet.
                  </p>
                )}
                <div className="mt-4 text-center">
                  <button onClick={() => handoff('abonnement', result.text)}
                    className="font-mono text-[11px] tracking-[.1em] uppercase text-moss underline">
                    plutôt analyser un relevé complet →
                  </button>
                </div>
                <div className="mt-4 text-center">
                  <p className="font-mono text-[11px] text-ink/45 tracking-wider mb-2">Ce n’est pas un abonnement ?</p>
                  <div className="flex items-center justify-center gap-2 flex-wrap">
                    {CHOICES.filter(t => t !== 'abonnement').map(t => (
                      <button key={t} onClick={() => handoff(t, result.text)}
                        className="font-mono text-[11px] tracking-[.1em] uppercase rounded-full px-4 py-2 text-ink/55 border border-ink/12 hover:border-sage hover:text-moss transition-colors">
                        {describeDestination(t).emoji} {describeDestination(t).service}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : result.type !== 'inconnu' ? (
              <>
                <Button onClick={() => handoff(result.type, result.text)} data-testid="route-go">
                  {dest.cta} →
                </Button>
                <div className="mt-4 text-center">
                  <p className="font-mono text-[11px] text-ink/45 tracking-wider mb-2">Ce n’est pas ça ?</p>
                  <div className="flex items-center justify-center gap-2 flex-wrap">
                    {CHOICES.filter(t => t !== result.type).map(t => (
                      <button key={t} onClick={() => handoff(t, result.text)}
                        className="font-mono text-[11px] tracking-[.1em] uppercase rounded-full px-4 py-2 text-ink/55 border border-ink/12 hover:border-sage hover:text-moss transition-colors">
                        {describeDestination(t).emoji} {describeDestination(t).service}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center">
                <p className="text-sm text-ink/70 mb-3">Dis-moi où l’envoyer :</p>
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  {CHOICES.map(t => (
                    <button key={t} onClick={() => handoff(t, result.text)}
                      className="font-mono text-[11px] tracking-[.1em] uppercase rounded-full px-4 py-2 text-moss border border-sage/30 hover:bg-sage/10 transition-colors">
                      {describeDestination(t).emoji} {describeDestination(t).service}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="text-center mt-5">
              <button onClick={reset}
                className="font-mono text-[11px] text-ink/45 tracking-wider underline hover:text-ink/70">
                ← ajouter un autre document
              </button>
            </div>
          </div>
        )}

        <Toast message={toast.message} visible={toast.visible} onHide={toast.hide} />
      </main>
    </>
  )
}
