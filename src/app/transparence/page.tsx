'use client'
import { useEffect, useMemo, useState } from 'react'
import { FoyerTabs } from '@/components/ui/foyer-tabs'
import { seal, generateRecoveryKey } from '@/lib/vault/crypto'
import { serverProjection, tierOf } from '@/lib/vault/tiers'

// Écran de transparence : la PREUVE, en direct sur l'appareil, que le serveur
// ne voit rien de sensible. Démo autonome (chiffrement réel, données d'exemple) —
// aucune donnée réelle, rien de branché. C'est le socle du coffre chiffré.

const RECORD = {
  provider: 'AXA France',
  amount: 61.4,
  contract_ref: 'AUTO-2025-4471',
  notes: 'Résilier avant le déménagement',
  service_type: 'assurance_auto',
  due_date: '2026-09-15',
  id: 'c7f1e0aa',
}
const LABEL: Record<string, string> = {
  provider: 'Fournisseur', amount: 'Montant', contract_ref: 'N° de contrat', notes: 'Notes',
  service_type: 'Catégorie', due_date: 'Échéance', id: 'Identifiant technique',
}
const valeur = (k: string) => (k === 'amount' ? `${RECORD.amount.toLocaleString('fr-FR')} €` : String(RECORD[k as keyof typeof RECORD]))

export default function TransparencePage() {
  const [serverView, setServerView] = useState<Record<string, unknown> | null>(null)
  const [reveal, setReveal] = useState(false)
  const recovery = useMemo(() => generateRecoveryKey(), [])

  useEffect(() => {
    void (async () => {
      // Chiffrement RÉEL avec une clé de session (démo) — le blob est authentique.
      const dek = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'])
      const sealed = await seal(dek, RECORD)
      setServerView(serverProjection('commitment', RECORD, sealed))
    })()
  }, [])

  const champs = Object.keys(RECORD)
  const coffre = champs.filter(k => tierOf(`commitment.${k}`).tier === 'coffre')
  const serveur = champs.filter(k => tierOf(`commitment.${k}`).tier === 'serveur')

  return (
    <>
      <FoyerTabs />
      <main className="min-h-screen max-w-[640px] mx-auto px-5 py-10 animate-fade-up">
        <p className="font-mono text-[11px] tracking-[.17em] uppercase text-moss mb-4 flex items-center gap-2.5">
          <span className="w-6 h-px bg-moss" />Confidentialité<span className="w-6 h-px bg-moss" />
        </p>
        <h1 className="font-serif text-[clamp(26px,5.5vw,42px)] tracking-[-0.02em] leading-[1.1] text-ink mb-3">
          Ce que le serveur <em className="text-moss">voit vraiment.</em>
        </h1>
        <p className="text-sm text-ink/70 leading-[1.6] mb-8">
          Le même contrat, deux vues. Tout se chiffre <strong>sur ton appareil</strong> : le serveur
          n’en garde que le strict minimum pour t’alerter. Démonstration en direct, avec un exemple.
        </p>

        {/* Sur ton appareil */}
        <div className="bg-surface border border-sage/30 rounded-2xl p-5 mb-3">
          <div className="flex items-center justify-between mb-3">
            <span className="font-mono text-[11px] tracking-[.12em] uppercase text-moss">🔓 Sur ton appareil</span>
            <button onClick={() => setReveal(r => !r)} className="font-mono text-[11px] text-ink/45 underline">
              {reveal ? 'masquer' : 'montrer'}
            </button>
          </div>
          <div className="flex flex-col gap-2">
            {champs.map(k => {
              const t = tierOf(`commitment.${k}`)
              return (
                <div key={k} className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="text-ink/55">{LABEL[k] ?? k}</span>
                  <span className={`font-serif text-[16px] text-ink text-right ${t.tier === 'coffre' && !reveal ? 'blur-[5px] select-none' : ''}`}>
                    {valeur(k)}
                    {t.tier === 'coffre' && <span className="ml-1.5 text-[11px]">🔒</span>}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Sur le serveur */}
        <div className="bg-ink/[0.04] border border-ink/10 rounded-2xl p-5 mb-6">
          <span className="font-mono text-[11px] tracking-[.12em] uppercase text-ink/50 block mb-3">☁️ Ce que le serveur stocke, en vrai</span>
          <pre className="text-[12px] font-mono text-ink/80 whitespace-pre-wrap leading-[1.7] overflow-x-auto">
{serverView ? JSON.stringify(serverView, null, 2) : 'chiffrement en cours…'}
          </pre>
          <p className="text-xs text-ink/55 leading-[1.55] mt-3">
            Ni fournisseur, ni montant, ni n° de contrat, ni notes — juste du <strong>chiffré</strong>,
            plus l’échéance et la catégorie (pour t’alerter et appliquer le bon régime).
          </p>
        </div>

        {/* Ce qui est chiffré / visible */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-surface border border-ink/10 rounded-2xl p-4">
            <div className="font-serif text-[22px] text-moss">{coffre.length}</div>
            <div className="text-xs text-ink/60 mt-0.5">champ{coffre.length > 1 ? 's' : ''} chiffré{coffre.length > 1 ? 's' : ''} (coffre)</div>
          </div>
          <div className="bg-surface border border-ink/10 rounded-2xl p-4">
            <div className="font-serif text-[22px] text-ink/70">{serveur.length}</div>
            <div className="text-xs text-ink/60 mt-0.5">champ{serveur.length > 1 ? 's' : ''} visible{serveur.length > 1 ? 's' : ''} (technique)</div>
          </div>
        </div>

        {/* Clé de secours + garde-fou */}
        <div className="bg-amber/8 border border-amber/25 rounded-2xl p-5">
          <p className="text-sm text-ink leading-[1.6] mb-2">
            🔑 <strong>Ta clé de secours</strong> — le seul moyen de rouvrir ton coffre si tu oublies ta phrase.
            À <strong>imprimer et garder</strong> : personne, pas même Serein, ne peut la régénérer.
          </p>
          <code className="block bg-cream border border-amber/25 rounded-lg px-3 py-2 text-[13px] font-mono text-ink text-center tracking-wider">{recovery}</code>
          <p className="text-xs text-ink/55 leading-[1.55] mt-2">
            (exemple) Si tu perds <strong>et</strong> ta phrase <strong>et</strong> ta clé, les données chiffrées sont
            définitivement perdues — c’est le prix du « personne d’autre ne peut lire ».
          </p>
        </div>

        <p className="font-mono text-[11px] text-ink/40 tracking-wider text-center mt-6">
          Démonstration — aucune donnée réelle. Le coffre chiffré n’est pas encore branché aux services.
        </p>
      </main>
    </>
  )
}
