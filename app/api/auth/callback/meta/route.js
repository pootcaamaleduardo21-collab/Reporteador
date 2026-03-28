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

    // 3. Fetch Meta Ads accounts — múltiples métodos para máxima cobertura
    let adAccountsList = []

    const [directRes, bizRes, pagesRes] = await Promise.all([
      // Método 1: cuentas directas del usuario
      fetch(`https://graph.facebook.com/v21.0/me/adaccounts?fields=id,name,account_status,currency&access_token=${accessToken}&limit=50`),
      // Método 2: Business Manager (propias Y de clientes)
      fetch(`https://graph.facebook.com/v21.0/me/businesses?fields=id,name,owned_ad_accounts{id,name,account_status,currency},client_ad_accounts{id,name,account_status,currency}&access_token=${accessToken}&limit=20`),
      // Método 3: páginas del usuario (para extraer ad_accounts relacionadas)
      fetch(`https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token&access_token=${accessToken}&limit=20`),
    ])
    const directData = await directRes.json()
    const bizData = await bizRes.json()
    const pagesData = await pagesRes.json()

    // Método 1: cuentas directas
    if (directData.data?.length > 0) {
      adAccountsList.push(...directData.data)
    }

    // Método 2: Business Manager — owned AND client ad accounts
    if (bizData.data?.length > 0) {
      for (const biz of bizData.data) {
        if (biz.owned_ad_accounts?.data?.length > 0) {
          adAccountsList.push(...biz.owned_ad_accounts.data)
        }
        if (biz.client_ad_accounts?.data?.length > 0) {
          adAccountsList.push(...biz.client_ad_accounts.data)
        }
      }
    }

    // Método 3: para cada página, buscar ad accounts asociadas vía page token
    // Esto cubre el caso donde el usuario gestiona ads desde sus páginas de FB
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
