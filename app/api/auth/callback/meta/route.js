import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://reporteador.vercel.app'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const stateRaw = searchParams.get('state') || ''

  if (error || !code) {
    return NextResponse.redirect(`${APP_URL}/dashboard?error=meta_denied`)
  }

  // Decode user ID and optional returnTo from state (set by client before OAuth redirect)
  let userId = null
  let returnTo = '/dashboard/meta-ads'
  try {
    const parsed = JSON.parse(atob(stateRaw))
    userId = parsed.uid
    if (parsed.returnTo) returnTo = parsed.returnTo
  } catch (e) {}

  if (!userId) {
    return NextResponse.redirect(`${APP_URL}/dashboard?error=meta_no_user`)
  }

  try {
    // 1. Exchange code for access token
    const tokenRes = await fetch(
      'https://graph.facebook.com/v21.0/oauth/access_token?' +
        new URLSearchParams({
          client_id: process.env.META_APP_ID,
          client_secret: process.env.META_APP_SECRET,
          redirect_uri: `${APP_URL}/api/auth/callback/meta`,
          code,
        })
    )
    const tokenData = await tokenRes.json()

    if (tokenData.error || !tokenData.access_token) {
      console.error('Meta token exchange error:', tokenData.error)
      throw new Error(tokenData.error?.message || 'Token exchange failed')
    }

    const accessToken = tokenData.access_token

    // 2. Save token to meta_tokens (used for organic pages + IG)
    await supabase
      .from('meta_tokens')
      .upsert(
        { user_id: userId, access_token: accessToken, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      )

    // 3. Fetch Meta Ads accounts — intenta directamente Y vía Business Manager
    let adAccountsList = []

    const [directRes, bizRes] = await Promise.all([
      fetch(`https://graph.facebook.com/v21.0/me/adaccounts?fields=id,name,account_status,currency&access_token=${accessToken}&limit=25`),
      fetch(`https://graph.facebook.com/v21.0/me/businesses?fields=id,name,owned_ad_accounts{id,name,account_status,currency}&access_token=${accessToken}&limit=10`),
    ])
    const directData = await directRes.json()
    const bizData = await bizRes.json()

    // Cuentas directas del usuario
    if (directData.data?.length > 0) {
      adAccountsList.push(...directData.data)
    }

    // Cuentas via Business Manager
    if (bizData.data?.length > 0) {
      for (const biz of bizData.data) {
        if (biz.owned_ad_accounts?.data?.length > 0) {
          adAccountsList.push(...biz.owned_ad_accounts.data)
        }
      }
    }

    // Deduplicar por ID
    const seen = new Set()
    adAccountsList = adAccountsList.filter(a => {
      const id = a.id.replace('act_', '')
      if (seen.has(id)) return false
      seen.add(id)
      return true
    })

    if (adAccountsList.length > 0) {
      for (const account of adAccountsList) {
        const rawId = account.id.replace('act_', '')
        await supabase.from('ad_accounts').upsert(
          {
            user_id: userId,
            account_id: `act_${rawId}`,
            account_name: account.name || `Meta Ads ${rawId}`,
            platform: 'meta_ads',
            is_active: account.account_status === 1,
          },
          { onConflict: 'user_id,account_id' }
        )
      }
    }

    return NextResponse.redirect(`${APP_URL}${returnTo}?success=meta_connected`)
  } catch (err) {
    console.error('Meta OAuth callback error:', err)
    return NextResponse.redirect(`${APP_URL}/dashboard?error=meta_oauth_error`)
  }
}
