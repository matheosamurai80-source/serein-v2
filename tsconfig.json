import { NextRequest, NextResponse } from 'next/server'

const store = new Map<string, { count: number; resetAt: number }>()

export function rateLimit(options: { requests: number; windowMs: number }) {
  return function check(req: NextRequest): NextResponse | null {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      ?? req.headers.get('x-real-ip')
      ?? 'unknown'

    const key = `${ip}:${req.nextUrl.pathname}`
    const now = Date.now()
    const entry = store.get(key)

    if (!entry || now > entry.resetAt) {
      store.set(key, { count: 1, resetAt: now + options.windowMs })
      return null // OK
    }

    entry.count++
    if (entry.count > options.requests) {
      return NextResponse.json(
        { success: false, error: 'Trop de requêtes. Réessayez dans un instant.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil((entry.resetAt - now) / 1000)),
            'X-RateLimit-Limit': String(options.requests),
            'X-RateLimit-Remaining': '0',
          },
        }
      )
    }

    return null // OK
  }
}
