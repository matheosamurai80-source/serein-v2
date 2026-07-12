import { ApiError } from '@/lib/api/response'
import { requireUser } from './session'
import type {
  CreateCommitmentInput,
  UpdateCommitmentInput,
} from '@/lib/validation/commitments'

// Service `commitments` : le cœur du schéma v5. Même contrat que la Brique 1
// (session + RLS + .eq → NOT_FOUND). Toute la logique d'accès vit ici, aucune
// logique métier dans les routes.

const COLS =
  'id, name, provider, service_type, amount, frequency, status, importance, category_id, start_date, anniversary_date, commitment_end_date, next_due_date, cancellation_deadline, cancellation_notice_days, detected_automatically, notes, created_at, updated_at'

export async function listCommitments() {
  const { supabase } = await requireUser()
  const { data, error } = await supabase
    .from('commitments')
    .select(COLS)
    .order('created_at', { ascending: false })
  if (error) throw new ApiError('INTERNAL_ERROR', 'Lecture des engagements impossible.')
  return data ?? []
}

export async function createCommitment(input: CreateCommitmentInput) {
  const { supabase, userId } = await requireUser()
  const { data, error } = await supabase
    .from('commitments')
    .insert({ ...input, user_id: userId })
    .select(COLS)
    .single()
  if (error || !data) throw new ApiError('INTERNAL_ERROR', "Création de l'engagement impossible.")
  return data
}

export async function updateCommitment(id: string, patch: UpdateCommitmentInput) {
  const { supabase } = await requireUser()
  const { data, error } = await supabase
    .from('commitments')
    .update(patch)
    .eq('id', id)
    .select(COLS)
    .maybeSingle()
  if (error) throw new ApiError('INTERNAL_ERROR', "Mise à jour de l'engagement impossible.")
  if (!data) throw new ApiError('NOT_FOUND', 'Engagement introuvable.')
  return data
}

export async function deleteCommitment(id: string) {
  const { supabase } = await requireUser()
  const { data, error } = await supabase
    .from('commitments')
    .delete()
    .eq('id', id)
    .select('id')
    .maybeSingle()
  if (error) throw new ApiError('INTERNAL_ERROR', "Suppression de l'engagement impossible.")
  if (!data) throw new ApiError('NOT_FOUND', 'Engagement introuvable.')
}
