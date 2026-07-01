import { NextRequest, NextResponse } from 'next/server'
const store = new Map<string, { count: number; resetAt: number }>()
export function rateLimit(opts: { requests: number; windowMs: number }) {
  return (req: NextRequest): NextResponse | null => {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
    const key = `${ip}:${req.nextUrl.pathname}`
    const now = Date.now(); const e = store.get(key)
    if (!e || now > e.resetAt) { store.set(key, { count: 1, resetAt: now + opts.windowMs }); return null }
    e.count++; if (e.count > opts.requests) return NextResponse.json({ success: false, error: 'Too many requests' }, { status: 429 })
    return null
  }
}
