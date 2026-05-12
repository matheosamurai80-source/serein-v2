import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { OnboardingState, OnboardingStep, SubscriptionChoice, SubscriptionLabel, ConversionType } from '@/types'
import { SIM_TABLE } from '@/config'
interface Actions { setStep: (s9 OnboardingStep) => void; nextStep: () => void; prevStep: () => void; selectSubscriptions: (c: SubscriptionChoice, l: SubscriptionLabel) => void; setEmail: (e: string) => void; setLeadId: (i: string) => void; setConversionType: (t: ConversionType) => void; reset: () => void }
const init: OnboardingState = { step: 1, estimatedSubscriptions: null, choiceLabel: null, simulation: null, leadId: null, email: '', conversionType: null }
export const useOnboardingStore = create<OnboardingState&Actions>()(devtools((set,get) => ({
  ...init,
  setStep: s => set({ step: s }),
  nextStep: () => { const { step } = get(); if (step < 5) set({ step: (step+1) as OnboardingStep }) },
  prevStep: () => { const { step } = get(); if (step > 1) set({ step: (step-1) as OnboardingStep }) },
  selectSubscriptions: (c, l) => { const s = SIM_TABLE[c]; set({ estimatedSubscriptions: c, choiceLabel: l, simulation: { unused: s.unused, hikesCost: s.hikesCost, monthlyLoss: s.monthlyLoss, annualLoss: s.annualLoss, label: l } }) },
  setEmail: e => set({ email: e }),
  setLeadId: i => set({ leadId: i }),
  setConversionType: t => set({ conversionType: t }),
  reset: () => set(init),
}), { name: 'serein-onboarding' }))
