import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
}

// Map JS day number to day name
const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

function formatTime(date: Date): string {
  return date.toTimeString().slice(0, 5) // "HH:MM"
}

function isWithinTimeWindow(targetTime: string, currentTime: string, windowMinutes: number): boolean {
  const [targetHours, targetMinutes] = targetTime.split(':').map(Number)
  const [currentHours, currentMinutes] = currentTime.split(':').map(Number)
  
  const targetTotal = targetHours * 60 + targetMinutes
  const currentTotal = currentHours * 60 + currentMinutes
  
  const diff = currentTotal - targetTotal
  return diff >= 0 && diff < windowMinutes
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Validate CRON_SECRET for security
    const cronSecret = req.headers.get('X-Cron-Secret')
    const expectedSecret = Deno.env.get('CRON_SECRET')

    if (!cronSecret || cronSecret !== expectedSecret) {
      console.error('Unauthorized cron attempt - invalid or missing CRON_SECRET')
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const now = new Date()
    const currentDay = DAY_NAMES[now.getDay()]
    const currentTime = formatTime(now)

    console.log(`Cron check at ${now.toISOString()} - Day: ${currentDay}, Time: ${currentTime}`)

    // Get all configs with sync_enabled = true
    const { data: configs, error: configsError } = await supabase
      .from('category_onedrive_config')
      .select('id, category_id, sync_days, sync_time')
      .eq('sync_enabled', true)

    if (configsError) {
      console.error('Error fetching configs:', configsError.message)
      throw configsError
    }

    console.log(`Found ${configs?.length || 0} enabled sync configs`)

    const syncResults: { categoryId: string; triggered: boolean; reason?: string }[] = []

    for (const config of configs || []) {
      // Check if this is the right day
      const syncDays = config.sync_days || []
      if (!syncDays.includes(currentDay)) {
        syncResults.push({ 
          categoryId: config.category_id, 
          triggered: false, 
          reason: 'Not a sync day' 
        })
        continue
      }

      // Check if current time is within the 15-minute window of sync_time
      const syncTime = config.sync_time || '05:00'
      if (!isWithinTimeWindow(syncTime, currentTime, 15)) {
        syncResults.push({ 
          categoryId: config.category_id, 
          triggered: false, 
          reason: 'Outside time window' 
        })
        continue
      }

      console.log(`Triggering sync for category ${config.category_id}`)

      // Trigger sync via edge function (service role call)
      try {
        const { error: invokeError } = await supabase.functions.invoke('sync-onedrive', {
          body: { categoryId: config.category_id, cronTriggered: true },
          headers: { 'X-Cron-Secret': cronSecret }
        })

        if (invokeError) {
          console.error(`Error invoking sync for category ${config.category_id}:`, invokeError.message)
          syncResults.push({ 
            categoryId: config.category_id, 
            triggered: false, 
            reason: `Invoke error: ${invokeError.message}` 
          })
        } else {
          syncResults.push({ 
            categoryId: config.category_id, 
            triggered: true 
          })
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        console.error(`Exception invoking sync for category ${config.category_id}:`, errorMessage)
        syncResults.push({ 
          categoryId: config.category_id, 
          triggered: false, 
          reason: `Exception: ${errorMessage}` 
        })
      }
    }

    const triggeredCount = syncResults.filter(r => r.triggered).length

    return new Response(
      JSON.stringify({ 
        success: true,
        timestamp: now.toISOString(),
        totalConfigs: configs?.length || 0,
        triggeredCount,
        results: syncResults
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error during cron check'
    console.error('Cron error:', errorMessage)
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
