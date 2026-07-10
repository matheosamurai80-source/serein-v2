// ─── CLIENT DU SOCLE API ────────────────────────────────────────────────────
// Parle aux routes serveur durcies ({ ok:true, data } / { ok:false, error }).
// La session voyage par cookie (@supabase/ssr) : `credentials: same-origin`
// suffit à authentifier l'appel côté serveur (RLS sous la session utilisateur).

export class ApiClientError extends Error {
  code?: string
  constructor(message: string, code?: string) {
    super(message)
    this.name = 'ApiClientError'
    this.code = code
  }
}

/** Déballe l'enveloppe standard : renvoie `data` en succès, lève en erreur. Pur, testable. */
export function unwrap<T>(body: unknown): T {
  const b = body as { ok?: boolean; data?: T; error?: { code?: string; message?: string } } | null
  if (b && b.ok === true) return b.data as T
  const message = b?.error?.message ?? 'Erreur inattendue.'
  throw new ApiClientError(message, b?.error?.code)
}

/** Appel typé d'une route du socle. Lève une ApiClientError au message lisible. */
export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, { credentials: 'same-origin', ...init })
  let body: unknown
  try {
    body = await res.json()
  } catch {
    throw new ApiClientError('Réponse serveur illisible.')
  }
  return unwrap<T>(body)
}

const JSON_HEADERS = { 'Content-Type': 'application/json' } as const

export const apiGet = <T>(path: string) => apiRequest<T>(path)
export const apiPost = <T>(path: string, payload: unknown) =>
  apiRequest<T>(path, { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(payload) })
export const apiPatch = <T>(path: string, payload: unknown) =>
  apiRequest<T>(path, { method: 'PATCH', headers: JSON_HEADERS, body: JSON.stringify(payload) })
export const apiDelete = <T>(path: string) =>
  apiRequest<T>(path, { method: 'DELETE' })
