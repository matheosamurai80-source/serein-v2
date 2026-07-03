import type { LegalRegime, RegimeResult } from './legal'

// ─── SAUVEGARDE DES LETTRES — table cancellation_letters (schéma v5) ────────
// Contrat vérifié en base le 2026-07-02 :
//   user_id NOT NULL → profiles.id (créé par le trigger on_auth_user_created)
//   letter_type CHECK ('standard'|'chatel'|'hamon'|'negotiation')
//   content NOT NULL · commitment_id optionnel
//   RLS : user_id = auth.uid()

export type LetterType = 'standard' | 'chatel' | 'hamon' | 'negotiation'

export interface CancellationLetterRow {
  user_id: string
  letter_type: LetterType
  content: string
  commitment_id?: string
}

/** Fait correspondre nos 6 régimes légaux aux 4 types du schéma v5. */
export function mapRegimeToLetterType(regime: LegalRegime): LetterType {
  switch (regime) {
    case 'hamon':
      return 'hamon'
    case 'chatel_assurance':
    case 'chatel_conso':
      return 'chatel'
    default:
      return 'standard'
  }
}

/**
 * Construit la ligne à insérer, ou lève une erreur claire si les invariants
 * du schéma ne sont pas respectés (mieux qu'un échec SQL opaque).
 */
export function buildLetterRow(params: {
  userId: string
  regime: RegimeResult
  content: string
  commitmentId?: string
}): CancellationLetterRow {
  const { userId, regime, content, commitmentId } = params
  if (!userId) throw new Error('user_id manquant : connexion requise avant sauvegarde.')
  if (!content || content.trim().length < 50)
    throw new Error('Contenu de lettre vide ou trop court pour être sauvegardé.')
  return {
    user_id: userId,
    letter_type: mapRegimeToLetterType(regime.regime),
    content: content.trim(),
    ...(commitmentId ? { commitment_id: commitmentId } : {}),
  }
}
