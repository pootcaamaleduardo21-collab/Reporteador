import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder')
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

export async function POST(req) {
  try {
    const { priceId, userId, email } = await req.json()

    // Get or create Stripe customer
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single()

    let customerId = profile?.stripe_customer_id

    if (!customerId) {
      const customer = await stripe.customers.create({ email, metadata: { userId } })
      customerId = customer.id
      await supabase.from('profiles').upsert({ id: userId, stripe_customer_id: customerId, email })
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: process.env.NEXTAUTH_URL + '/dashboard?plan=success',
      cancel_url: process.env.NEXTAUTH_URL + '/planes?canceled=true',
      metadata: { userId },
    })

    return NextResponse.json({ url: session.url })
  } catch(e) {
    console.error(e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
