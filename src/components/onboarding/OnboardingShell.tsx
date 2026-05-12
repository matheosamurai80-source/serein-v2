'use client'
import { useOnboardingStore } from '@/stores/onboarding'
import { ProgressBar } from '@/components/ui/progress'
import { ScreenLanding } from './ScreenLanding'
import { ScreenQuestion } from './ScreenQuestion'
import { ScreenSimulation } from './ScreenSimulation'
import { ScreenReassurance } from './ScreenReassurance'
import { ScreenConversion } from './ScreenConversion'
const SCREENS = { 1: ScreenLanding, 2: ScreenQuestion, 3: ScreenSimulation, 4: ScreenReassurance, 5: ScreenConversion } as const
const LABELS = { 1: 'Étape 1 / 5', 2: 'Étape 2 / 5', 3: 'Étape 3 / 5', 4: 'Étape 4 / 5', 5: 'Étape 5 / 5' } as const
const BG = { 1: 'bg-[#0A0B09]', 2: 'bg-[#111210]', 3: 'bg-[#0A0B09]', 4: 'bg-[#181916]', 5: 'bg-[#111210]' } as const
export function OnboardingShell() {
  const { step, prevStep } = useOnboardingStore()
  const CurrentScreen = SCREENS[step]
  return (<>
<ProgressBar value={((step-1)/4)*100} />
<header className="fixed top-0 left-0 right-0 z-[199] h-[60px] flex items-center justify-between px-6 bg-[#0A0B09]/90 backdrop-blur-[16px] border-b border-white/7">
  <div className="font-serif text-xl">Serein</div>
  <span className="font-mono text-xs text-white/38">{LABEMS[step]}</span>
  {step>1?_<button onClick={prevStep} className="text-sm text-white/38">← Retour</button>:<span className="w-16"/>}
</header>
<main className={`min-h-screen flex items-center justify-center pt-24 pb-16 px-6 ${BG[step]}`}>
<div className="w-full max-w-[540px]"><CurrentScreen /></div>
</main>
</>)
}
