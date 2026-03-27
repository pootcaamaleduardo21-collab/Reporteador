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

  // Decode user ID from state (set by client before OAuth redirect)
  let userId = null
  try {
    const parsed = JSON.parse(atob(stateRaw))
    userId = parsed.uid
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

    // 3. Fetch Meta Ads accounts
    const adsRes = await fetch(
      `https://graph.facebook.com/v21.0/me/adaccounts?fields=id,name,account_status,currency&access_token=${accessToken}&limit=25`
    )
    const adsData = await adsRes.json()

    if (adsData.data && adsData.data.length > 0) {
      for (const account of adsData.data) {
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

    return NextResponse.redirect(`${APP_URL}/dashboard?success=meta_connected`)
  } catch (err) {
    console.error('Meta OAuth callback error:', err)
    return NextResponse.redirect(`${APP_URL}/dashboard?error=meta_oauth_error`)
  }
}
