'use client'
import { Button } from '@/components/ui/button'
import { useOnboardingStore } from '@/stores/onboarding'
export function ScreenReassurance() {
  const nextStep = useOnboardingStore(s => s.nextStep)
  return (<div className="flex flex-col gap-6">
    <h2 className="font-serif text-2xl text-white">Votre banque reste entièrement la vôtre.</h2>
    <ul className="flex flex-col gap-2 text-white/65">
      <li>Lecture seule — aucun virement possible</li>
      <li>Norme DSP2 régulée (Powens agréé ACPR)</li>
      <li>Données en France, jamais revendues</li>
      <li>Révocable en 1 clic</li>
    </ul>
    <Button onClick={nextStep}>J&apos;ai compris, je continue →</Button>
  </div>)
}
