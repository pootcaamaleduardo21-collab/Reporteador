import { NextResponse } from 'next/server'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://reporteador.vercel.app'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  // state carries the user ID encoded from the client side
  const state = searchParams.get('state') || ''

  const params = new URLSearchParams({
    client_id: process.env.META_APP_ID,
    redirect_uri: `${APP_URL}/api/auth/callback/meta`,
    scope: 'ads_read,ads_management,read_insights,business_management,pages_show_list,pages_read_engagement,instagram_basic,instagram_manage_insights',
    response_type: 'code',
    state,
  })

  return NextResponse.redirect(`https://www.facebook.com/dialog/oauth?${params.toString()}`)
}
