import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
export async function createSupabaseServerClient() {
  const c = await cookies()
  return createServerClient(process.env['SUPABASE_URL']!, process.env['SUPABASE_SERVICE_ROLE_KEY']!, {
    cookies: { getAll() { return c.getAll() }, setAll(cs) { try { cs.forEach(({name,value,options}) => c.set(name,value,options)) } catch {} } }
  })
}
