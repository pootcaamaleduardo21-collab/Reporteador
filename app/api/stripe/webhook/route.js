import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder')
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

// Map Stripe price IDs → plan names
const PRICE_TO_PLAN = {
  'price_1TGNdD4fet1IdptsRfTo1rjv': 'starter',
  'price_1TGNdY4fet1IdptsK2bixrv3': 'pro',
  'price_1TGNdr4fet1IdptsPZUSFC16': 'agency',
}

async function getPlanFromSubscription(subscriptionId) {
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId, { expand: ['items.data.price'] })
    const priceId = subscription.items.data[0]?.price?.id
    return PRICE_TO_PLAN[priceId] || 'starter'
  } catch(e) {
    return 'starter'
  }
}

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
    // Plan passed from checkout metadata; fallback to resolving from subscription
    const planFromMeta = session.metadata?.plan
    if (userId) {
      const plan = planFromMeta && PRICE_TO_PLAN[Object.keys(PRICE_TO_PLAN).find(k => PRICE_TO_PLAN[k] === planFromMeta)]
        ? planFromMeta
        : session.subscription
        ? await getPlanFromSubscription(session.subscription)
        : planFromMeta || 'starter'

      await supabase.from('profiles').upsert({
        id: userId,
        plan,
        stripe_subscription_id: session.subscription,
        stripe_customer_id: session.customer,
      })
    }
  }

  if (event.type === 'customer.subscription.updated') {
    const priceId = session.items?.data[0]?.price?.id
    const plan = PRICE_TO_PLAN[priceId]
    if (plan) {
      const customerId = session.customer
      const { data: profile } = await supabase
        .from('profiles').select('id').eq('stripe_customer_id', customerId).single()
      if (profile) {
        await supabase.from('profiles').update({ plan, stripe_subscription_id: session.id }).eq('id', profile.id)
      }
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
      await supabase.from('profiles').update({ plan: 'free', stripe_subscription_id: null }).eq('id', profile.id)
    }
  }

  return NextResponse.json({ received: true })
}
