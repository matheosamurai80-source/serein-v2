'use client'
import { useEffect, useState } from 'react'
import { getDek, pendingRecoveryKey, markRecoveryKeySeen } from '@/lib/vault/session'

/**
 * Remise de la clé de secours — une seule fois, à la création du coffre.
 *
 * Option C : la clé de chiffrement vit sur l'appareil, rien à retaper au
 * quotidien. Cette clé-ci est la SEULE façon de retrouver ses données depuis
 * un autre appareil. On le dit franchement plutôt que de l'enterrer.
 */
export function CleDeSecours() {
  const [cle, setCle] = useState<string | null>(null)
  const [copie, setCopie] = useState(false)
  const [confirme, setConfirme] = useState(false)

  useEffect(() => {
    void (async () => {
      await getDek() // crée le coffre au premier passage
      setCle(pendingRecoveryKey())
    })()
  }, [])

  if (!cle) return null

  return (
    <div
      className="w-full bg-surface border-2 border-moss/40 rounded-2xl p-5"
      data-testid="cle-de-secours"
    >
      <p className="font-mono text-[11px] tracking-[.13em] uppercase text-moss mb-2">
        À noter maintenant
      </p>
      <p className="text-sm text-ink/80 leading-[1.6] mb-3">
        Vos données sensibles sont chiffrées sur cet appareil. Cette clé est le{' '}
        <strong className="text-ink">seul</strong> moyen de les rouvrir depuis un autre
        téléphone ou après une réinstallation.
      </p>

      <p
        className="font-mono text-[13px] tracking-[.06em] text-ink bg-ink/5 rounded-xl px-4 py-3 mb-3 break-all select-all"
        data-testid="cle-valeur"
      >
        {cle}
      </p>

      <p className="text-[13px] text-ink/60 leading-[1.55] mb-4">
        Écrivez-la sur papier ou rangez-la dans votre gestionnaire de mots de passe.
        Si vous perdez à la fois cet appareil et cette clé,{' '}
        <strong className="text-ink/80">vos données seront définitivement illisibles</strong> —
        y compris pour nous. C&apos;est ce qui rend la promesse vraie.
      </p>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard?.writeText(cle).then(() => setCopie(true)).catch(() => {})
          }}
          className="text-[13px] px-4 py-2 rounded-full border border-ink/15 text-ink/80 hover:bg-ink/5 transition"
        >
          {copie ? 'Copiée ✓' : 'Copier la clé'}
        </button>
        <button
          type="button"
          onClick={() => setConfirme(!confirme)}
          className="text-[13px] px-4 py-2 rounded-full border border-ink/15 text-ink/80 hover:bg-ink/5 transition"
          data-testid="cle-confirmer-case"
        >
          {confirme ? '☑ Je l’ai notée' : '☐ Je l’ai notée'}
        </button>
        <button
          type="button"
          disabled={!confirme}
          onClick={() => { markRecoveryKeySeen(); setCle(null) }}
          className="text-[13px] px-4 py-2 rounded-full bg-moss text-white disabled:opacity-35 disabled:cursor-not-allowed transition"
          data-testid="cle-masquer"
        >
          Masquer définitivement
        </button>
      </div>
    </div>
  )
}
