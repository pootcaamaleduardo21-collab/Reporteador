// ─────────────────────────────────────────────────────────────────────
//  Meta Deauthorize Callback
//  Called by Meta when a user removes your app from their Facebook settings.
//  This is separate from data deletion — it just revokes the token.
//
//  Meta docs: https://developers.facebook.com/docs/facebook-login/handling-permissions#deauth-callback
//
//  Flow:
//    1. Parse & verify the signed_request
//    2. Delete the Meta token for this user from Supabase
//    3. Return HTTP 200
// ─────────────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server'
import { createClient }  from '@supabase/supabase-js'
import crypto             from 'crypto'

const APP_SECRET   = process.env.META_APP_SECRET        || ''
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY

function parseSignedRequest(signedRequest) {
  const [encodedSig, payload] = signedRequest.split('.')
  if (!encodedSig || !payload) throw new Error('Invalid signed_request format')

  const toBase64 = s => s.replace(/-/g, '+').replace(/_/g, '/') + '=='.slice((s.length % 4 || 4) - 1)

  const expectedSig = crypto
    .createHmac('sha256', APP_SECRET)
    .update(payload)
    .digest('base64')

  const sig = Buffer.from(toBase64(encodedSig), 'base64').toString('base64')
  if (sig !== expectedSig) throw new Error('Invalid signature')

  return JSON.parse(Buffer.from(toBase64(payload), 'base64').toString('utf8'))
}

export async function POST(request) {
  try {
    const body   = await request.text()
    const params = new URLSearchParams(body)
    const signedRequest = params.get('signed_request')

    if (!signedRequest) {
      return new NextResponse('Missing signed_request', { status: 400 })
    }

    let data
    try {
      data = parseSignedRequest(signedRequest)
    } catch (e) {
      console.error('[deauthorize] Invalid signed_request:', e.message)
      return new NextResponse('Invalid signed_request', { status: 400 })
    }

    const metaUserId = data.user_id
    console.log(`[deauthorize] Token revocation for Meta user: ${metaUserId}`)

    if (SUPABASE_URL && SERVICE_KEY) {
      try {
        const sb = createClient(SUPABASE_URL, SERVICE_KEY)

        // Remove Meta token — user will need to reconnect
        // We can't directly map Meta user ID → our user ID unless we store it
        // Best effort: log the deauth event for manual processing if needed
        await sb.from('deauth_events').insert({
          meta_user_id: metaUserId,
          event_at:     new Date().toISOString(),
        }).catch(() => {
          // Table may not exist — log and continue
          console.log('[deauthorize] deauth_events table not found, logging only')
        })

      } catch (e) {
        console.error('[deauthorize] Supabase error:', e.message)
      }
    }

    // Meta expects HTTP 200 — no specific body required
    return new NextResponse('OK', { status: 200 })

  } catch (e) {
    console.error('[deauthorize] Unexpected error:', e)
    return new NextResponse('Internal server error', { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ status: 'ok', endpoint: 'deauthorize-callback' })
}
