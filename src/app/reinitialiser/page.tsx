'use client'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { SereinNav } from '@/components/ui/nav'
import { useToast, Toast } from '@/components/ui/toast'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { validateNewPassword, friendlyResetError } from '@/lib/auth/logic'
import { LegalFooter } from '@/components/legal'

// Page cible du lien « mot de passe oublié ». Le lien ouvre une session de
// récupération (gérée par Supabase à l'arrivée) ; l'utilisateur choisit alors
// un nouveau mot de passe. Sans session valide (lien expiré/déjà utilisé),
// on invite à en redemander un.

type Phase = 'checking' | 'ready' | 'invalid' | 'done'

const inputCls =
  'w-full bg-surface border border-ink/12 rounded-xl px-4 py-3 text-sm text-ink ' +
  'placeholder:text-ink/35 focus:outline-none focus:border-sage/60 transition-colors'
const labelCls = 'font-mono text-[11px] tracking-[.13em] uppercase text-ink/50 mb-1.5 block text-left'

export default function ReinitialiserPage() {
  const toast = useToast()
  const [phase, setPhase] = useState<Phase>('checking')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const supabase = createSupabaseBrowserClient()
    let settled = false
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) { settled = true; setPhase('ready') }
    })
    void (async () => {
      // Le client @supabase/ssr échange automatiquement le jeton du lien (?code / hash).
      const { data: { session } } = await supabase.auth.getSession()
      if (session) { settled = true; setPhase('ready'); return }
      // Laisser une fenêtre au traitement du lien, puis conclure.
      setTimeout(() => { if (!settled) setPhase('invalid') }, 2500)
    })()
    return () => sub.subscription.unsubscribe()
  }, [])

  const save = async () => {
    if (busy) return
    const v = validateNewPassword(password, confirm)
    if (!v.ok) { toast.show(v.error!); return }
    setBusy(true)
    try {
      const supabase = createSupabaseBrowserClient()
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw new Error(error.message)
      setPhase('done')
      toast.show('Mot de passe mis à jour ✓')
      setTimeout(() => { window.location.href = '/accueil' }, 1300)
    } catch (e) {
      toast.show(friendlyResetError(e instanceof Error ? e.message : undefined))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <SereinNav />
      <main className="min-h-screen max-w-[440px] mx-auto px-5 py-10 flex flex-col items-center animate-fade-up">
        <p className="font-mono text-[11px] tracking-[.17em] uppercase text-moss mb-5 flex items-center gap-2.5">
          <span className="w-6 h-px bg-moss" />Nouveau mot de passe<span className="w-6 h-px bg-moss" />
        </p>
        <h1 className="font-serif text-[clamp(26px,5.5vw,40px)] tracking-[-0.025em] leading-[1.15] text-ink mb-3 text-center">
          Choisissez un <em className="text-moss">nouveau mot de passe.</em>
        </h1>

        {phase === 'checking' && (
          <p className="text-sm text-ink/60 leading-[1.6] mt-4 text-center" data-testid="reset-checking">
            Vérification du lien…
          </p>
        )}

        {phase === 'invalid' && (
          <div className="w-full bg-surface border border-ink/10 rounded-2xl p-6 mt-4 text-center" data-testid="reset-invalid">
            <p className="text-sm text-ink/80 leading-[1.6] mb-4">
              Ce lien a expiré ou a déjà été utilisé. Demandez-en un nouveau depuis la page de connexion.
            </p>
            <a href="/connexion" className="inline-block text-[13px] font-semibold bg-sage text-cream rounded-full px-5 py-2.5 hover:bg-sage-light transition-colors">
              Redemander un lien →
            </a>
          </div>
        )}

        {phase === 'ready' && (
          <div className="w-full bg-surface border border-ink/10 rounded-2xl p-6 flex flex-col gap-4 mt-2" data-testid="reset-form">
            <div>
              <label className={labelCls} htmlFor="new-password">Nouveau mot de passe</label>
              <input id="new-password" data-testid="new-password" type="password" autoComplete="new-password"
                className={inputCls} placeholder="8 caractères minimum" value={password}
                onChange={e => setPassword(e.target.value)} />
            </div>
            <div>
              <label className={labelCls} htmlFor="confirm-password">Confirmez le mot de passe</label>
              <input id="confirm-password" data-testid="confirm-password" type="password" autoComplete="new-password"
                className={inputCls} placeholder="Retapez le même mot de passe" value={confirm}
                onChange={e => setConfirm(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') void save() }} />
            </div>
            <Button onClick={save} loading={busy} data-testid="reset-save">
              Enregistrer mon nouveau mot de passe
            </Button>
          </div>
        )}

        {phase === 'done' && (
          <p data-testid="reset-done" className="text-[13px] text-moss leading-[1.55] text-center bg-sage/8 border border-sage/20 rounded-xl p-4 mt-4">
            ✓ Mot de passe mis à jour. Vous êtes connecté — redirection vers votre espace…
          </p>
        )}

        <LegalFooter />
        <Toast message={toast.message} visible={toast.visible} onHide={toast.hide} />
      </main>
    </>
  )
}
