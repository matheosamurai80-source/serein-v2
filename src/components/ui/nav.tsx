'use client'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const LINKS = [
  { href: '/engagements', label: 'Engagements' },
  { href: '/rappels',     label: 'Rappels' },
  { href: '/resiliation', label: 'Lettre' },
]

export function SereinNav() {
  const pathname = usePathname()
  return (
    <nav className="w-full max-w-[640px] mx-auto px-5 pt-6 flex items-center justify-center gap-2">
      {LINKS.map(l => {
        const active = pathname === l.href
        return (
          <a key={l.href} href={l.href}
            className={cn(
              'font-mono text-[11px] tracking-[.13em] uppercase rounded-full px-4 py-2 transition-colors',
              active ? 'bg-sage/15 text-moss border border-sage/25' : 'text-ink/50 hover:text-ink/70'
            )}>
            {l.label}
          </a>
        )
      })}
    </nav>
  )
}
