import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Este endpoint es llamado automáticamente cada día por Vercel Cron
// para evitar que Supabase pause el proyecto por inactividad (pausa a los 7 días)
export async function GET(request) {
  // Verificar que solo Vercel Cron puede llamar esto (seguridad básica)
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Query ligera — solo lee 1 fila para mantener la DB activa
    const { error } = await supabase
      .from('meta_tokens')
      .select('user_id')
      .limit(1)

    if (error) throw error

    console.log('[CRON] Supabase ping OK —', new Date().toISOString())
    return NextResponse.json({ ok: true, ts: new Date().toISOString() })
  } catch (err) {
    console.error('[CRON] Supabase ping FAILED:', err.message)
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }
}
