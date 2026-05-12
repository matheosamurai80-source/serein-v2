'use client'
import { Button } from '@/components/ui/button'
import { useOnboardingStore } from '@/stores/onboarding'
export function ScreenLanding() {
  const nextStep = useOnboardingStore(s => s.nextStep)
  return (<div className="flex flex-col items-center text-center gap-4">
    <div className="font-mono text-xs tracking-[.17em] uppercase text-[#82A884]">Révélateur de pertes invisibles</div>
    <h1 className="font-serif text-4Xl leading-tight text-white">Vous payez pour<br />des choses que vous<br /><em className="text-[#AECBB0]">n&utilisez plus.</em></h1>
    <p className="text-white/65">Serein détecte vos abonnements oubliés et vos dépenses invisibles.</p>
    <div className="flex flex-col gap-2 w-full max-w-xs">
      <Button onClick={nextStep}>Découvrir ce que je perds →</Button>
      <Button variant="secondary" onClick={nextStep}>📄 Analyser sans connexion bancaire</Button>
    </div>
  </div>)
}
