import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder')
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

export async function POST(req) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')

  let event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test')
  } catch(e) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }

  const session = event.data.object

  if (event.type === 'checkout.session.completed') {
    const userId = session.metadata?.userId
    if (userId) {
      await supabase.from('profiles').upsert({
        id: userId,
        plan: 'pro',
        stripe_subscription_id: session.subscription,
        stripe_customer_id: session.customer,
      })
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const customerId = session.customer
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('stripe_customer_id', customerId)
      .single()
    if (profile) {
      await supabase.from('profiles').update({ plan: 'free' }).eq('id', profile.id)
    }
  }

  return NextResponse.json({ received: true })
}
