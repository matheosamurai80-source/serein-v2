import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { OnboardingState, OnboardingStep, SubscriptionChoice, SubscriptionLabel, ConversionType } from '@/types'
import { SIM_TABLE } from '@/config'

interface OnboardingActions {
  setStep: (step: OnboardingStep) => void
  nextStep: () => void
  prevStep: () => void
  selectSubscriptions: (count: SubscriptionChoice, label: SubscriptionLabel) => void
  setEmail: (email: string) => void
  setLeadId: (id: string) => void
  setConversionType: (type: ConversionType) => void
  reset: () => void
}

const initialState: OnboardingState = {
  step: 1,
  estimatedSubscriptions: null,
  choiceLabel: null,
  simulation: null,
  leadId: null,
  email: '',
  conversionType: null,
}

export const useOnboardingStore = create<OnboardingState & OnboardingActions>()(
  devtools(
    (set, get) => ({
      ...initialState,

      setStep: (step) => set({ step }, false, 'setStep'),

      nextStep: () => {
        const { step } = get()
        if (step < 5) set({ step: (step + 1) as OnboardingStep }, false, 'nextStep')
      },

      prevStep: () => {
        const { step } = get()
        if (step > 1) set({ step: (step - 1) as OnboardingStep }, false, 'prevStep')
      },

      selectSubscriptions: (count, label) => {
        const sim = SIM_TABLE[count]
        set({
          estimatedSubscriptions: count,
          choiceLabel: label,
          simulation: {
            unused:      sim.unused,
            hikesCost:   sim.hikesCost,
            monthlyLoss: sim.monthlyLoss,
            annualLoss:  sim.annualLoss,
            label,
          },
        }, false, 'selectSubscriptions')
      },

      setEmail: (email) => set({ email }, false, 'setEmail'),

      setLeadId: (leadId) => set({ leadId }, false, 'setLeadId'),

      setConversionType: (conversionType) => set({ conversionType }, false, 'setConversionType'),

      reset: () => set(initialState, false, 'reset'),
    }),
    { name: 'serein-onboarding' }
  )
)
