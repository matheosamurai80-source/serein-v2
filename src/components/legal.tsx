import Link from 'next/link'
import type { ReactNode } from 'react'

// Gabarit commun des pages légales (Serein + PanierMalin) : sobre, lisible,
// avec retour à l'accueil et navigation entre les trois documents.

export function LegalPage({ title, updated, children }: {
  title: string
  updated: string
  children: ReactNode
}) {
  return (
    <main className="min-h-screen max-w-[680px] mx-auto px-5 py-10 animate-fade-up">
      <Link href="/" className="font-mono text-[11px] tracking-[.13em] uppercase text-moss underline">← Accueil</Link>
      <h1 className="font-serif text-[clamp(26px,5vw,38px)] tracking-[-0.02em] leading-[1.15] text-ink mt-4 mb-1">{title}</h1>
      <p className="font-mono text-[11px] text-ink/45 tracking-wider mb-8">Dernière mise à jour : {updated}</p>
      <div className="flex flex-col gap-6 text-[14.5px] text-ink/80 leading-[1.7] [&_h2]:font-serif [&_h2]:text-[20px] [&_h2]:text-ink [&_h2]:mt-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-1.5 [&_a]:text-moss [&_a]:underline [&_strong]:text-ink">
        {children}
      </div>
      <p className="font-mono text-[11px] text-ink/45 tracking-wider mt-10 flex gap-4 flex-wrap">
        <a href="/positionnement" className="underline">Positionnement</a>
        <a href="/confidentialite" className="underline">Confidentialité</a>
        <a href="/cgu" className="underline">CGU</a>
        <a href="/mentions-legales" className="underline">Mentions légales</a>
      </p>
    </main>
  )
}

/** Pied de page légal commun (hub, connexion, compte). */
export function LegalFooter() {
  return (
    <p className="w-full font-mono text-[11px] text-ink/45 tracking-wider text-center mt-8 flex gap-4 justify-center flex-wrap">
      <a href="/positionnement" className="underline hover:text-moss">Positionnement</a>
      <a href="/confidentialite" className="underline hover:text-moss">Confidentialité</a>
      <a href="/cgu" className="underline hover:text-moss">CGU</a>
      <a href="/mentions-legales" className="underline hover:text-moss">Mentions légales</a>
    </p>
  )
}
