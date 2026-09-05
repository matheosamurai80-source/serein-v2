'use client'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import {
  validateTotpCode, normalizeTotpCode, verifiedTotpId, unverifiedTotpIds,
  friendlyMfaError, type FactorLike,
} from '@/lib/auth/mfa'

// Carte « Sécurité — double authentification » de la page Mon compte.
// Activation TOTP en 2 temps : QR à scanner → code à 6 chiffres à confirmer.
// La crypto est faite par Supabase ; ce composant orchestre le parcours.

type Phase = 'loading' | 'off' | 'enrolling' | 'on'

const inputCls =
  'w-full bg-surface border border-ink/12 rounded-xl px-4 py-3 text-sm text-ink tracking-[0.3em] ' +
  'placeholder:text-ink/30 placeholder:tracking-normal focus:outline-none focus:border-sage/60 transition-colors'

export function SecurityMfa({ notify }: { notify: (msg: string) => void }) {
  const [supabase] = useState(() => createSupabaseBrowserClient())
  const [phase, setPhase] = useState<Phase>('loading')
  const [connected, setConnected] = useState(false)
  const [qr, setQr] = useState('')
  const [secret, setSecret] = useState('')
  const [factorId, setFactorId] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)

  const totpFactors = async (): Promise<FactorLike[]> => {
    const { data } = await supabase.auth.mfa.listFactors()
    return ((data?.all ?? []) as FactorLike[]).filter(f => f.factor_type === 'totp')
  }

  useEffect(() => {
    void (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) { setConnected(false); setPhase('off'); return }
        setConnected(true)
        setPhase(verifiedTotpId(await totpFactors()) ? 'on' : 'off')
      } catch { setPhase('off') }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const activate = async () => {
    if (busy) return
    setBusy(true)
    try {
      // Nettoyer une activation inachevée avant d'en démarrer une neuve.
      for (const id of unverifiedTotpIds(await totpFactors())) {
        try { await supabase.auth.mfa.unenroll({ factorId: id }) } catch { /* best effort */ }
      }
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp', friendlyName: `Serein-${Date.now()}`,
      })
      if (error) throw new Error(error.message)
      setFactorId(data.id)
      setQr(data.totp.qr_code)
      setSecret(data.totp.secret)
      setCode('')
      setPhase('enrolling')
    } catch (e) {
      notify(friendlyMfaError(e instanceof Error ? e.message : undefined))
    } finally { setBusy(false) }
  }

  const confirm = async () => {
    if (busy) return
    const v = validateTotpCode(code)
    if (!v.ok) { notify(v.error!); return }
    setBusy(true)
    try {
      const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code: normalizeTotpCode(code) })
      if (error) throw new Error(error.message)
      setPhase('on'); setCode(''); setQr(''); setSecret('')
      notify('Double authentification activée ✓')
    } catch (e) {
      notify(friendlyMfaError(e instanceof Error ? e.message : undefined))
    } finally { setBusy(false) }
  }

  const cancel = async () => {
    if (factorId) { try { await supabase.auth.mfa.unenroll({ factorId }) } catch { /* déjà retiré */ } }
    setFactorId(''); setQr(''); setSecret(''); setCode(''); setPhase('off')
  }

  const disable = async () => {
    if (busy) return
    setBusy(true)
    try {
      const id = verifiedTotpId(await totpFactors())
      if (id) {
        const { error } = await supabase.auth.mfa.unenroll({ factorId: id })
        if (error) throw new Error(error.message)
      }
      setPhase('off')
      notify('Double authentification désactivée.')
    } catch (e) {
      notify(friendlyMfaError(e instanceof Error ? e.message : undefined))
    } finally { setBusy(false) }
  }

  if (!connected || phase === 'loading') return null

  return (
    <div className="w-full bg-surface border border-ink/10 rounded-2xl p-5" data-testid="mfa-card">
      <p className="font-mono text-[11px] tracking-[.13em] uppercase text-ink/50 mb-2">
        Sécurité — double authentification
      </p>

      {phase === 'on' && (
        <>
          <p className="text-sm text-ink/80 leading-[1.6] mb-3">
            <strong className="text-moss">✓ Activée.</strong> À chaque connexion, un code à 6 chiffres
            de votre application est demandé en plus du mot de passe. Même si votre mot de passe fuite,
            votre compte reste verrouillé.
          </p>
          <Button variant="secondary" size="md" onClick={() => void disable()} loading={busy} data-testid="mfa-disable">
            Désactiver la double authentification
          </Button>
        </>
      )}

      {phase === 'off' && (
        <>
          <p className="text-sm text-ink/80 leading-[1.6] mb-3">
            Ajoutez une seconde clé à votre compte : même si votre mot de passe fuite, personne
            ne peut se connecter sans le code de votre téléphone. Il vous faut une application
            gratuite d&apos;authentification (Google Authenticator, Authy, ou celle de votre gestionnaire
            de mots de passe).
          </p>
          <Button size="md" onClick={() => void activate()} loading={busy} data-testid="mfa-activate">
            Activer la double authentification
          </Button>
        </>
      )}

      {phase === 'enrolling' && (
        <div className="flex flex-col gap-3" data-testid="mfa-enroll">
          <p className="text-sm text-ink/80 leading-[1.6]">
            <strong>1.</strong> Scannez ce QR code avec votre application d&apos;authentification :
          </p>
          {qr && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qr} alt="QR code de configuration 2FA"
              className="w-44 h-44 self-center bg-white rounded-xl p-2 border border-ink/10" />
          )}
          <p className="text-[12.5px] text-ink/60 leading-[1.55]">
            Impossible de scanner ? Saisissez cette clé à la main dans l&apos;application :
            <br />
            <code className="font-mono text-[12px] text-ink break-all select-all" data-testid="mfa-secret">{secret}</code>
          </p>
          <p className="text-sm text-ink/80 leading-[1.6]">
            <strong>2.</strong> Entrez le code à 6 chiffres affiché par l&apos;application :
          </p>
          <input inputMode="numeric" maxLength={7} autoComplete="one-time-code" placeholder="123456"
            className={inputCls} value={code}
            onChange={e => setCode(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') void confirm() }}
            data-testid="mfa-code" />
          <div className="flex gap-2 items-center">
            <Button size="md" onClick={() => void confirm()} loading={busy} data-testid="mfa-confirm">
              Confirmer
            </Button>
            <button onClick={() => void cancel()}
              className="text-[13px] text-ink/50 rounded-full px-4 py-2 hover:text-crimson transition-colors">
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
