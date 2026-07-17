'use client'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { foyerRoutes } from '@/lib/foyer/logic'

// La navigation verrouillée : 3 onglets, jamais plus. Accueil (À faire) · +
// (ajouter un document) · Mon foyer (la bibliothèque des services). Un service
// ne crée jamais d'onglet — il devient une carte dans Mon foyer.

const FOYER = foyerRoutes()

export function FoyerTabs() {
  const pathname = usePathname()
  const accueil = pathname === '/dashboard'
  const foyer = FOYER.some(r => pathname === r) && pathname !== '/ajouter'
  const plus = pathname === '/ajouter'

  const tab = (active: boolean) => cn(
    'flex flex-col items-center justify-center gap-1 rounded-2xl px-6 py-2 transition-colors min-w-[92px]',
    active ? 'bg-sage/15 text-moss' : 'text-ink/45 hover:text-ink/70'
  )

  return (
    <nav className="w-full max-w-[420px] mx-auto px-5 pt-6 flex items-end justify-center gap-2">
      <a href="/dashboard" data-testid="tab-accueil" className={tab(accueil)}>
        <span className="text-[19px] leading-none">🏠</span>
        <span className="font-mono text-[10.5px] tracking-[.12em] uppercase">Accueil</span>
      </a>

      {/* Le « + » : porte d'entrée unique, mise en avant */}
      <a href="/ajouter" data-testid="tab-ajouter" aria-label="Ajouter un document"
        className={cn(
          'flex items-center justify-center w-[54px] h-[54px] rounded-full text-cream text-[26px] leading-none shadow-[0_8px_20px_rgba(85,122,89,.32)] -mb-1 transition-transform hover:-translate-y-0.5',
          plus ? 'bg-sage-light' : 'bg-sage'
        )}>
        ＋
      </a>

      <a href="/foyer" data-testid="tab-foyer" className={tab(foyer)}>
        <span className="text-[19px] leading-none">🏡</span>
        <span className="font-mono text-[10.5px] tracking-[.12em] uppercase">Mon foyer</span>
      </a>
    </nav>
  )
}
