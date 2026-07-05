import { createBrowserClient } from '@supabase/ssr'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config'

// Client navigateur — clé anon uniquement (publique par conception), jamais
// la clé service_role. Config en dur : voir config.ts pour la raison.
export function createSupabaseBrowserClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY)
}
