import { ApiError } from '@/lib/api/response'
import { requireUser } from './session'
import type {
  CreateReminderInput,
  UpdateReminderInput,
} from '@/lib/validation/reminders'

// Service `reminders` : même contrat que subscriptions. La session et la
// propriété (via RLS + .eq) sont vérifiées ici ; la route reste dépourvue de
// logique métier.

const COLS =
  'id, commitment_id, facture_id, kind, scheduled_for, channel, message, status, sent_at, created_at'

export async function listReminders() {
  const { supabase } = await requireUser()
  const { data, error } = await supabase
    .from('reminders')
    .select(COLS)
    .order('scheduled_for', { ascending: true })
  if (error) throw new ApiError('INTERNAL_ERROR', 'Lecture des rappels impossible.')
  return data ?? []
}

export async function createReminder(input: CreateReminderInput) {
  const { supabase, userId } = await requireUser()
  const { data, error } = await supabase
    .from('reminders')
    .insert({ ...input, user_id: userId })
    .select(COLS)
    .single()
  if (error || !data) throw new ApiError('INTERNAL_ERROR', 'Création du rappel impossible.')
  return data
}

export async function updateReminder(id: string, patch: UpdateReminderInput) {
  const { supabase } = await requireUser()
  const { data, error } = await supabase
    .from('reminders')
    .update(patch)
    .eq('id', id)
    .select(COLS)
    .maybeSingle()
  if (error) throw new ApiError('INTERNAL_ERROR', 'Mise à jour du rappel impossible.')
  if (!data) throw new ApiError('NOT_FOUND', 'Rappel introuvable.')
  return data
}

export async function deleteReminder(id: string) {
  const { supabase } = await requireUser()
  const { data, error } = await supabase
    .from('reminders')
    .delete()
    .eq('id', id)
    .select('id')
    .maybeSingle()
  if (error) throw new ApiError('INTERNAL_ERROR', 'Suppression du rappel impossible.')
  if (!data) throw new ApiError('NOT_FOUND', 'Rappel introuvable.')
}
