'use client'
import { useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { useOnboardingStore } from '@/stores/onboarding'

function useCountUp(target: number, duration = 1200) {
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    if (!ref.current || target === 0) return
    let start = 0
    const step = target / (duration / 28)
    const timer = setInterval(() => {
      start = Math.min(start + step, target)
      if (ref.current) ref.current.textContent = `${Math.round(start)} € / an`
      if (start >= target) clearInterval(timer)
    }, 28)
    return () => clearInterval(timer)
  }, [target, duration])
  return ref
}

export function ScreenSimulation() {
  const { simulation, choiceLabel, nextStep } = useOnboardingStore()
  const annualRef = useCountUp(simulation?.annualLoss ?? 0)

  if (!simulation) return null

  const scanRows = [
    { label: 'Abonnements estimés', value: `${choiceLabel} abonnements` },
    { label: 'Dont probablement inutilisés', value: `${simulation.unused} abonnement${simulation.unused > 1 ? 's' : ''}`, badge: { text: `${simulation.unused} oublié${simulation.unused > 1 ? 's' : ''}`, color: 'red' } },
    { label: 'Coût moyen / abonnement oublié', value: '11,40 €/mois', muted: true },
    { label: 'Hausses non remarquées (est.)', value: `+${simulation.hikesCost} €/mois`, badge: { text: 'Invisible', color: 'amber' } },
  ]

  return (
    <div className="flex flex-col items-center w-full animate-fade-up">
      <p className="font-mono text-[11px] tracking-[.17em] uppercase text-moss mb-5 flex items-center gap-2.5">
        <span className="w-6 h-px bg-moss" />Votre estimation personnalisée<span className="w-6 h-px bg-moss" />
      </p>

      <h2 className="font-serif text-[clamp(22px,5vw,38px)] tracking-[-0.02em] leading-[1.25] text-ink mb-6 text-center">
        Ce que Serein trouve<br />en <em className="text-moss">3 minutes.</em>
      </h2>

      {/* Context */}
      <div className="w-full mb-4">
        <p className="font-mono text-[11px] tracking-[.13em] uppercase text-ink/50 mb-2 text-left">Basé sur votre réponse</p>
        <p className="text-sm text-ink/70 text-left">
          Vous avez indiqué environ <strong className="text-ink">{choiceLabel}</strong>. Voici l&apos;estimation Serein.
        </p>
      </div>

      {/* Scan card */}
      <div className="w-full bg-crimson-faint border border-crimson/20 rounded-2xl p-6 mb-4 relative overflow-hidden">
        <div className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-sage to-transparent animate-scan-line" />
        {scanRows.map(row => (
          <div key={row.label} className="flex justify-between items-center py-2.5 border-b border-ink/10 last:border-0">
            <span className="text-sm text-ink/70">{row.label}</span>
            <div className="flex items-center gap-2 font-mono text-[13.5px]">
              <span className={row.muted ? 'text-ink/70' : 'text-ink'}>{row.value}</span>
              {row.badge && (
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono uppercase tracking-wider
                  ${row.badge.color === 'red' ? 'bg-crimson/15 text-[#E87060]' : 'bg-amber/15 text-amber'}`}>
                  {row.badge.text}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Loss card */}
      <div className="w-full bg-surface border border-ink/10 rounded-2xl p-6 mb-6">
        <p className="font-mono text-[11px] tracking-[.13em] uppercase text-ink/50 mb-2 text-left">Vous perdez probablement</p>
        <p className="font-serif text-[clamp(54px,13vw,80px)] tracking-[-0.04em] leading-none text-amber text-left animate-count-up">
          <span ref={annualRef}>{simulation.annualLoss} € / an</span>
        </p>
        <p className="font-mono text-[13px] text-ink/50 tracking-wider mt-1.5 text-left">
          ≈ {simulation.monthlyLoss} € / mois · {simulation.annualLoss} € / an
        </p>
      </div>

      <div className="flex flex-col items-center gap-2.5 w-full">
        <Button onClick={nextStep}>Reprendre le contrôle →</Button>
        <Button variant="secondary" onClick={nextStep}>📄 Commencer avec un relevé PDF</Button>
      </div>
    </div>
  )
}
