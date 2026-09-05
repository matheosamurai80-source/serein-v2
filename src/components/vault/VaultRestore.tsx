'use client'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { backupEnvelope, restoreFromRecoveryKey, type RestoreResult } from '@/lib/vault/session'
import { validateRecoveryKey } from '@/lib/vault/recovery'

/**
 * Restauration du coffre sur un nouvel appareil (compte connecté).
 *
 * Au montage, on sauvegarde l'enveloppe locale côté serveur (best effort) pour
 * que cet appareil puisse, plus tard, être restauré ailleurs. Et on offre la
 * saisie de la clé de secours pour rouvrir ici des données chiffrées ailleurs.
 */

const inputCls =
  'w-full bg-surface border border-ink/12 rounded-xl px-4 py-3 text-sm text-ink tracking-[0.08em] ' +
  'placeholder:text-ink/35 placeholder:tracking-normal focus:outline-none focus:border-sage/60 transition-colors'

const MESSAGES: Record<Exclude<RestoreResult, 'ok'>, string> = {
  invalid: 'Cette clé ne correspond pas à votre coffre. Vérifiez-la et réessayez.',
  aucune_sauvegarde: 'Aucune sauvegarde de coffre trouvée pour ce compte. Ouvrez d’abord Serein sur l’appareil d’origine.',
  hors_ligne: 'Connexion au serveur impossible. Réessayez dans un instant.',
  sans_stockage: 'Ce navigateur bloque le stockage local : la restauration n’est pas possible ici.',
}

export function VaultRestore({ notify }: { notify: (msg: string) => void }) {
  const [connected, setConnected] = useState(false)
  const [open, setOpen] = useState(false)
  const [key, setKey] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    void (async () => {
      try {
        const supabase = createSupabaseBrowserClient()
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.user) return
        setConnected(true)
        void backupEnvelope() // sauvegarde l'enveloppe de cet appareil (best effort)
      } catch { /* env absente : rien à proposer */ }
    })()
  }, [])

  const restore = async () => {
    if (busy) return
    const v = validateRecoveryKey(key)
    if (!v.ok) { notify(v.error!); return }
    setBusy(true)
    try {
      const res = await restoreFromRecoveryKey(key)
      if (res === 'ok') {
        notify('Coffre restauré ✓ — vos données chiffrées sont de nouveau lisibles.')
        setTimeout(() => { window.location.reload() }, 1000)
      } else {
        notify(MESSAGES[res])
      }
    } finally {
      setBusy(false)
    }
  }

  if (!connected) return null

  return (
    <div className="w-full bg-surface border border-ink/10 rounded-2xl p-5" data-testid="vault-restore">
      <p className="font-mono text-[11px] tracking-[.13em] uppercase text-ink/50 mb-2">
        Nouvel appareil ?
      </p>
      {!open ? (
        <>
          <p className="text-sm text-ink/80 leading-[1.6] mb-3">
            Sur un nouveau téléphone ou après réinstallation, vos données chiffrées (nom et
            montant de vos contrats) apparaissent vides tant que ce coffre n’est pas restauré.
            Saisissez votre clé de secours pour les rouvrir ici.
          </p>
          <Button variant="secondary" size="md" onClick={() => setOpen(true)} data-testid="vault-restore-open">
            Restaurer mes données chiffrées
          </Button>
        </>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-ink/80 leading-[1.6]">
            Entrez la clé de secours notée lors de la création de votre coffre
            (format <code className="font-mono text-[12px]">SEREIN-XXXX-…</code>) :
          </p>
          <input data-testid="vault-restore-key" className={inputCls} placeholder="SEREIN-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX"
            autoComplete="off" spellCheck={false} value={key}
            onChange={e => setKey(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') void restore() }} />
          <div className="flex gap-2 items-center">
            <Button size="md" onClick={() => void restore()} loading={busy} data-testid="vault-restore-submit">
              Restaurer
            </Button>
            <button onClick={() => { setOpen(false); setKey('') }}
              className="text-[13px] text-ink/50 hover:text-ink transition-colors">
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
