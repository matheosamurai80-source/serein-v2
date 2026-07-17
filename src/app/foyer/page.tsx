'use client'
import { FoyerTabs } from '@/components/ui/foyer-tabs'
import { BanqueSelect } from '@/components/banque-select'
import { foyerSections } from '@/lib/foyer/logic'

// Mon foyer : la bibliothèque. Tout ce que Serein gère pour toi, groupé par
// famille. On ne vient ici que si besoin — l'essentiel remonte tout seul sur
// l'Accueil « À faire ».

export default function FoyerPage() {
  const sections = foyerSections()
  return (
    <>
      <FoyerTabs />
      <main className="min-h-screen max-w-[640px] mx-auto px-5 py-8 animate-fade-up">
        <p className="font-mono text-[11px] tracking-[.17em] uppercase text-moss mb-5 flex items-center gap-2.5 justify-center">
          <span className="w-6 h-px bg-moss" />Mon foyer<span className="w-6 h-px bg-moss" />
        </p>
        <h1 className="font-serif text-[clamp(24px,5vw,38px)] tracking-[-0.025em] leading-[1.15] text-ink mb-8 text-center">
          Tout ce que Serein <em className="text-moss">garde pour toi.</em>
        </h1>

        <div className="flex flex-col gap-7">
          {sections.map(section => (
            <section key={section.title}>
              <h2 className="font-mono text-[11px] tracking-[.13em] uppercase text-ink/50 mb-3">{section.title}</h2>
              <div className="flex flex-col gap-2.5">
                {section.links.map(l => (
                  <a key={l.href} href={l.href} data-testid="foyer-link"
                    className="flex items-start gap-3.5 bg-surface border border-ink/10 rounded-2xl p-4 hover:border-sage/50 transition-colors">
                    <span className="text-[22px] leading-none mt-0.5">{l.icon}</span>
                    <span className="flex-1 min-w-0">
                      <span className="block font-semibold text-ink text-sm">{l.label}</span>
                      <span className="block text-xs text-ink/50 leading-[1.5] mt-0.5">{l.desc}</span>
                    </span>
                    <span className="text-ink/30 mt-1">→</span>
                  </a>
                ))}
              </div>
            </section>
          ))}

          <section>
            <h2 className="font-mono text-[11px] tracking-[.13em] uppercase text-ink/50 mb-3">Accès rapide</h2>
            <BanqueSelect />
          </section>
        </div>
      </main>
    </>
  )
}
