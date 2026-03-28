import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Usa service role key para evitar restricciones de RLS en ad_accounts
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  try {
    const { userId, accountId, accountName, isActive } = await request.json()
    if (!userId || !accountId) {
      return NextResponse.json({ error: 'Missing userId or accountId' }, { status: 400 })
    }

    const rawId = accountId.replace(/^act_/i, '')
    const actId = `act_${rawId}`

    const { error } = await supabase.from('ad_accounts').upsert(
      {
        user_id: userId,
        account_id: actId,
        account_name: accountName || actId,
        platform: 'meta_ads',
        is_active: isActive !== false,
      },
      { onConflict: 'user_id,account_id' }
    )

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, accountId: actId })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
