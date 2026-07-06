'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { SereinNav } from '@/components/ui/nav'
import { useToast, Toast } from '@/components/ui/toast'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { validateCredentials, friendlyAuthError } from '@/lib/auth/logic'
import { migrateGuestData } from '@/lib/data/store'
import { LegalFooter } from '@/components/legal'

type Mode = 'signin' | 'signup'

const inputCls =
  'w-full bg-surface border border-ink/12 rounded-xl px-4 py-3 text-sm text-ink ' +
  'placeholder:text-ink/35 focus:outline-none focus:border-sage/60 transition-colors'
const labelCls = 'font-mono text-[11px] tracking-[.13em] uppercase text-ink/50 mb-1.5 block text-left'

export default function ConnexionPage() {
  const toast = useToast()
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [needConfirm, setNeedConfirm] = useState(false)

  // Les données saisies sans compte suivent l'utilisateur dans son espace.
  const syncThenGo = async () => {
    try {
      const n = await migrateGuestData()
      if (n > 0) {
        toast.show(`${n} élément${n > 1 ? 's' : ''} de cet appareil transféré${n > 1 ? 's' : ''} dans votre espace ✓`)
        setTimeout(() => { window.location.href = '/dashboard' }, 900)
        return
      }
    } catch { /* la connexion reste valable même si la migration échoue */ }
    window.location.href = '/dashboard'
  }

  const submit = async () => {
    if (busy) return
    const v = validateCredentials(email, password)
    if (!v.ok) { toast.show(v.error!); return }
    setBusy(true)
    setNeedConfirm(false)
    try {
      const supabase = createSupabaseBrowserClient()
      const creds = { email: email.trim(), password }
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp(creds)
        if (error) throw new Error(error.message)
        if (data.session) {
          await syncThenGo()                       // connecté directement
        } else {
          setNeedConfirm(true)                     // confirmation e-mail requise
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword(creds)
        if (error) throw new Error(error.message)
        await syncThenGo()
      }
    } catch (e) {
      toast.show(friendlyAuthError(e instanceof Error ? e.message : undefined))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <SereinNav />
      <main className="min-h-screen max-w-[440px] mx-auto px-5 py-10 flex flex-col items-center animate-fade-up">
        <p className="font-mono text-[11px] tracking-[.17em] uppercase text-moss mb-5 flex items-center gap-2.5">
          <span className="w-6 h-px bg-moss" />Votre espace<span className="w-6 h-px bg-moss" />
        </p>
        <h1 className="font-serif text-[clamp(26px,5.5vw,40px)] tracking-[-0.025em] leading-[1.15] text-ink mb-3 text-center">
          {mode === 'signin' ? 'Bon retour.' : 'Créez votre espace Serein.'}
        </h1>
        <p className="text-sm text-ink/70 leading-[1.6] mb-7 text-center">
          Vos engagements, rappels et lettres, retrouvés sur tous vos appareils.
        </p>

        {/* Bascule connexion / inscription */}
        <div className="w-full bg-surface-2 border border-ink/10 rounded-full p-1 flex mb-6" data-testid="mode-switch">
          {(['signin', 'signup'] as Mode[]).map(m => (
            <button key={m} data-testid={`mode-${m}`} onClick={() => { setMode(m); setNeedConfirm(false) }}
              className={`flex-1 text-[13px] font-semibold py-2.5 rounded-full transition-colors ${
                mode === m ? 'bg-sage text-cream' : 'text-ink/55 hover:text-ink'}`}>
              {m === 'signin' ? 'Se connecter' : 'Créer un compte'}
            </button>
          ))}
        </div>

        <div className="w-full bg-surface border border-ink/10 rounded-2xl p-6 flex flex-col gap-4">
          <div>
            <label className={labelCls} htmlFor="email">E-mail</label>
            <input id="email" type="email" autoComplete="email" inputMode="email" className={inputCls}
              placeholder="vous@exemple.fr" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div>
            <label className={labelCls} htmlFor="password">Mot de passe</label>
            <input id="password" type="password"
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} className={inputCls}
              placeholder="8 caractères minimum" value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') submit() }} />
          </div>
          <Button onClick={submit} loading={busy} data-testid="submit">
            {mode === 'signin' ? 'Se connecter' : 'Créer mon compte'}
          </Button>

          {needConfirm && (
            <p data-testid="confirm-msg" className="text-[13px] text-moss leading-[1.55] text-center bg-sage/8 border border-sage/20 rounded-xl p-3">
              ✉️ Compte créé ! Vérifiez votre boîte mail pour confirmer votre adresse,
              puis revenez vous connecter.
            </p>
          )}
        </div>

        <p className="font-mono text-[11px] text-ink/45 tracking-wider text-center mt-5 leading-[1.7]">
          Vous pouvez aussi utiliser Serein sans compte —{' '}
          <a href="/engagements" className="text-moss underline">continuer sans connexion</a>.
        </p>
        <LegalFooter />

        <Toast message={toast.message} visible={toast.visible} onHide={toast.hide} />
      </main>
    </>
  )
}
