import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.0.0'

// This function is meant to be called via Supabase CRON (daily)
// It reports active device counts to Stripe for metered billing

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2023-10-16',
})

Deno.serve(async (req) => {
  // Verify this is called from Supabase CRON or with service role
  const authHeader = req.headers.get('Authorization')
  const expectedKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!authHeader?.includes(expectedKey || '')) {
    // Allow calls from Supabase internal CRON
    const isInternal = req.headers.get('x-supabase-cron') === 'true'
    if (!isInternal) {
      return new Response('Unauthorized', { status: 401 })
    }
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Get all tenants with active subscriptions
    const { data: tenants, error: tenantsError } = await supabase
      .from('tenants')
      .select('id, stripe_subscription_id')
      .not('stripe_subscription_id', 'is', null)
      .neq('plan', 'free')

    if (tenantsError) {
      throw tenantsError
    }

    const results: Array<{ tenant_id: string; device_count: number; reported: boolean }> = []

    for (const tenant of tenants || []) {
      // Count active (online or recently seen) devices
      const { count } = await supabase
        .from('devices')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenant.id)

      const deviceCount = count || 0

      if (deviceCount > 0 && tenant.stripe_subscription_id) {
        try {
          const subscription = await stripe.subscriptions.retrieve(
            tenant.stripe_subscription_id
          )

          const subscriptionItem = subscription.items.data[0]

          if (subscriptionItem) {
            await stripe.subscriptionItems.createUsageRecord(
              subscriptionItem.id,
              {
                quantity: deviceCount,
                timestamp: Math.floor(Date.now() / 1000),
                action: 'set',
              }
            )

            results.push({
              tenant_id: tenant.id,
              device_count: deviceCount,
              reported: true,
            })
          }
        } catch (stripeErr) {
          console.error(
            `Failed to report usage for tenant ${tenant.id}:`,
            stripeErr
          )
          results.push({
            tenant_id: tenant.id,
            device_count: deviceCount,
            reported: false,
          })
        }
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        tenants_processed: results.length,
        results,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (err) {
    console.error('Error reporting usage:', err)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
