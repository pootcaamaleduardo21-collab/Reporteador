import { NextResponse } from 'next/server'

export async function GET() {
  const params = new URLSearchParams({
    client_id: process.env.META_APP_ID,
    redirect_uri: `${process.env.NEXTAUTH_URL}/api/auth/callback/meta`,
    scope: 'ads_read,ads_management,read_insights,business_management',
    response_type: 'code',
  })
  
  return NextResponse.redirect(
    `https://www.facebook.com/dialog/oauth?${params.toString()}`
  )
}
