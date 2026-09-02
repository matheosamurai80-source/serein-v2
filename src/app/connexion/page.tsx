'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { SereinNav } from '@/components/ui/nav'
import { useToast, Toast } from '@/components/ui/toast'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { validateCredentials, friendlyAuthError } from '@/lib/auth/logic'
import {
  validateTotpCode, normalizeTotpCode, mfaStepFromAAL, verifiedTotpId,
  friendlyMfaError, type FactorLike,
} from '@/lib/auth/mfa'
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
  // Étape 2FA : après le mot de passe, si le compte exige un second facteur.
  const [awaitingCode, setAwaitingCode] = useState(false)
  const [mfaFactorId, setMfaFactorId] = useState('')
  const [mfaCode, setMfaCode] = useState('')

  // Les données saisies sans compte suivent l'utilisateur dans son espace.
  const syncThenGo = async () => {
    try {
      const n = await migrateGuestData()
      if (n > 0) {
        toast.show(`${n} élément${n > 1 ? 's' : ''} de cet appareil transféré${n > 1 ? 's' : ''} dans votre espace ✓`)
        setTimeout(() => { window.location.href = '/accueil' }, 900)
        return
      }
    } catch { /* la connexion reste valable même si la migration échoue */ }
    window.location.href = '/accueil'
  }

  // Après un mot de passe correct : si le compte a la 2FA, on demande le code ;
  // sinon on entre directement. Un échec de l'appel AAL ne bloque pas la connexion.
  const afterAuth = async () => {
    const supabase = createSupabaseBrowserClient()
    try {
      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
      if (mfaStepFromAAL(aal ?? {}) === 'challenge') {
        const { data } = await supabase.auth.mfa.listFactors()
        const id = verifiedTotpId(((data?.all ?? []) as FactorLike[]).filter(f => f.factor_type === 'totp'))
        if (id) { setMfaFactorId(id); setAwaitingCode(true); return }
      }
    } catch { /* on ne bloque pas la connexion sur un souci d'appel MFA */ }
    await syncThenGo()
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
          await afterAuth()                        // connecté directement
        } else {
          setNeedConfirm(true)                     // confirmation e-mail requise
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword(creds)
        if (error) throw new Error(error.message)
        await afterAuth()
      }
    } catch (e) {
      toast.show(friendlyAuthError(e instanceof Error ? e.message : undefined))
    } finally {
      setBusy(false)
    }
  }

  // Étape 2 : vérifier le code à 6 chiffres, puis entrer dans l'espace.
  const verifyMfa = async () => {
    if (busy) return
    const v = validateTotpCode(mfaCode)
    if (!v.ok) { toast.show(v.error!); return }
    setBusy(true)
    try {
      const supabase = createSupabaseBrowserClient()
      const { error } = await supabase.auth.mfa.challengeAndVerify({
        factorId: mfaFactorId, code: normalizeTotpCode(mfaCode),
      })
      if (error) throw new Error(error.message)
      await syncThenGo()
    } catch (e) {
      toast.show(friendlyMfaError(e instanceof Error ? e.message : undefined))
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
          {awaitingCode ? 'Vérification en deux étapes.' : mode === 'signin' ? 'Bon retour.' : 'Créez votre espace Serein.'}
        </h1>
        <p className="text-sm text-ink/70 leading-[1.6] mb-7 text-center">
          {awaitingCode
            ? 'Dernière étape : entrez le code à 6 chiffres de votre application d’authentification.'
            : 'Vos engagements, rappels et lettres, retrouvés sur tous vos appareils.'}
        </p>

        {/* Étape 2FA : code à 6 chiffres après le mot de passe */}
        {awaitingCode && (
          <div className="w-full bg-surface border border-ink/10 rounded-2xl p-6 flex flex-col gap-4" data-testid="mfa-step">
            <div>
              <label className={labelCls} htmlFor="mfa-code">Code de vérification</label>
              <input id="mfa-code" data-testid="mfa-code" inputMode="numeric" maxLength={7}
                autoComplete="one-time-code" placeholder="123456"
                className={`${inputCls} tracking-[0.3em]`} value={mfaCode}
                onChange={e => setMfaCode(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') void verifyMfa() }} />
            </div>
            <Button onClick={verifyMfa} loading={busy} data-testid="mfa-verify">
              Vérifier et se connecter
            </Button>
            <button onClick={() => { setAwaitingCode(false); setMfaCode('') }}
              className="text-[13px] text-ink/50 hover:text-ink transition-colors">
              ← Revenir
            </button>
          </div>
        )}

        {/* Bascule connexion / inscription */}
        {!awaitingCode && (
        <>
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
        </>
        )}

        {!awaitingCode && (
        <p className="font-mono text-[11px] text-ink/45 tracking-wider text-center mt-5 leading-[1.7]">
          Vous pouvez aussi utiliser Serein sans compte —{' '}
          <a href="/engagements" className="text-moss underline">continuer sans connexion</a>.
        </p>
        )}
        <LegalFooter />

        <Toast message={toast.message} visible={toast.visible} onHide={toast.hide} />
      </main>
    </>
  )
}
