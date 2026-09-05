// ─── DOUBLE AUTHENTIFICATION (2FA / TOTP) — logique pure, testable sans réseau ─
// Serein sécurise l'accès au compte par un second facteur : une application
// d'authentification (Google Authenticator, Authy…) génère un code à 6 chiffres.
// Supabase fait la crypto TOTP côté serveur ; ce module ne contient QUE la
// logique décidable hors réseau (format du code, faut-il demander un code,
// état des facteurs, messages d'erreur en français).

export interface FactorLike {
  id: string
  status: 'verified' | 'unverified'
  factor_type?: string
}

/** Retire les espaces éventuels collés par le presse-papiers (« 123 456 »). */
export function normalizeTotpCode(raw: string): string {
  return (raw ?? '').replace(/\s+/g, '')
}

export interface CodeCheck { ok: boolean; error?: string }

/** Valide le code à 6 chiffres AVANT tout appel réseau. */
export function validateTotpCode(raw: string): CodeCheck {
  const c = normalizeTotpCode(raw)
  if (!c) return { ok: false, error: 'Entrez le code à 6 chiffres de votre application.' }
  if (!/^\d{6}$/.test(c)) return { ok: false, error: 'Le code doit comporter exactement 6 chiffres.' }
  return { ok: true }
}

export type MfaStep = 'challenge' | 'none'

/**
 * Faut-il demander un second facteur ? Vrai uniquement quand la session est
 * authentifiée par mot de passe (aal1) alors que le compte EXIGE un 2e facteur
 * (aal2). Un compte sans 2FA a nextLevel = aal1 → aucune étape supplémentaire.
 */
export function mfaStepFromAAL(aal: {
  currentLevel?: string | null
  nextLevel?: string | null
}): MfaStep {
  return aal?.currentLevel === 'aal1' && aal?.nextLevel === 'aal2' ? 'challenge' : 'none'
}

/** Id du facteur TOTP vérifié (2FA active), ou null. */
export function verifiedTotpId(factors: FactorLike[] | null | undefined): string | null {
  const f = (factors ?? []).find(x => x.status === 'verified')
  return f ? f.id : null
}

/** Facteurs TOTP commencés mais jamais confirmés — à nettoyer avant un nouvel essai. */
export function unverifiedTotpIds(factors: FactorLike[] | null | undefined): string[] {
  return (factors ?? []).filter(x => x.status === 'unverified').map(x => x.id)
}

/** La 2FA est-elle active sur le compte ? */
export function isMfaEnabled(factors: FactorLike[] | null | undefined): boolean {
  return verifiedTotpId(factors) !== null
}

/** Traduit les erreurs MFA de Supabase en français clair et actionnable. */
export function friendlyMfaError(message: string | undefined): string {
  const m = (message ?? '').toLowerCase()
  if (m.includes('invalid') && (m.includes('code') || m.includes('totp')))
    return 'Code incorrect ou expiré. Regardez le code affiché en ce moment par votre application, puis réessayez.'
  if (m.includes('expired'))
    return 'Ce code a expiré. Saisissez le nouveau code affiché par votre application.'
  if (m.includes('rate limit') || m.includes('too many'))
    return 'Trop de tentatives. Patientez une minute avant de réessayer.'
  if (m.includes('already') && m.includes('exist'))
    return 'Une activation était déjà en cours — nous l\'avons réinitialisée, réessayez.'
  if (m.includes('mfa') && m.includes('disabled'))
    return 'La double authentification n\'est pas activée côté Supabase (Authentication → réglages MFA).'
  if (m.includes('factor') && m.includes('not found'))
    return 'Facteur introuvable. Rechargez la page et recommencez l\'activation.'
  return message ? `Erreur : ${message}` : 'Vérification impossible. Réessayez.'
}
