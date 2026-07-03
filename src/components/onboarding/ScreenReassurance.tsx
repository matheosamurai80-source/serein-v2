'use client'
import { Button } from '@/components/ui/button'
import { useOnboardingStore } from '@/stores/onboarding'

const DSP2_ITEMS = [
  { title: 'Lecture seule', desc: 'Serein lit vos transactions. Aucun virement possible. Techniquement impossible.' },
  { title: 'Norme Banque de France', desc: 'Connexion régulée DSP2, gérée par Powens (agréé ACPR).' },
  { title: 'Révocable en 1 clic', desc: 'Déconnectez votre banque à tout moment depuis l\'app.' },
  { title: 'Données en France', desc: 'Hébergées OVH Roubaix, chiffrées, jamais revendues.' },
]

const TRUST_TILES = [
  { icon: '🚫', title: 'Zéro commission', desc: 'Aucune commission des services analysés.' },
  { icon: '🔌', title: 'Déconnexion libre', desc: 'Accès révocable. Pas de formulaire.' },
  { icon: '🇫🇷', title: 'RGPD conforme', desc: 'Données françaises. Jamais partagées.' },
  { icon: '✋', title: 'Vous décidez', desc: 'Aucune action sans votre accord.' },
]

export function ScreenReassurance() {
  const nextStep = useOnboardingStore(s => s.nextStep)

  return (
    <div className="flex flex-col items-center w-full animate-fade-up">
      <p className="font-mono text-[11px] tracking-[.17em] uppercase text-moss mb-5 flex items-center gap-2.5">
        <span className="w-6 h-px bg-moss" />Sécurité &amp; Confiance<span className="w-6 h-px bg-moss" />
      </p>

      <h2 className="font-serif text-[clamp(24px,5.5vw,44px)] tracking-[-0.025em] leading-[1.15] text-ink mb-6 text-center">
        Votre banque reste<br /><em className="text-moss">entièrement la vôtre.</em>
      </h2>

      {/* DSP2 card */}
      <div className="w-full bg-sage/7 border border-sage/16 rounded-2xl p-7 mb-5">
        <p className="font-serif text-lg tracking-[-0.01em] text-ink mb-4">
          Ce que la connexion DSP2 signifie concrètement
        </p>
        <div className="flex flex-col gap-3">
          {DSP2_ITEMS.map(item => (
            <div key={item.title} className="flex items-start gap-3 text-[13.5px] text-ink/70 leading-[1.55]">
              <span className="w-[22px] h-[22px] rounded-full bg-sage/18 border border-sage/24 flex items-center justify-center text-[11px] text-moss font-bold flex-shrink-0 mt-0.5">✓</span>
              <span><strong className="text-ink">{item.title}</strong> — {item.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Trust grid */}
      <div className="grid grid-cols-2 gap-2.5 w-full mb-5">
        {TRUST_TILES.map(tile => (
          <div key={tile.title} className="bg-surface border border-ink/10 rounded-2xl p-4">
            <span className="text-lg mb-2 block">{tile.icon}</span>
            <p className="text-sm font-semibold text-ink mb-1">{tile.title}</p>
            <p className="text-xs text-ink/50 leading-[1.55]">{tile.desc}</p>
          </div>
        ))}
      </div>

      <div className="w-full bg-surface border border-ink/10 rounded-2xl p-4 mb-6 text-sm text-ink/70 leading-[1.6] text-left">
        Vous préférez ne pas connecter votre banque ?{' '}
        <strong className="text-moss">Importez simplement un relevé PDF.</strong>{' '}
        Serein l&apos;analyse en 60 secondes.
      </div>

      <Button onClick={nextStep} className="w-full max-w-[380px]">J&apos;ai compris, je continue →</Button>
    </div>
  )
}
