'use client'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

const LINKS = [
  { href: '/dashboard',   label: 'Accueil' },
  { href: '/engagements', label: 'Engagements' },
  { href: '/analyse',     label: 'Analyse' },
  { href: '/rappels',     label: 'Rappels' },
  { href: '/resiliation', label: 'Lettre' },
]

export function SereinNav() {
  const pathname = usePathname()
  const [email, setEmail] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let sub: { unsubscribe: () => void } | undefined
    try {
      const supabase = createSupabaseBrowserClient()
      // Un vrai compte a un e-mail ; une session anonyme n'en a pas → on ignore.
      supabase.auth.getSession().then(({ data: { session } }) => {
        setEmail(session?.user?.email || null)
        setReady(true)
      })
      sub = supabase.auth.onAuthStateChange((_e, session) => {
        setEmail(session?.user?.email || null)
      }).data.subscription
    } catch {
      setReady(true) // env Supabase absente : nav sans état de connexion
    }
    return () => sub?.unsubscribe()
  }, [])

  const signOut = async () => {
    try {
      const supabase = createSupabaseBrowserClient()
      await supabase.auth.signOut()
    } catch { /* ignore */ }
    window.location.href = '/connexion'
  }

  return (
    <nav className="w-full max-w-[720px] mx-auto px-5 pt-6 flex items-center justify-center gap-2 flex-wrap">
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

      {ready && (email ? (
        <button data-testid="signout" onClick={signOut}
          className="font-mono text-[11px] tracking-[.13em] uppercase rounded-full px-4 py-2 text-ink/50 hover:text-crimson transition-colors"
          title={email}>
          Déconnexion
        </button>
      ) : (
        <a href="/connexion" data-testid="signin-link"
          className={cn(
            'font-mono text-[11px] tracking-[.13em] uppercase rounded-full px-4 py-2 transition-colors',
            pathname === '/connexion' ? 'bg-sage/15 text-moss border border-sage/25' : 'text-moss hover:text-ink'
          )}>
          Connexion
        </a>
      ))}
    </nav>
  )
}
