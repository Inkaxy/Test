import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { bakery_short_id, pin } = await req.json()

    if (!bakery_short_id) {
      return new Response(
        JSON.stringify({ error: 'bakery_short_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: bakery, error } = await supabase
      .from('bakeries')
      .select('settings')
      .eq('short_id', bakery_short_id)
      .eq('is_active', true)
      .maybeSingle()

    if (error) throw error

    if (!bakery) {
      return new Response(
        JSON.stringify({ error: 'Bakery not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const settings = (bakery.settings as Record<string, unknown>) || {}
    const kioskPin = settings.kiosk_pin as string | null | undefined

    // No PIN configured — allow access
    if (!kioskPin) {
      return new Response(
        JSON.stringify({ valid: true, no_pin: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate PIN
    const valid = pin === kioskPin

    return new Response(
      JSON.stringify({ valid }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('Error validating kiosk PIN:', err)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
