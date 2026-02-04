import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
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
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get authorization header and verify user (unless automated)
    const { categoryId, automated } = await req.json()

    if (!automated) {
      const authHeader = req.headers.get('Authorization')
      if (!authHeader) {
        return new Response(
          JSON.stringify({ error: 'Ingen autentisering' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const token = authHeader.replace('Bearer ', '')
      const { data: { user }, error: authError } = await supabase.auth.getUser(token)
      
      if (authError || !user) {
        return new Response(
          JSON.stringify({ error: 'Ugyldig autentisering' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
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

    console.log(`Sync requested for category ${categoryId}`)
    console.log(`OneDrive URL: ${config.onedrive_folder_url}`)
    console.log(`Auto delete days: ${autoDeleteDays}`)
    console.log(`Cutoff date: ${cutoffDateStr}`)
    console.log(`Already imported dates: ${Array.from(importedDates).join(', ') || 'none'}`)
    console.log(`Delete after import: ${config.delete_after_import}`)

    // Update sync status to syncing
    await supabase
      .from('category_onedrive_config')
      .update({ sync_status: 'syncing', sync_error: null })
      .eq('id', config.id)

    // For now, we return a placeholder response
    // Full OneDrive integration requires Microsoft Graph API with OAuth
    // This would need:
    // 1. Azure AD app registration
    // 2. OAuth flow for user consent
    // 3. Access tokens to call Microsoft Graph API
    // 4. File download and parsing logic
    // 5. File deletion logic (if delete_after_import is enabled)

    // Placeholder: Simulate file filtering logic
    // In a real implementation, we would:
    // 1. List files in the OneDrive folder using Microsoft Graph API
    // 2. For each file, extract date from filename (e.g., "03.02.2026.od0" -> 2026-02-03)
    // 3. Skip if date is in importedDates
    // 4. Skip if date < cutoffDateStr
    // 5. Download and process the file
    // 6. If delete_after_import is true and import succeeded, delete the file from OneDrive

    // Update status - in a real implementation, we'd parse files here
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
    console.error('Sync error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Ukjent feil under synkronisering'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
