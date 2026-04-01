import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const PLATFORM_LIMITS = { free: 1, starter: 3 }

export async function POST(request) {
  try {
    const { userId, accountId, accountName, isActive, accessToken } = await request.json()
    if (!userId || !accountId) {
      return NextResponse.json({ error: 'Missing userId or accountId' }, { status: 400 })
    }

    // Use service role key if available, otherwise fall back to anon key + user token
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

    let supabase
    if (serviceKey) {
      supabase = createClient(supabaseUrl, serviceKey)
    } else if (accessToken && anonKey) {
      // Use user's own session token — respects RLS (user can only write their own rows)
      supabase = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: `Bearer ${accessToken}` } },
      })
    } else {
      supabase = createClient(supabaseUrl, anonKey)
    }

    // Check plan limit before saving
    const { data: profile } = await supabase.from('profiles').select('plan').eq('id', userId).single()
    const userPlan = profile?.plan || 'free'
    const limit = PLATFORM_LIMITS[userPlan]
    if (limit !== undefined) {
      const rawId = accountId.replace(/^act_/i, '')
      const actId = `act_${rawId}`
      const { count } = await supabase
        .from('ad_accounts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .neq('account_id', actId)
      if (count >= limit) {
        return NextResponse.json({
          error: `Tu plan ${userPlan} permite máximo ${limit} plataforma${limit > 1 ? 's' : ''}. Actualiza tu plan para conectar más.`,
          limitReached: true,
        }, { status: 403 })
      }
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
