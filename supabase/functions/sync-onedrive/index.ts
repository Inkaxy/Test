import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
}

interface OneDriveConfig {
  id: string
  bakery_id: string
  category_id: string
  onedrive_folder_url: string | null
  onedrive_folder_id: string | null
  sync_enabled: boolean
  sync_time: string | null
  sync_days: string[] | null
  delete_after_import: boolean
}

interface BakerySettings {
  auto_delete_days?: number
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    
    const { categoryId, cronTriggered } = await req.json()

    // Check if this is a cron-triggered call
    const cronSecret = req.headers.get('X-Cron-Secret')
    const expectedCronSecret = Deno.env.get('CRON_SECRET')
    const isCronCall = cronTriggered && cronSecret === expectedCronSecret

    let supabase
    let userId: string | null = null

    if (isCronCall) {
      // Cron call - use service role
      console.log('Sync triggered by cron job')
      supabase = createClient(supabaseUrl, supabaseServiceKey)
    } else {
      // Manual call - require JWT authentication
      const authHeader = req.headers.get('Authorization')
      if (!authHeader?.startsWith('Bearer ')) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized - Missing authorization header' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const token = authHeader.replace('Bearer ', '')
      
      // Create client with user's token for auth validation
      supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } }
      })

      const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token)
      
      if (claimsError || !claimsData?.claims) {
        console.error('Auth error:', claimsError?.message)
        return new Response(
          JSON.stringify({ error: 'Unauthorized - Invalid token' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      userId = claimsData.claims.sub as string
      console.log(`Sync triggered by user: ${userId}`)
    }

    if (!categoryId) {
      return new Response(
        JSON.stringify({ error: 'categoryId er påkrevd' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get OneDrive config for this category
    const { data: config, error: configError } = await supabase
      .from('category_onedrive_config')
      .select('*')
      .eq('category_id', categoryId)
      .single()

    if (configError || !config) {
      return new Response(
        JSON.stringify({ error: 'Ingen OneDrive-konfigurasjon funnet for denne kategorien' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // For manual calls, verify user has access to this bakery
    if (!isCronCall && userId) {
      const { data: hasAccess } = await supabase.rpc('can_access_bakery', { 
        _bakery_id: config.bakery_id 
      })
      
      if (!hasAccess) {
        console.error(`User ${userId} attempted to sync category in bakery they don't have access to`)
        return new Response(
          JSON.stringify({ error: 'Ingen tilgang til dette bakeriet' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    if (!config.onedrive_folder_url) {
      return new Response(
        JSON.stringify({ error: 'OneDrive-mappe ikke konfigurert' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get bakery settings for auto_delete_days
    const { data: bakery } = await supabase
      .from('bakeries')
      .select('settings')
      .eq('id', config.bakery_id)
      .single()

    const bakerySettings = (bakery?.settings || {}) as BakerySettings
    const autoDeleteDays = bakerySettings.auto_delete_days ?? 30

    // Calculate cutoff date
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - autoDeleteDays)
    const cutoffDateStr = cutoffDate.toISOString().split('T')[0]

    // Get already imported dates for this category
    const { data: importBatches } = await supabase
      .from('import_batches')
      .select('delivery_date')
      .eq('bakery_id', config.bakery_id)
      .eq('category_id', categoryId)
    
    const importedDates = new Set(
      (importBatches || []).map(b => b.delivery_date)
    )

    console.log(`Sync for category ${categoryId}, cutoff: ${cutoffDateStr}, imported dates: ${importedDates.size}`)

    // Update sync status to syncing
    await supabase
      .from('category_onedrive_config')
      .update({ sync_status: 'syncing', sync_error: null })
      .eq('id', config.id)

    // Placeholder: Full OneDrive integration requires Microsoft Graph API
    // Update status
    await supabase
      .from('category_onedrive_config')
      .update({ 
        sync_status: 'configured',
        last_sync_at: new Date().toISOString(),
        sync_error: 'OneDrive-synkronisering krever Microsoft Graph API-integrasjon. Bruk manuell filopplasting foreløpig.'
      })
      .eq('id', config.id)

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'OneDrive-synkronisering er foreløpig ikke automatisert. Bruk manuell filopplasting.',
        info: 'For fullstendig OneDrive-integrasjon, kontakt administrator for oppsett av Microsoft Graph API.',
        filterInfo: {
          autoDeleteDays,
          cutoffDate: cutoffDateStr,
          alreadyImportedCount: importedDates.size,
          deleteAfterImport: config.delete_after_import
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Ukjent feil under synkronisering'
    console.error('Sync error:', errorMessage)
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
