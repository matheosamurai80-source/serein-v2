'use client'
import { Button } from '@/components/ui/button'
import { useOnboardingStore } from '@/stores/onboarding'

export function ScreenLanding() {
  const nextStep = useOnboardingStore(s => s.nextStep)

  return (
    <div className="flex flex-col items-center text-center gap-0 animate-fade-up">
      {/* Badge */}
      <div className="inline-flex items-center gap-2 bg-sage/10 border border-sage/20 rounded-full px-4 py-2 mb-6 font-mono text-xs text-sage-light tracking-widest">
        <span className="w-1.5 h-1.5 rounded-full bg-sage animate-blink" />
        4,7 abonnements oubliés en moyenne par foyer
      </div>

      {/* Eyebrow */}
      <p className="font-mono text-[11px] tracking-[.17em] uppercase text-sage mb-5 flex items-center gap-2.5">
        <span className="w-6 h-px bg-moss" />
        Révélateur de pertes invisibles
        <span className="w-6 h-px bg-moss" />
      </p>

      {/* Headline */}
      <h1 className="font-serif text-[clamp(32px,7.5vw,68px)] leading-[1.06] tracking-[-0.03em] text-warm mb-5">
        Vous payez pour<br />
        des choses que vous<br />
        <em className="text-sage-light">n&apos;utilisez plus.</em>
      </h1>

      {/* Sub */}
      <p className="text-[clamp(15px,3.5vw,17px)] leading-[1.7] text-white/65 font-light max-w-[420px] mb-2">
        Serein détecte vos abonnements oubliés et vos dépenses invisibles.
      </p>
      <p className="text-sm text-white/38 italic mb-9">Et personne ne vous prévient.</p>

      {/* CTAs */}
      <div className="flex flex-col items-center gap-2.5 w-full">
        <Button onClick={nextStep}>Découvrir ce que je perds →</Button>
        <Button variant="secondary" onClick={nextStep}>📄 Analyser sans connexion bancaire</Button>
        <p className="font-mono text-[11px] text-white/38 tracking-wider mt-1">
          Gratuit · 3 minutes · Aucune connexion requise
        </p>
      </div>

      {/* Trust pills */}
      <div className="flex gap-2.5 flex-wrap justify-center mt-8">
        {['Lecture seule', 'Données en France', '0 commission cachée'].map(t => (
          <span key={t} className="flex items-center gap-1.5 text-[11.5px] text-white/38 bg-white/4 border border-white/7 px-3.5 py-1.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-moss-mid" />
            {t}
          </span>
        ))}
      </div>
    </div>
  )
}
