'use client'
import { useOnboardingStore } from '@/stores/onboarding'
import { ProgressBar } from '@/components/ui/progress'
import { ScreenLanding } from './ScreenLanding'
import { ScreenQuestion } from './ScreenQuestion'
import { ScreenSimulation } from './ScreenSimulation'
import { ScreenReassurance } from './ScreenReassurance'
import { ScreenConversion } from './ScreenConversion'

const SCREENS = {
  1: ScreenLanding,
  2: ScreenQuestion,
  3: ScreenSimulation,
  4: ScreenReassurance,
  5: ScreenConversion,
} as const

const STEP_LABELS = {
  1: 'Étape 1 / 5',
  2: 'Étape 2 / 5',
  3: 'Étape 3 / 5',
  4: 'Étape 4 / 5',
  5: 'Étape 5 / 5',
} as const

const BG_STYLES = {
  1: 'bg-cream bg-[radial-gradient(ellipse_70%_55%_at_50%_-8%,rgba(85,122,89,.14)_0%,transparent_70%)]',
  2: 'bg-cream-2',
  3: 'bg-cream bg-[radial-gradient(ellipse_55%_40%_at_50%_100%,rgba(181,113,58,.08)_0%,transparent_68%)]',
  4: 'bg-cream-2 bg-[radial-gradient(ellipse_60%_45%_at_50%_5%,rgba(85,122,89,.10)_0%,transparent_65%)]',
  5: 'bg-cream bg-[radial-gradient(ellipse_65%_50%_at_50%_0%,rgba(85,122,89,.12)_0%,transparent_65%)]',
} as const

export function OnboardingShell() {
  const { step, prevStep } = useOnboardingStore()
  const progress = ((step - 1) / 4) * 100
  const CurrentScreen = SCREENS[step]

  return (
    <>
      <ProgressBar value={progress} />

      {/* Topbar */}
      <header className="fixed top-0 left-0 right-0 z-[199] h-[60px] flex items-center justify-between px-6 bg-cream/90 backdrop-blur-[16px] border-b border-ink/10">
        <div className="font-serif text-xl tracking-[-0.02em] flex items-center gap-2.5">
          <span className="relative w-2 h-2 rounded-full bg-moss">
            <span className="absolute inset-[-3px] rounded-full border border-moss animate-pulse-ring" />
          </span>
          Serein
        </div>
        <span className="font-mono text-[11px] tracking-[.12em] uppercase text-ink/50">
          {STEP_LABELS[step]}
        </span>
        {step > 1 ? (
          <button
            onClick={prevStep}
            className="text-sm text-ink/50 hover:text-ink transition-colors flex items-center gap-1"
          >
            ← Retour
          </button>
        ) : (
          <span className="w-16" />
        )}
      </header>

      {/* Screen */}
      <main className={`min-h-screen flex items-center justify-center flex-col pt-[100px] pb-24 px-6 ${BG_STYLES[step]}`}>
        <div className="relative z-10 w-full max-w-[540px] flex flex-col items-center text-center">
          <CurrentScreen />
        </div>
      </main>
    </>
  )
}
