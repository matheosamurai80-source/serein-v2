'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { FoyerTabs } from '@/components/ui/foyer-tabs'
import { useToast, Toast } from '@/components/ui/toast'
import { extractPdfTextResilient, extractImageText } from '@/lib/pdf/browser'
import { routerDocument, describeDestination, type DocType } from '@/lib/router/logic'
import { detectOfficialDoc } from '@/lib/officiel/logic'
import { extractSubscriptionDraft, looksLikeStatement, type SubscriptionDraft, type SubscriptionFrequency } from '@/lib/subscriptions/extract'
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
  const [isStatement, setIsStatement] = useState(false)
  const [saving, setSaving] = useState(false)

  const recognise = (text: string) => {
    if (text.trim().length < 3) { toast.show('Écris au moins un mot (ex. amende, Netflix, taxe foncière).'); return }
    // Un relevé bancaire = plein de prélèvements → à analyser en entier, pas UN abonnement.
    const statement = looksLikeStatement(text)
    const type = statement ? 'abonnement' : routerDocument(text)
    setResult({ type, text })
    setIsStatement(statement)
    setDraft(type === 'abonnement' && !statement ? extractSubscriptionDraft(text) : null)
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

  const reset = () => { setResult(null); setPasted(''); setDraft(null); setIsStatement(false) }

  const handleFile = async (file: File) => {
    const isPdf = file.type === 'application/pdf'
    const isImage = file.type.startsWith('image/')
    if (!isPdf && !isImage) { toast.show('Dépose un PDF ou une photo — ou colle le texte ci-dessous.'); return }
    if (file.size > 15 * 1024 * 1024) { toast.show('⚠️ Fichier trop lourd (max 15 Mo)'); return }
    setBusy(true)
    try {
      let text: string
      if (isImage) {
        toast.show('Lecture de la photo… (jusqu’à 30 s au premier usage)')
        text = await extractImageText(file)
      } else {
        text = await extractPdfTextResilient(file, phase => {
          if (phase === 'ocr') toast.show('Document scanné — lecture optique (jusqu’à 30 s)…')
        })
      }
      if (text.trim().length < 40) { toast.show('Rien de lisible — colle plutôt le texte ci-dessous.'); return }
      recognise(text)
    } catch {
      toast.show('Lecture impossible — colle plutôt le texte ci-dessous.')
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
  // Démarche = courrier : est-ce un document officiel connu (amende, impôt…) ?
  const official = result && result.type === 'demarche' ? detectOfficialDoc(result.text, { withFallback: true }) : null

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
          Dis en <strong>deux mots</strong> ce que c’est (« amende », « facture Netflix »,
          « taxe foncière »…) — ou dépose le document. Serein reconnaît et t’envoie
          au bon endroit. Tu ne choisis rien.
        </p>

        {!result && (
          <>
            {/* Saisie rapide (le chemin le plus fiable) */}
            <div className="w-full mb-4">
              <label htmlFor="paste" className="font-mono text-[11px] tracking-[.13em] uppercase text-ink/50 mb-1.5 block">
                ✍️ De quoi s’agit-il ? (quelques mots, ou colle le texte)
              </label>
              <textarea id="paste" rows={3} value={pasted} onChange={e => setPasted(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && pasted.trim().length >= 3) { e.preventDefault(); recognise(pasted) } }}
                placeholder={'ex. amende · facture Netflix · taxe foncière · résiliation Orange…'}
                className="w-full bg-surface border border-ink/12 rounded-xl px-4 py-3 text-[13px] text-ink placeholder:text-ink/30 focus:outline-none focus:border-sage/60 transition-colors" />
              <Button size="md" className="mt-2" disabled={pasted.trim().length < 3}
                onClick={() => recognise(pasted)} data-testid="recognise">
                Reconnaître
              </Button>
            </div>

            {/* Ou déposer une photo / un PDF (lecture auto, best-effort) */}
            <div
              className="w-full rounded-2xl border-2 border-dashed border-sage/40 bg-surface mb-6 transition-colors"
              onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('border-sage', 'bg-sage/7') }}
              onDragLeave={e => e.currentTarget.classList.remove('border-sage', 'bg-sage/7')}
              onDrop={e => { e.preventDefault(); e.currentTarget.classList.remove('border-sage', 'bg-sage/7'); const f = e.dataTransfer.files[0]; if (f) void handleFile(f) }}
            >
              <label htmlFor="doc" className="flex flex-col items-center justify-center gap-1.5 p-6 cursor-pointer text-center">
                <span className="text-[24px]">📷</span>
                <span className="text-[13px] text-ink/70 leading-[1.5]">
                  {busy ? 'Lecture en cours…' : <>ou dépose une <strong>photo</strong> / un <strong>PDF</strong><br />
                  <small className="text-xs text-ink/40 font-mono">lecture auto — sur photo, moins fiable qu’un PDF</small></>}
                </span>
                <input id="doc" type="file" accept="image/*,application/pdf,.pdf" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) void handleFile(f) }} />
              </label>
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
                {isStatement ? (
                  <div className="text-center" data-testid="statement">
                    <p className="text-sm text-ink/70 mb-3">
                      C’est un <strong>relevé bancaire</strong> — je vais y repérer <strong>tous</strong> tes abonnements d’un coup, pas un seul.
                    </p>
                    <Button onClick={() => handoff('abonnement', result.text)} data-testid="route-analyse">
                      Analyser le relevé →
                    </Button>
                  </div>
                ) : draft ? (
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
                    <div className="mt-3 text-center">
                      <a href={`/resiliation?service=${encodeURIComponent(draft.name)}`} data-testid="sub-resiliate"
                        className="font-mono text-[11px] tracking-[.1em] uppercase text-moss underline">
                        ✉️ Résilier cet abonnement (en ligne ou lettre) →
                      </a>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-ink/70 text-center mb-3">
                    Je n’ai pas trouvé de montant automatiquement — tu peux l’analyser comme un relevé complet.
                  </p>
                )}
                {!isStatement && (
                  <div className="mt-4 text-center">
                    <button onClick={() => handoff('abonnement', result.text)}
                      className="font-mono text-[11px] tracking-[.1em] uppercase text-moss underline">
                      plutôt analyser un relevé complet →
                    </button>
                  </div>
                )}
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
                {official && (
                  <div className="w-full bg-surface border border-sage/30 rounded-2xl p-5 mb-3 text-center" data-testid="official-doc">
                    <div className="text-[15px] text-ink font-semibold mb-1">{official.emoji} {official.label}</div>
                    <p className="text-xs text-ink/60 leading-[1.5] mb-3">{official.note}</p>
                    <div className="flex items-center justify-center gap-2 flex-wrap">
                      <a href={official.url} target="_blank" rel="noopener noreferrer" data-testid="official-link"
                        className="inline-flex items-center justify-center gap-2 rounded-full bg-sage text-cream text-sm font-semibold px-6 py-3 hover:bg-sage-light transition-colors">
                        {official.action} ↗
                      </a>
                      {official.url2 && official.action2 && (
                        <a href={official.url2} target="_blank" rel="noopener noreferrer" data-testid="official-link-2"
                          className="inline-flex items-center justify-center gap-2 rounded-full border border-sage/40 text-moss text-sm font-semibold px-5 py-3 hover:bg-sage/8 transition-colors">
                          {official.action2} ↗
                        </a>
                      )}
                    </div>
                  </div>
                )}
                <Button onClick={() => handoff(result.type, result.text)} data-testid="route-go" variant={official ? 'secondary' : 'primary'}>
                  {official ? 'Plutôt écrire un courrier →' : `${dest.cta} →`}
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
