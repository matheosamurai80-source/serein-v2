import { createSupabaseBrowserClient } from './client'

// ─── SESSION ANONYME PARTAGÉE ───────────────────────────────────────────────
// Un vrai compte Supabase sans e-mail (convertible plus tard) : c'est ce qui
// satisfait les politiques RLS « user_id = auth.uid() » du schéma v5.

export async function ensureUserId(
  supabase: ReturnType<typeof createSupabaseBrowserClient>
): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession()
  if (session) return session.user.id
  const { data, error } = await supabase.auth.signInAnonymously()
  if (error || !data.user) {
    throw new Error(
      error?.message.toLowerCase().includes('anonymous')
        ? 'Connexions anonymes désactivées — activez-les dans Supabase → Authentication → Providers.'
        : `Connexion impossible : ${error?.message ?? 'erreur inconnue'}`
    )
  }
  return data.user.id
}
