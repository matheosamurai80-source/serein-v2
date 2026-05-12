'use client'
import { Button } from '@/components/ui/button'
import { useOnboardingStore } from '@/stores/onboarding'
import type { SubscriptionChoice, SubscriptionLabel } from '@/types'
const CHOICES: { count: SubscriptionChoice; label: SubscriptionLabel }[] = [{ count: 2, label: '0–3' },{ count: 5, label: '4–6' },{ count: 9, label: '7+' }]
export function ScreenQuestion() {
  const { choiceLabel, selectSubscriptions, estimatedSubscriptions, nextStep } = useOnboardingStore()
  return (<div className="flex flex-col gap-6 w-full">
    <h2 className="font-serif text-2xl text-white">Combien d'abonnements pensez-vous avoir ?</h2>
    <div className="grid grid-cols-3 gap-3">
      {CHOICES.map(({ count, label }) => (
        <button key={count} onClick={() => selectSubscriptions(count, label)}
          className={`py-6 rounded-2xl border transition-all ${choiceLabel===label?'border-[#82A884] bg-[#82A884]/10':'border-white/10 bg-white/5'}`}>
          <span className="font-serif text-2xl text-white">{label}</span>
        </button>
      ))}
    </div>
    <Button onClick={nextStep} disabled={!estimatedSubscriptions}>Voir mon estimation →</Button>
  </div>)
}
