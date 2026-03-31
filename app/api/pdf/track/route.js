import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const PDF_LIMITS = { free: 0, starter: 3 } // pro/agency = unlimited (not in object)

export async function POST(request) {
  try {
    const { userId } = await request.json()
    if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 })

    const { data: profile } = await supabase.from('profiles').select('plan').eq('id', userId).single()
    const userPlan = profile?.plan || 'free'

    // Pro and Agency have unlimited PDFs
    if (userPlan === 'pro' || userPlan === 'agency') {
      return NextResponse.json({ ok: true, allowed: true, plan: userPlan })
    }

    const limit = PDF_LIMITS[userPlan] ?? 0
    if (limit === 0) {
      return NextResponse.json({
        allowed: false,
        plan: userPlan,
        error: 'Tu plan Free no incluye exportación de PDF. Actualiza a Starter o Pro para exportar reportes.',
      }, { status: 403 })
    }

    // Check monthly usage: date key = pdf-YYYY-MM
    const monthKey = `pdf-${new Date().toISOString().slice(0, 7)}`
    const { data: usageRow } = await supabase
      .from('ai_usage')
      .select('calls')
      .eq('user_id', userId)
      .eq('date', monthKey)
      .single()

    const used = usageRow?.calls || 0
    if (used >= limit) {
      return NextResponse.json({
        allowed: false,
        plan: userPlan,
        used,
        limit,
        error: `Límite mensual de PDF alcanzado (${limit}/mes en plan Starter). Se renueva el 1 del próximo mes.`,
      }, { status: 429 })
    }

    // Increment counter
    if (usageRow) {
      await supabase.from('ai_usage').update({ calls: used + 1 }).eq('user_id', userId).eq('date', monthKey)
    } else {
      await supabase.from('ai_usage').insert({ user_id: userId, date: monthKey, calls: 1 })
    }

    return NextResponse.json({ ok: true, allowed: true, plan: userPlan, used: used + 1, limit })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
