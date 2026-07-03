// ─── AUTH — logique pure (testable sans réseau) ────────────────────────────
// Validation des identifiants + traduction des erreurs Supabase en français.

export interface CredCheck {
  ok: boolean
  error?: string
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

/** Valide e-mail + mot de passe avant tout appel réseau. */
export function validateCredentials(email: string, password: string): CredCheck {
  const e = email.trim()
  if (!e) return { ok: false, error: 'Entrez votre adresse e-mail.' }
  if (!EMAIL_RE.test(e)) return { ok: false, error: 'Adresse e-mail invalide.' }
  if (!password) return { ok: false, error: 'Entrez un mot de passe.' }
  if (password.length < 8) return { ok: false, error: 'Le mot de passe doit faire au moins 8 caractères.' }
  return { ok: true }
}

/** Traduit les messages d'erreur Supabase Auth en français clair et actionnable. */
export function friendlyAuthError(message: string | undefined): string {
  const m = (message ?? '').toLowerCase()
  if (m.includes('invalid login credentials'))
    return 'E-mail ou mot de passe incorrect.'
  if (m.includes('email not confirmed'))
    return 'Vérifiez votre boîte mail pour confirmer votre compte, puis reconnectez-vous.'
  if (m.includes('user already registered') || m.includes('already been registered'))
    return 'Un compte existe déjà avec cet e-mail. Connectez-vous plutôt.'
  if (m.includes('password should be at least'))
    return 'Le mot de passe est trop court (8 caractères minimum).'
  if (m.includes('signups not allowed') || m.includes('signup is disabled'))
    return 'Les inscriptions sont désactivées côté Supabase (Authentication → Providers → Email).'
  if (m.includes('email rate limit') || m.includes('rate limit'))
    return 'Trop de tentatives. Réessayez dans quelques minutes.'
  if (m.includes('anonymous sign-ins are disabled'))
    return 'Connexions anonymes désactivées — créez plutôt un compte.'
  return message ? `Erreur : ${message}` : 'Une erreur est survenue. Réessayez.'
}
