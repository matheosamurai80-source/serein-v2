'use client'
import { Button } from '@/components/ui/button'
import { useOnboardingStore } from '@/stores/onboarding'
import { cn } from '@/lib/utils'
import type { SubscriptionChoice, SubscriptionLabel } from '@/types'

const CHOICES: { count: SubscriptionChoice; label: SubscriptionLabel; display: string }[] = [
  { count: 2, label: '0–3', display: '0–3' },
  { count: 5, label: '4–6', display: '4–6' },
  { count: 9, label: '7+',  display: '7+'  },
]

export function ScreenQuestion() {
  const { estimatedSubscriptions, choiceLabel, selectSubscriptions, nextStep } = useOnboardingStore()

  return (
    <div className="flex flex-col items-center w-full animate-fade-up">
      <p className="font-mono text-[11px] tracking-[.17em] uppercase text-moss mb-5 flex items-center gap-2.5">
        <span className="w-6 h-px bg-moss" />Étape 1 / 2<span className="w-6 h-px bg-moss" />
      </p>

      <div className="w-full bg-surface border border-ink/10 rounded-2xl p-9 mb-7">
        <p className="font-mono text-[11px] tracking-[.13em] uppercase text-moss mb-3.5 text-left">
          Une seule question
        </p>
        <h2 className="font-serif text-[clamp(20px,4.5vw,30px)] tracking-[-0.02em] leading-[1.3] text-ink mb-7 text-left">
          Combien d&apos;abonnements<br />
          pensez-vous avoir <em className="text-moss">actuellement ?</em>
        </h2>

        <div className="grid grid-cols-3 gap-2.5">
          {CHOICES.map(({ count, label, display }) => {
            const selected = choiceLabel === label
            return (
              <button
                key={count}
                onClick={() => selectSubscriptions(count, label)}
                className={cn(
                  'flex flex-col items-center gap-1.5 rounded-2xl py-5 px-2',
                  'border transition-all duration-200 relative overflow-hidden',
                  selected
                    ? 'border-sage bg-sage/13 shadow-[0_0_0_3px_rgba(130,168,132,0.14)]'
                    : 'border-ink/10 bg-surface hover:border-sage hover:bg-sage/8'
                )}
              >
                {selected && (
                  <span className="absolute top-2 right-2.5 text-[11px] text-moss font-semibold">✓</span>
                )}
                <span className={cn(
                  'font-serif text-[clamp(24px,5vw,30px)] tracking-[-0.02em] leading-none transition-colors',
                  selected ? 'text-moss' : 'text-ink'
                )}>
                  {display}
                </span>
                <span className={cn(
                  'font-mono text-[10px] tracking-wider uppercase transition-colors',
                  selected ? 'text-moss' : 'text-ink/50'
                )}>
                  abonnements
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex flex-col items-center gap-2.5 w-full">
        <Button
          onClick={nextStep}
          disabled={!estimatedSubscriptions}
          className={!estimatedSubscriptions ? 'opacity-40 cursor-not-allowed' : ''}
        >
          Voir mon estimation →
        </Button>
        <p className="font-mono text-[11px] text-ink/50 tracking-wider">
          Aucune donnée collectée à cette étape
        </p>
      </div>
    </div>
  )
}
