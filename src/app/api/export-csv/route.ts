import { NextResponse } from 'next/server'
import { createSupabaseAnonClient } from '@/lib/supabase/server'
import { buildExportCsv, type CommitmentExportRow, type UserServiceExportRow } from '@/lib/export/csv'

// ─── EXPORT CSV — PORTABILITÉ RGPD ──────────────────────────────────────────
// Lecture SEULE, aucune écriture, aucune table créée. Le client Supabase est
// construit avec la clé anon + les cookies de session : chaque SELECT passe
// sous l'identité de l'utilisateur connecté, donc le RLS (« user_id =
// auth.uid() ») ne renvoie QUE ses lignes. buildExportCsv refiltre par
// user_id en ceinture de sécurité.

export const dynamic = 'force-dynamic'

const COMMITMENT_COLS =
  'user_id, name, provider, service_type, amount, frequency, start_date, '
  + 'anniversary_date, commitment_end_date, next_due_date, cancellation_deadline, '
  + 'cancellation_notice_days, importance, status, detected_automatically, notes, created_at'
const SERVICE_COLS = 'user_id, service_key, status, activated_at, deactivated_at'

export async function GET() {
  const supabase = await createSupabaseAnonClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) {
    return NextResponse.json(
      { error: 'Connexion requise pour exporter vos données.' },
      { status: 401 }
    )
  }

  const [c, s] = await Promise.all([
    supabase.from('commitments').select(COMMITMENT_COLS),
    supabase.from('user_services').select(SERVICE_COLS),
  ])
  if (c.error || s.error) {
    return NextResponse.json(
      { error: 'Lecture des données impossible — réessayez dans un instant.' },
      { status: 500 }
    )
  }

  const csv = buildExportCsv({
    userId: session.user.id,
    commitments: c.data as unknown as CommitmentExportRow[],
    services: s.data as unknown as UserServiceExportRow[],
  })

  const jour = new Date().toISOString().slice(0, 10)
  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="serein-export-${jour}.csv"`,
      'Cache-Control': 'no-store',
    },
  })
}
