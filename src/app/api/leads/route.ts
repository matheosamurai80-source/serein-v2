import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { CreateLeadSchema } from '@/lib/validation'
import { rateLimit } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'
import { RATE_LIMIT } from '@/config'
import type { ApiResponse, Lead } from '@/types'

const limiter = rateLimit(RATE_LIMIT.leads)

export async function POST(req: NextRequest): Promise<NextResponse<ApiResponse<{ id: string }>>> {
  // Rate limit
  const limited = limiter(req)
  if (limited) return limited as NextResponse<ApiResponse<{ id: string }>>

  try {
    const body: unknown = await req.json()
    const parsed = CreateLeadSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? 'Données invalides' },
        { status: 400 }
      )
    }

    const supabase = await createSupabaseServerClient()

    const { data, error } = await supabase
      .from('leads')
      .insert(parsed.data)
      .select('id')
      .single()

    if (error) {
      logger.error('Lead insert failed', new Error(error.message), { code: error.code })
      return NextResponse.json(
        { success: false, error: 'Erreur serveur. Réessayez.' },
        { status: 500 }
      )
    }

    const lead = data as Lead
    logger.info('Lead created', { id: lead.id, choice: parsed.data.choice })

    return NextResponse.json(
      { success: true, data: { id: lead.id } },
      { status: 201 }
    )
  } catch (err) {
    logger.error('Lead route error', err instanceof Error ? err : new Error(String(err)))
    return NextResponse.json(
      { success: false, error: 'Erreur inattendue.' },
      { status: 500 }
    )
  }
}
