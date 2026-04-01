import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://reporteador.vercel.app'

const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL
const ANON_KEY      = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const SERVICE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY

function makeSupabase(userToken) {
  // Prefer service role key (bypasses RLS, most reliable)
  // Fall back to user's own JWT (respects RLS, works without service key)
  const key = SERVICE_KEY || ANON_KEY
  const client = createClient(SUPABASE_URL, key)
  if (!SERVICE_KEY && userToken) {
    return createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${userToken}` } },
    })
  }
  return client
}

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const code     = searchParams.get('code')
  const error    = searchParams.get('error')
  const stateRaw = searchParams.get('state') || ''

  if (error || !code) {
    return NextResponse.redirect(`${APP_URL}/dashboard?error=meta_denied`)
  }

  let userId   = null
  let returnTo = '/dashboard/meta-ads'
  let sbToken  = null
  try {
    const parsed = JSON.parse(atob(stateRaw))
    userId   = parsed.uid
    sbToken  = parsed.sbToken || null
    if (parsed.returnTo) returnTo = parsed.returnTo
  } catch (e) {}

  if (!userId) {
    return NextResponse.redirect(`${APP_URL}/dashboard?error=meta_no_user`)
  }

  const supabase = makeSupabase(sbToken)

  try {
    // 1. Exchange code for access token
    const tokenRes = await fetch(
      'https://graph.facebook.com/v21.0/oauth/access_token?' +
        new URLSearchParams({
          client_id:     process.env.META_APP_ID,
          client_secret: process.env.META_APP_SECRET,
          redirect_uri:  `${APP_URL}/api/auth/callback/meta`,
          code,
        })
    )
    const tokenData = await tokenRes.json()

    if (tokenData.error || !tokenData.access_token) {
      console.error('Meta token exchange error:', tokenData.error)
      throw new Error(tokenData.error?.message || 'Token exchange failed')
    }

    const accessToken = tokenData.access_token

    // 2. Save token to meta_tokens
    const { error: tokenErr } = await supabase
      .from('meta_tokens')
      .upsert(
        { user_id: userId, access_token: accessToken, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      )
    if (tokenErr) console.error('meta_tokens upsert error:', tokenErr.message)

    // 3. Fetch Meta Ads accounts — múltiples métodos para máxima cobertura
    let adAccountsList = []

    const [directRes, bizRes, pagesRes] = await Promise.all([
      fetch(`https://graph.facebook.com/v21.0/me/adaccounts?fields=id,name,account_status,currency&access_token=${accessToken}&limit=50`),
      fetch(`https://graph.facebook.com/v21.0/me/businesses?fields=id,name,owned_ad_accounts{id,name,account_status,currency},client_ad_accounts{id,name,account_status,currency}&access_token=${accessToken}&limit=20`),
      fetch(`https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token&access_token=${accessToken}&limit=20`),
    ])
    const directData = await directRes.json()
    const bizData    = await bizRes.json()
    const pagesData  = await pagesRes.json()

    console.log('[meta callback] directData accounts:', directData.data?.length ?? 0, directData.error?.message)
    console.log('[meta callback] bizData businesses:', bizData.data?.length ?? 0, bizData.error?.message)

    if (directData.data?.length > 0) {
      adAccountsList.push(...directData.data)
    }

    if (bizData.data?.length > 0) {
      for (const biz of bizData.data) {
        if (biz.owned_ad_accounts?.data?.length > 0)  adAccountsList.push(...biz.owned_ad_accounts.data)
        if (biz.client_ad_accounts?.data?.length > 0) adAccountsList.push(...biz.client_ad_accounts.data)
      }
    }

    if (pagesData.data?.length > 0 && adAccountsList.length === 0) {
      const pageAdFetches = await Promise.all(
        (pagesData.data || []).slice(0, 5).map(page =>
          page.access_token
            ? fetch(`https://graph.facebook.com/v21.0/me/adaccounts?fields=id,name,account_status,currency&access_token=${page.access_token}&limit=25`)
                .then(r => r.json()).catch(() => null)
            : Promise.resolve(null)
        )
      )
      for (const res of pageAdFetches) {
        if (res?.data?.length > 0) adAccountsList.push(...res.data)
      }
    }

    // Deduplicar
    const seen = new Set()
    adAccountsList = adAccountsList.filter(a => {
      const id = a.id.replace('act_', '')
      if (seen.has(id)) return false
      seen.add(id)
      return true
    })

    console.log('[meta callback] total ad accounts found:', adAccountsList.length)

    if (adAccountsList.length > 0) {
      for (const account of adAccountsList) {
        const rawId = account.id.replace('act_', '')
        const { error: accErr } = await supabase.from('ad_accounts').upsert(
          {
            user_id:      userId,
            account_id:   `act_${rawId}`,
            account_name: account.name || `Meta Ads ${rawId}`,
            platform:     'meta_ads',
            is_active:    account.account_status === 1,
          },
          { onConflict: 'user_id,account_id' }
        )
        if (accErr) console.error('ad_accounts upsert error:', accErr.message)
      }
    }

    return NextResponse.redirect(`${APP_URL}${returnTo}?success=meta_connected`)
  } catch (err) {
    console.error('Meta OAuth callback error:', err)
    return NextResponse.redirect(`${APP_URL}/dashboard?error=meta_oauth_error`)
  }
}
