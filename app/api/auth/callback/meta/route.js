import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

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

    const cookies = request.headers.get('cookie') || ''
    const sessionMatch = cookies.match(/sb-[^=]+-auth-token=([^;]+)/)
    
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/dashboard/connect?token=${longData.access_token}&expires=${expiresAt.toISOString()}`
    )
  } catch (err) {
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/dashboard?error=meta_failed`)
  }
}
