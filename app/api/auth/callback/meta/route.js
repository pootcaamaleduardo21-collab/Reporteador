import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error || !code) {
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/dashboard?error=meta_denied`)
  }

  try {
    const tokenRes = await fetch(
      `https://graph.facebook.com/v21.0/oauth/access_token?` +
      `client_id=${process.env.META_APP_ID}&` +
      `client_secret=${process.env.META_APP_SECRET}&` +
      `redirect_uri=${process.env.NEXTAUTH_URL}/api/auth/callback/meta&` +
      `code=${code}`
    )
    const tokenData = await tokenRes.json()
    if (tokenData.error) throw new Error(tokenData.error.message)

    const longRes = await fetch(
      `https://graph.facebook.com/v21.0/oauth/access_token?` +
      `grant_type=fb_exchange_token&` +
      `client_id=${process.env.META_APP_ID}&` +
      `client_secret=${process.env.META_APP_SECRET}&` +
      `fb_exchange_token=${tokenData.access_token}`
    )
    const longData = await longRes.json()
    const expiresAt = new Date(Date.now() + (longData.expires_in || 5184000) * 1000)
    const accessToken = longData.access_token

    const accsRes = await fetch(
      `https://graph.facebook.com/v21.0/me/adaccounts?fields=id,name,account_status&limit=50&access_token=${accessToken}`
    )
    const accsData = await accsRes.json()
    const accounts = accsData.data || []

    const encoded = encodeURIComponent(JSON.stringify({
      token: accessToken,
      expires: expiresAt.toISOString(),
      accounts: accounts.map(a => ({
        id: a.id,
        name: a.name,
        status: a.account_status
      }))
    }))

    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/dashboard/connect?data=${encoded}`
    )
  } catch (err) {
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/dashboard?error=meta_failed`)
  }
}
