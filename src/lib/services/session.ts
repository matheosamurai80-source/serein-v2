import type { SupabaseClient } from '@supabase/supabase-js'
import { createSupabaseAnonClient } from '@/lib/supabase/server'
import { ApiError } from '@/lib/api/response'

// « Aucune route ne fait confiance au frontend. »
// Le client anon + cookies applique la RLS (user_id = auth.uid()) : toute
// requête est donc automatiquement bornée à l'utilisateur connecté. On vérifie
// en plus explicitement la session pour renvoyer un 401 clair.

export interface Session {
  supabase: SupabaseClient
  userId: string
}

/** Récupère la session serveur ou lève UNAUTHORIZED. */
export async function requireUser(): Promise<Session> {
  const supabase = await createSupabaseAnonClient()
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) {
    throw new ApiError('UNAUTHORIZED', 'Authentification requise.')
  }
  return { supabase, userId: data.user.id }
}
