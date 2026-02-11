import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.0.0'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2023-10-16',
})

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

Deno.serve(async (req) => {
  const signature = req.headers.get('stripe-signature')
  if (!signature) {
    return new Response('Missing stripe-signature header', { status: 400 })
  }

  const body = await req.text()

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      Deno.env.get('STRIPE_WEBHOOK_SECRET')!
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return new Response('Invalid signature', { status: 400 })
  }

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        const { data: tenant } = await supabase
          .from('tenants')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single()

        if (tenant) {
          const priceItem = subscription.items.data[0]
          const lookupKey = priceItem?.price.lookup_key || 'free'

          let plan = 'free'
          let maxDevices = 2

          if (lookupKey.includes('pro') || lookupKey.includes('premium')) {
            plan = 'pro'
            maxDevices = 999
          } else if (lookupKey.includes('enterprise')) {
            plan = 'enterprise'
            maxDevices = 99999
          }

          // Also check subscription status
          if (subscription.status !== 'active' && subscription.status !== 'trialing') {
            plan = 'free'
            maxDevices = 2
          }

          await supabase
            .from('tenants')
            .update({
              plan,
              max_devices: maxDevices,
              stripe_subscription_id: subscription.id,
            })
            .eq('id', tenant.id)
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        await supabase
          .from('tenants')
          .update({ plan: 'free', max_devices: 2, stripe_subscription_id: null })
          .eq('stripe_customer_id', customerId)
        break
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = invoice.customer as string

        // Log successful payment for audit
        const { data: tenant } = await supabase
          .from('tenants')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single()

        if (tenant) {
          console.log(`Invoice paid for tenant ${tenant.id}: ${invoice.id}`)
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = invoice.customer as string

        const { data: tenant } = await supabase
          .from('tenants')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single()

        if (tenant) {
          console.warn(`Payment failed for tenant ${tenant.id}: ${invoice.id}`)
        }
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }
  } catch (err) {
    console.error('Error processing webhook event:', err)
    return new Response(
      JSON.stringify({ error: 'Webhook handler failed' }),
      { status: 500 }
    )
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})
