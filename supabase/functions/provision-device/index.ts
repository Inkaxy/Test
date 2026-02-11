import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { code, device_id, device_name, android_version } = await req.json()

    if (!code || !device_id) {
      return new Response(
        JSON.stringify({ error: 'code and device_id are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Look up the provision code
    const { data: provisionCode, error: codeError } = await supabase
      .from('provision_codes')
      .select('*')
      .eq('code', code)
      .is('used_at', null)
      .single()

    if (codeError || !provisionCode) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired provision code' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if code has expired
    if (new Date(provisionCode.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: 'Provision code has expired' }),
        { status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check device limit for tenant
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id, max_devices, plan')
      .eq('id', provisionCode.tenant_id)
      .single()

    if (tenantError || !tenant) {
      return new Response(
        JSON.stringify({ error: 'Tenant not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Count existing devices
    const { count: deviceCount } = await supabase
      .from('devices')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenant.id)

    if (deviceCount !== null && deviceCount >= tenant.max_devices) {
      return new Response(
        JSON.stringify({
          error: 'Device limit reached',
          max_devices: tenant.max_devices,
          current_count: deviceCount,
          plan: tenant.plan,
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Generate a device token
    const deviceToken = crypto.randomUUID()

    // Create the device
    const { data: device, error: deviceError } = await supabase
      .from('devices')
      .insert({
        tenant_id: tenant.id,
        device_token: deviceToken,
        name: provisionCode.device_name || device_name || 'New Device',
        model: device_name,
        android_version: android_version,
        config: provisionCode.config || {},
        is_online: true,
        last_seen: new Date().toISOString(),
      })
      .select()
      .single()

    if (deviceError) {
      console.error('Error creating device:', deviceError)
      return new Response(
        JSON.stringify({ error: 'Failed to create device' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Mark the provision code as used
    await supabase
      .from('provision_codes')
      .update({
        used_at: new Date().toISOString(),
        used_by_device: device.id,
      })
      .eq('id', provisionCode.id)

    // Log the event
    await supabase
      .from('device_events')
      .insert({
        device_id: device.id,
        tenant_id: tenant.id,
        event_type: 'provisioned',
        payload: {
          provision_code: code,
          device_model: device_name,
          android_version: android_version,
        },
      })

    return new Response(
      JSON.stringify({
        device_id: device.id,
        device_token: deviceToken,
        tenant_id: tenant.id,
        config: device.config,
        plan: tenant.plan,
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('Error provisioning device:', err)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
