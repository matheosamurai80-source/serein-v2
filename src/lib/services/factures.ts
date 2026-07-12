import { ApiError } from '@/lib/api/response'
import { requireUser } from './session'
import type {
  CreateFactureInput,
  UpdateFactureInput,
} from '@/lib/validation/factures'

// Service `factures_ponctuelles` (eau, taxe, assurance annuelle…). Même contrat
// que le reste du socle : session + RLS + .eq → NOT_FOUND. Aucune logique dans
// les routes.

const COLS = 'id, name, amount, mode, start_date, interval_months, next_due_date, notice_days, status, created_at'

export async function listFactures() {
  const { supabase } = await requireUser()
  const { data, error } = await supabase
    .from('factures_ponctuelles')
    .select(COLS)
    .order('created_at', { ascending: false })
  if (error) throw new ApiError('INTERNAL_ERROR', 'Lecture des factures impossible.')
  return data ?? []
}

export async function createFacture(input: CreateFactureInput) {
  const { supabase, userId } = await requireUser()
  const { data, error } = await supabase
    .from('factures_ponctuelles')
    .insert({ ...input, user_id: userId })
    .select(COLS)
    .single()
  if (error || !data) throw new ApiError('INTERNAL_ERROR', 'Création de la facture impossible.')
  return data
}

export async function updateFacture(id: string, patch: UpdateFactureInput) {
  const { supabase } = await requireUser()
  const { data, error } = await supabase
    .from('factures_ponctuelles')
    .update(patch)
    .eq('id', id)
    .select(COLS)
    .maybeSingle()
  if (error) throw new ApiError('INTERNAL_ERROR', 'Mise à jour de la facture impossible.')
  if (!data) throw new ApiError('NOT_FOUND', 'Facture introuvable.')
  return data
}

export async function deleteFacture(id: string) {
  const { supabase } = await requireUser()
  const { data, error } = await supabase
    .from('factures_ponctuelles')
    .delete()
    .eq('id', id)
    .select('id')
    .maybeSingle()
  if (error) throw new ApiError('INTERNAL_ERROR', 'Suppression de la facture impossible.')
  if (!data) throw new ApiError('NOT_FOUND', 'Facture introuvable.')
}
