import { ApiError } from '@/lib/api/response'
import { requireUser } from './session'
import type {
  CreateSubscriptionInput,
  UpdateSubscriptionInput,
} from '@/lib/validation/subscriptions'

// Service `subscriptions` : toute la logique d'accès aux données vit ici, les
// routes ne font qu'orchestrer (validation → service → réponse). La session et
// la propriété des lignes sont vérifiées ici, jamais dans la route.

const COLS =
  'id, name, amount, frequency, status, category_id, next_charge_on, source, occurrences, last_seen, confidence, dormant, detected_automatically, created_at, updated_at'

export async function listSubscriptions() {
  const { supabase } = await requireUser()
  const { data, error } = await supabase
    .from('subscriptions')
    .select(COLS)
    .order('created_at', { ascending: false })
  if (error) throw new ApiError('INTERNAL_ERROR', 'Lecture des abonnements impossible.')
  return data ?? []
}

export async function createSubscription(input: CreateSubscriptionInput) {
  const { supabase, userId } = await requireUser()
  const { data, error } = await supabase
    .from('subscriptions')
    .insert({ ...input, user_id: userId })
    .select(COLS)
    .single()
  if (error || !data) throw new ApiError('INTERNAL_ERROR', "Création de l'abonnement impossible.")
  return data
}

export async function updateSubscription(id: string, patch: UpdateSubscriptionInput) {
  const { supabase } = await requireUser()
  // .eq('id') sous RLS : ne touche que les lignes de l'utilisateur. Aucune ligne
  // renvoyée = introuvable (ou non possédée) → NOT_FOUND.
  const { data, error } = await supabase
    .from('subscriptions')
    .update(patch)
    .eq('id', id)
    .select(COLS)
    .maybeSingle()
  if (error) throw new ApiError('INTERNAL_ERROR', "Mise à jour de l'abonnement impossible.")
  if (!data) throw new ApiError('NOT_FOUND', 'Abonnement introuvable.')
  return data
}

export async function deleteSubscription(id: string) {
  const { supabase } = await requireUser()
  const { data, error } = await supabase
    .from('subscriptions')
    .delete()
    .eq('id', id)
    .select('id')
    .maybeSingle()
  if (error) throw new ApiError('INTERNAL_ERROR', "Suppression de l'abonnement impossible.")
  if (!data) throw new ApiError('NOT_FOUND', 'Abonnement introuvable.')
}
