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

    // Get authorization header and verify user
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

    // Get request body
    const { categoryId } = await req.json()

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

    console.log(`Sync requested for category ${categoryId}`)
    console.log(`OneDrive URL: ${config.onedrive_folder_url}`)

    // Update status - in a real implementation, we'd parse files here
    await supabase
      .from('category_onedrive_config')
      .update({ 
        sync_status: 'configured',
        last_sync_at: new Date().toISOString(),
        sync_error: 'OneDrive-synkronisering krever manuell filopplasting foreløpig. Automatisk synkronisering kommer snart.'
      })
      .eq('id', config.id)

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'OneDrive-synkronisering er foreløpig ikke automatisert. Bruk manuell filopplasting.',
        info: 'For fullstendig OneDrive-integrasjon, kontakt administrator for oppsett av Microsoft Graph API.'
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
