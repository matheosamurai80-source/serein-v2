import { NextResponse } from 'next/server'

// ─── SOCLE API — RÉPONSE STANDARD ───────────────────────────────────────────
// Toutes les routes répondent au même format :
//   succès → { ok: true, data }
//   erreur → { ok: false, error: { code, message, details? } }
// « Aucune route ne fait confiance au frontend » : l'auth et la propriété
// sont vérifiées côté serveur, la validation passe par Zod.

export type ApiErrorCode =
  | 'UNAUTHORIZED'
  | 'EMAIL_NOT_VERIFIED'
  | 'FORBIDDEN'
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'RATE_LIMITED'
  | 'PREMIUM_REQUIRED'
  | 'AI_PROVIDER_ERROR'
  | 'STORAGE_ERROR'
  | 'INTERNAL_ERROR'

const STATUS: Record<ApiErrorCode, number> = {
  UNAUTHORIZED: 401,
  EMAIL_NOT_VERIFIED: 403,
  FORBIDDEN: 403,
  VALIDATION_ERROR: 422,
  NOT_FOUND: 404,
  RATE_LIMITED: 429,
  PREMIUM_REQUIRED: 402,
  AI_PROVIDER_ERROR: 502,
  STORAGE_ERROR: 502,
  INTERNAL_ERROR: 500,
}

export interface ApiSuccess<T> { ok: true; data: T }
export interface ApiFailure {
  ok: false
  error: { code: ApiErrorCode; message: string; details?: unknown }
}

/** Erreur transportant un code standard — levée par les services, mappée par les routes. */
export class ApiError extends Error {
  readonly code: ApiErrorCode
  readonly details?: unknown
  constructor(code: ApiErrorCode, message: string, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.details = details
  }
}

export function httpStatusFor(code: ApiErrorCode): number {
  return STATUS[code] ?? 500
}

/** Réponse de succès (200 par défaut, 201 pour une création). */
export function ok<T>(data: T, status = 200): NextResponse<ApiSuccess<T>> {
  return NextResponse.json({ ok: true, data }, { status })
}

/** Réponse d'erreur au format standard, statut HTTP déduit du code. */
export function err(code: ApiErrorCode, message: string, details?: unknown): NextResponse<ApiFailure> {
  return NextResponse.json(
    { ok: false, error: { code, message, ...(details === undefined ? {} : { details }) } },
    { status: httpStatusFor(code) }
  )
}

/**
 * Enveloppe un handler : les ApiError deviennent des réponses standard,
 * toute autre exception devient INTERNAL_ERROR (jamais de fuite de détail).
 */
export async function handle(fn: () => Promise<NextResponse>): Promise<NextResponse> {
  try {
    return await fn()
  } catch (e) {
    if (e instanceof ApiError) return err(e.code, e.message, e.details)
    return err('INTERNAL_ERROR', 'Une erreur interne est survenue.')
  }
}
