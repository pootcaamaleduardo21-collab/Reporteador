import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder')
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

export async function POST(req) {
  try {
    const { userId } = await req.json()
    const { data: profile } = await supabase.from('profiles').select('stripe_customer_id').eq('id', userId).single()
    if (!profile?.stripe_customer_id) return NextResponse.json({ error: 'No customer' }, { status: 400 })

    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: process.env.NEXTAUTH_URL + '/dashboard/settings',
    })
    return NextResponse.json({ url: session.url })
  } catch(e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
