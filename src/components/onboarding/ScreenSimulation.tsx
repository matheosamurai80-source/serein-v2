'use client'
import { Button } from '@/components/ui/button'
import { useOnboardingStore } from '@/stores/onboarding'
export function ScreenSimulation() {
  const { simulation, choiceLabel, nextStep } = useOnboardingStore()
  if (!simulation) return null
  return (<div className="flex flex-col gap-6">
    <h2 className="font-serif text-2xl text-white">Ce que Serein trouve en 3 minutes</h2>
    <p className="text-white/65">Basé sur vos <strong>{choiceLabel}</strong> abonnements estimés.</p>
    <div className="bg-white/5 rounded-2xl p-6">
      <p className="font-serif text-5xl text-[#EAB95E]">{simulation.annualLoss} ₼ / an</p>
      <p className="text-white/65">{simulation.monthlyLoss} € / mois</p>
    </div>
    <Button onClick={nextStep}>Reprendre le contrôle →</Button>
  </div>)
}
