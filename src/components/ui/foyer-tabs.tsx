'use client'
import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { foyerRoutes } from '@/lib/foyer/logic'

// La navigation verrouillée : 3 onglets, jamais plus. Accueil (À faire) · +
// (ajouter un document) · Mon foyer (la bibliothèque des services). Un service
// ne crée jamais d'onglet — il devient une carte dans Mon foyer.
// Barre BASSE fixe (feeling d'appli) ; le « + » central est mis en avant.

const FOYER = foyerRoutes()

export function FoyerTabs() {
  const pathname = usePathname()
  const accueil = pathname === '/accueil'
  const foyer = FOYER.some(r => pathname === r) && pathname !== '/ajouter'
  const plus = pathname === '/ajouter'

  // Réserve l'espace en bas de page pour que la barre ne masque rien.
  useEffect(() => {
    document.body.classList.add('has-foyer-tabs')
    return () => document.body.classList.remove('has-foyer-tabs')
  }, [])

  const tab = (active: boolean) => cn(
    'flex flex-col items-center justify-center gap-0.5 rounded-2xl px-6 py-1.5 transition-colors min-w-[90px]',
    active ? 'text-moss' : 'text-ink/45 hover:text-ink/70'
  )

  return (
    <nav aria-label="Navigation principale"
      className="fixed bottom-0 inset-x-0 z-40 border-t border-ink/10 bg-cream/95 backdrop-blur-sm pb-[env(safe-area-inset-bottom)]">
      <div className="max-w-[420px] mx-auto px-5 py-2 flex items-end justify-between gap-2">
        <a href="/accueil" data-testid="tab-accueil" className={tab(accueil)}>
          <span className="text-[19px] leading-none">🏠</span>
          <span className="font-mono text-[10px] tracking-[.12em] uppercase">Accueil</span>
        </a>

        {/* Le « + » : porte d'entrée unique, mise en avant */}
        <a href="/ajouter" data-testid="tab-ajouter" aria-label="Ajouter un document"
          className={cn(
            'flex items-center justify-center w-[56px] h-[56px] rounded-full text-cream text-[27px] leading-none shadow-[0_6px_18px_rgba(85,122,89,.4)] -mt-6 transition-transform hover:-translate-y-0.5',
            plus ? 'bg-sage-light' : 'bg-sage'
          )}>
          ＋
        </a>

        <a href="/foyer" data-testid="tab-foyer" className={tab(foyer)}>
          <span className="text-[19px] leading-none">🏡</span>
          <span className="font-mono text-[10px] tracking-[.12em] uppercase">Mon foyer</span>
        </a>
      </div>
    </nav>
  )
}
