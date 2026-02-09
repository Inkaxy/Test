import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
}

interface OneDriveConfig {
  id: string
  bakery_id: string
  category_id: string
  trip_id: string | null
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

interface GraphDriveItem {
  id: string
  name: string
  file?: { mimeType: string }
  folder?: { childCount: number }
  size?: number
}

interface FolderContents {
  driveId: string
  files: GraphDriveItem[]
}

interface ParsedProduct {
  productNumber: string
  name: string
}

interface ParsedCustomer {
  customerNumber: string
  originalId: string
  name: string
  address?: string
  phone?: string
}

interface ParsedOrderProduct {
  productNumber: string
  quantity: number
}

interface ParsedOrder {
  customerNumber: string
  deliveryDate: string
  products: ParsedOrderProduct[]
}

// ============================================================================
// AZURE AD AUTHENTICATION
// ============================================================================

async function getGraphAccessToken(): Promise<string> {
  const tenantId = Deno.env.get('AZURE_TENANT_ID')
  const clientId = Deno.env.get('AZURE_CLIENT_ID')
  const clientSecret = Deno.env.get('AZURE_CLIENT_SECRET')

  if (!tenantId || !clientId || !clientSecret) {
    throw new Error('Azure AD-legitimasjon mangler. Konfigurer AZURE_TENANT_ID, AZURE_CLIENT_ID og AZURE_CLIENT_SECRET.')
  }

  const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`
  
  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    scope: 'https://graph.microsoft.com/.default',
    grant_type: 'client_credentials',
  })

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('Azure AD token error:', errorText)
    throw new Error(`Azure AD-autentisering feilet: ${response.status}. Kontroller Client ID, Tenant ID og Secret.`)
  }

  const data = await response.json()
  return data.access_token
}

// ============================================================================
// ONEDRIVE URL PARSING
// ============================================================================

function encodeShareUrl(shareUrl: string): string {
  // Convert sharing URL to a format usable with Graph API
  // Encoding: base64url(shareUrl) with "u!" prefix
  const base64 = btoa(shareUrl)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
  return `u!${base64}`
}

function extractShareIdFromUrl(url: string): string {
  // Handle various OneDrive URL formats
  // Example: https://1drv.ms/f/s!AExample...
  // Example: https://onedrive.live.com/...
  // Example: https://company-my.sharepoint.com/...
  
  return encodeShareUrl(url)
}

// ============================================================================
// MICROSOFT GRAPH API OPERATIONS
// ============================================================================

async function getFilesInFolder(accessToken: string, shareUrl: string): Promise<FolderContents> {
  const shareId = extractShareIdFromUrl(shareUrl)
  
  // First get the shared folder to extract driveId from parentReference
  const shareResponse = await fetch(
    `https://graph.microsoft.com/v1.0/shares/${shareId}/driveItem`,
    {
      headers: { Authorization: `Bearer ${accessToken}` }
    }
  )

  if (!shareResponse.ok) {
    const errorText = await shareResponse.text()
    console.error('Graph API folder access error:', errorText)
    throw new Error(`Kunne ikke få tilgang til OneDrive-mappen. Sjekk at delingslenken er gyldig og at appen har tilgang. Status: ${shareResponse.status}`)
  }

  const shareData = await shareResponse.json()
  const driveId = shareData.parentReference?.driveId

  if (!driveId) {
    console.error('Missing driveId in parentReference:', JSON.stringify(shareData.parentReference))
    throw new Error('Kunne ikke ekstrahere Drive ID fra delt mappe. Kontroller at delingslenken er gyldig.')
  }

  console.log(`Extracted driveId: ${driveId}`)

  // Get children (no $select for downloadUrl - it doesn't work for shared folders)
  const childrenResponse = await fetch(
    `https://graph.microsoft.com/v1.0/shares/${shareId}/driveItem/children`,
    {
      headers: { Authorization: `Bearer ${accessToken}` }
    }
  )

  if (!childrenResponse.ok) {
    const errorText = await childrenResponse.text()
    console.error('Graph API children error:', errorText)
    throw new Error(`Kunne ikke hente filer fra OneDrive-mappen. Status: ${childrenResponse.status}`)
  }

  const data = await childrenResponse.json()
  
  return {
    driveId,
    files: data.value || []
  }
}

async function downloadFileContent(
  accessToken: string, 
  driveId: string, 
  itemId: string, 
  fileName: string
): Promise<string> {
  // Use the /content endpoint which returns a 302 redirect to the actual file
  const contentUrl = `https://graph.microsoft.com/v1.0/drives/${driveId}/items/${itemId}/content`
  
  console.log(`Downloading file: ${fileName}`)

  const response = await fetch(contentUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
    redirect: 'follow'  // Automatically follow 302 redirect
  })
  
  if (!response.ok) {
    console.error(`Failed to download ${fileName}: ${response.status}`)
    throw new Error(`Kunne ikke laste ned fil ${fileName}: ${response.status}`)
  }

  // Try to detect encoding - first try UTF-8, then fallback to Windows-1252
  const buffer = await response.arrayBuffer()
  let content = new TextDecoder('utf-8').decode(buffer)
  
  // Check for garbled Nordic characters
  if (hasGarbledCharacters(content)) {
    console.log('Detected encoding issue, trying Windows-1252...')
    content = new TextDecoder('windows-1252').decode(buffer)
  }

  console.log(`Successfully downloaded ${fileName} (${buffer.byteLength} bytes)`)
  return content
}

async function deleteFile(
  accessToken: string, 
  driveId: string, 
  itemId: string
): Promise<void> {
  const response = await fetch(
    `https://graph.microsoft.com/v1.0/drives/${driveId}/items/${itemId}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` }
    }
  )

  if (!response.ok && response.status !== 204) {
    console.error(`Failed to delete file ${itemId}: ${response.status}`)
    throw new Error(`Kunne ikke slette fil: ${response.status}`)
  } else {
    console.log(`Successfully deleted file ${itemId}`)
  }
}

// ============================================================================
// FILE PARSING (ported from src/lib/fileParser.ts)
// ============================================================================

function removeLeadingZeros(str: string): string {
  if (!str) return str
  const result = str.replace(/^0+/, '')
  return result || '0'
}

function hasGarbledCharacters(content: string): boolean {
  const garbledPatterns = [
    /Ã¸/,  // ø
    /Ã¦/,  // æ
    /Ã¥/,  // å
    /Ã˜/,  // Ø
    /Ã†/,  // Æ
    /Ã…/,  // Å
  ]
  return garbledPatterns.some(pattern => pattern.test(content))
}

function parsePrdFile(content: string): { products: ParsedProduct[]; errors: string[] } {
  const lines = content.split(/\r?\n/).filter(line => line.trim())
  const products: ParsedProduct[] = []
  const errors: string[] = []
  
  lines.forEach((line, index) => {
    const trimmedLine = line.trim()
    if (!trimmedLine) return
    
    // Skip header lines
    if (index === 0 && (
      trimmedLine.toLowerCase().includes('varenr') || 
      trimmedLine.toLowerCase().includes('product') ||
      trimmedLine.toLowerCase().includes('produktnr')
    )) {
      return
    }
    
    const parts = trimmedLine.split(/\s+/)
    
    if (parts.length < 2) {
      errors.push(`Linje ${index + 1}: For få felter`)
      return
    }
    
    const productNumber = parts[0]
    
    // Find where the product name ends (before first 4+ digit number = EAN)
    let nameEndIndex = parts.length
    for (let j = 1; j < parts.length; j++) {
      if (/^\d{4,}/.test(parts[j]) || /^\d+[.,]\d+$/.test(parts[j])) {
        nameEndIndex = j
        break
      }
    }
    
    const productName = parts.slice(1, nameEndIndex).join(' ')
    
    if (!productNumber || !productName) {
      errors.push(`Linje ${index + 1}: Mangler produktnummer eller navn`)
      return
    }
    
    products.push({ productNumber, name: productName })
  })
  
  return { products, errors }
}

function parseCusFile(content: string): { customers: ParsedCustomer[]; errors: string[] } {
  const lines = content.split(/\r?\n/).filter(line => line.trim())
  const customers: ParsedCustomer[] = []
  const errors: string[] = []
  
  lines.forEach((line, index) => {
    const trimmedLine = line.trim()
    if (!trimmedLine) return
    
    // Skip header lines
    if (index === 0 && (
      trimmedLine.toLowerCase().includes('kundenr') || 
      trimmedLine.toLowerCase().includes('customer') ||
      trimmedLine.toLowerCase().includes('kundenummer')
    )) {
      return
    }
    
    let originalId: string
    let customerNumber: string
    let name: string
    let address: string | undefined
    let phone: string | undefined
    
    // Detect format: labeled vs standard
    if (trimmedLine.toLowerCase().includes('kundenummer:') || 
        trimmedLine.toLowerCase().includes('kundenanv:')) {
      // Format B: Labeled format
      const customerIdMatch = trimmedLine.match(/kundenummer:\s*(\d+)/i)
      const nameMatch = trimmedLine.match(/Kundenanv:\s*(.+?)(?:\s+(?:Adresse|Tlf|$))/i)
      const addressMatch = trimmedLine.match(/Adresse:\s*(.+?)(?:\s+Tlf:|$)/i)
      const phoneMatch = trimmedLine.match(/Tlf:\s*(\d+)/i)
      
      if (!customerIdMatch || !nameMatch) {
        errors.push(`Linje ${index + 1}: Kunne ikke parse labeled format`)
        return
      }
      
      originalId = customerIdMatch[1]
      customerNumber = removeLeadingZeros(originalId)
      name = nameMatch[1].trim()
      address = addressMatch?.[1]?.trim()
      phone = phoneMatch?.[1]
    } else {
      // Format A: Standard format (split on 4+ spaces)
      const parts = trimmedLine.split(/\s{4,}/)
      
      if (parts.length < 2) {
        const fallbackParts = trimmedLine.split(/\s{2,}/)
        if (fallbackParts.length >= 2) {
          originalId = fallbackParts[0].trim()
          customerNumber = removeLeadingZeros(originalId)
          name = fallbackParts[1].trim()
          address = fallbackParts[2]?.trim()
        } else {
          errors.push(`Linje ${index + 1}: For få felter (trenger kundenr og navn)`)
          return
        }
      } else {
        originalId = parts[0].trim()
        customerNumber = removeLeadingZeros(originalId)
        name = parts[1].trim()
        address = parts[2]?.trim()
      }
    }
    
    if (!customerNumber || !name) {
      errors.push(`Linje ${index + 1}: Mangler kundenummer eller navn`)
      return
    }
    
    customers.push({ originalId, customerNumber, name, address, phone })
  })
  
  return { customers, errors }
}

function parseOd0File(content: string): { orders: ParsedOrder[]; errors: string[] } {
  const lines = content.split(/\r?\n/).filter(line => line.trim())
  const errors: string[] = []
  const orderMap = new Map<string, ParsedOrder>()
  
  lines.forEach((line, index) => {
    const trimmedLine = line.trim()
    if (!trimmedLine) return
    
    // Skip header lines
    if (index === 0 && (
      trimmedLine.toLowerCase().includes('varenr') || 
      trimmedLine.toLowerCase().includes('product') ||
      trimmedLine.toLowerCase().includes('ordre')
    )) {
      return
    }
    
    const parts = trimmedLine.split(/\s+/)
    
    if (parts.length < 5) {
      errors.push(`Linje ${index + 1}: For få felter (trenger 5 felter)`)
      return
    }
    
    const productIdRaw = parts[0]
    const productNumber = removeLeadingZeros(productIdRaw)
    const compositeField = parts[1]
    
    if (compositeField.length < 9) {
      errors.push(`Linje ${index + 1}: Kompositfelt for kort`)
      return
    }
    
    const withoutPrefix = compositeField.substring(4)
    const quantityPart = withoutPrefix.slice(-5)
    const quantity = parseInt(removeLeadingZeros(quantityPart), 10)
    
    if (isNaN(quantity) || quantity <= 0) {
      errors.push(`Linje ${index + 1}: Ugyldig antall "${quantityPart}"`)
      return
    }
    
    const customerPart = withoutPrefix.slice(0, -5)
    const customerNumber = removeLeadingZeros(customerPart)
    
    if (!customerNumber) {
      errors.push(`Linje ${index + 1}: Kunne ikke parse kundenummer`)
      return
    }
    
    const dateStr = parts[4]
    
    if (!/^\d{8}$/.test(dateStr)) {
      errors.push(`Linje ${index + 1}: Ugyldig datoformat "${dateStr}"`)
      return
    }
    
    const year = dateStr.substring(0, 4)
    const month = dateStr.substring(4, 6)
    const day = dateStr.substring(6, 8)
    const deliveryDate = `${year}-${month}-${day}`
    
    const orderKey = `${customerNumber}-${deliveryDate}`
    
    if (!orderMap.has(orderKey)) {
      orderMap.set(orderKey, { customerNumber, deliveryDate, products: [] })
    }
    
    const order = orderMap.get(orderKey)!
    const existingProduct = order.products.find(p => p.productNumber === productNumber)
    
    if (existingProduct) {
      existingProduct.quantity += quantity
    } else {
      order.products.push({ productNumber, quantity })
    }
  })
  
  return { orders: Array.from(orderMap.values()), errors }
}

function extractDateFromFilename(filename: string): string | null {
  const nameWithoutExt = filename.replace(/\.[^.]+$/, '')
  
  // Try DD-MM-YYYY
  const ddmmyyyyDash = nameWithoutExt.match(/(\d{2})-(\d{2})-(\d{4})/)
  if (ddmmyyyyDash) {
    const [, day, month, year] = ddmmyyyyDash
    return `${year}-${month}-${day}`
  }
  
  // Try DD.MM.YYYY
  const ddmmyyyyDot = nameWithoutExt.match(/(\d{2})\.(\d{2})\.(\d{4})/)
  if (ddmmyyyyDot) {
    const [, day, month, year] = ddmmyyyyDot
    return `${year}-${month}-${day}`
  }
  
  // Try YYYY-MM-DD
  const yyyymmddDash = nameWithoutExt.match(/(\d{4})-(\d{2})-(\d{2})/)
  if (yyyymmddDash) {
    const [, year, month, day] = yyyymmddDash
    return `${year}-${month}-${day}`
  }
  
  // Try compact YYYYMMDD
  const yyyymmddCompact = nameWithoutExt.match(/((?:19|20)\d{2})(\d{2})(\d{2})/)
  if (yyyymmddCompact) {
    const [, year, month, day] = yyyymmddCompact
    const monthNum = parseInt(month)
    const dayNum = parseInt(day)
    if (monthNum >= 1 && monthNum <= 12 && dayNum >= 1 && dayNum <= 31) {
      return `${year}-${month}-${day}`
    }
  }
  
  // Try compact DDMMYYYY
  const ddmmyyyyCompact = nameWithoutExt.match(/(\d{2})(\d{2})((?:19|20)\d{2})/)
  if (ddmmyyyyCompact) {
    const [, day, month, year] = ddmmyyyyCompact
    const monthNum = parseInt(month)
    const dayNum = parseInt(day)
    if (monthNum >= 1 && monthNum <= 12 && dayNum >= 1 && dayNum <= 31) {
      return `${year}-${month}-${day}`
    }
  }
  
  return null
}

// ============================================================================
// DATABASE IMPORT
// ============================================================================

async function importData(
  supabase: ReturnType<typeof createClient>,
  bakeryId: string,
  categoryId: string,
  tripId: string | null,
  products: ParsedProduct[],
  customers: ParsedCustomer[],
  orders: ParsedOrder[],
  deliveryDate: string
): Promise<{ productsCount: number; customersCount: number; ordersCount: number }> {
  
  console.log(`Importing: ${products.length} products, ${customers.length} customers, ${orders.length} orders for ${deliveryDate}`)
  
  // 1. Upsert products
  const productMap = new Map<string, string>() // productNumber -> id
  
  if (products.length > 0) {
    const productUpserts = products.map(p => ({
      bakery_id: bakeryId,
      category_id: categoryId,
      product_number: p.productNumber,
      name: p.name,
      is_active: true,
    }))
    
    const { data: upsertedProducts, error: prodError } = await supabase
      .from('products')
      .upsert(productUpserts, { 
        onConflict: 'bakery_id,product_number',
        ignoreDuplicates: false 
      })
      .select('id, product_number')
    
    if (prodError) {
      console.error('Product upsert error:', prodError)
      throw new Error(`Feil ved import av produkter: ${prodError.message}`)
    }
    
    // Fetch all products for mapping
    const { data: allProducts } = await supabase
      .from('products')
      .select('id, product_number')
      .eq('bakery_id', bakeryId)
      .eq('category_id', categoryId)
    
    allProducts?.forEach(p => productMap.set(p.product_number, p.id))
  }
  
  // 2. Upsert customers
  const customerMap = new Map<string, string>() // customerNumber -> id
  
  if (customers.length > 0) {
    const customerUpserts = customers.map(c => ({
      bakery_id: bakeryId,
      customer_number: c.customerNumber,
      name: c.name,
      address: c.address || null,
      is_active: true,
    }))
    
    const { error: custError } = await supabase
      .from('customers')
      .upsert(customerUpserts, { 
        onConflict: 'bakery_id,customer_number',
        ignoreDuplicates: false 
      })
    
    if (custError) {
      console.error('Customer upsert error:', custError)
      throw new Error(`Feil ved import av kunder: ${custError.message}`)
    }
    
    // Fetch all customers for mapping
    const { data: allCustomers } = await supabase
      .from('customers')
      .select('id, customer_number')
      .eq('bakery_id', bakeryId)
    
    allCustomers?.forEach(c => customerMap.set(c.customer_number, c.id))
  }
  
  // 3. Create orders
  let ordersCreated = 0
  
  if (orders.length > 0) {
    const orderInserts: Array<{
      bakery_id: string
      category_id: string
      trip_id: string | null
      customer_id: string
      product_id: string
      delivery_date: string
      quantity: number
    }> = []
    
    for (const order of orders) {
      const customerId = customerMap.get(order.customerNumber)
      if (!customerId) {
        console.warn(`Customer not found: ${order.customerNumber}`)
        continue
      }
      
      for (const product of order.products) {
        const productId = productMap.get(product.productNumber)
        if (!productId) {
          console.warn(`Product not found: ${product.productNumber}`)
          continue
        }
        
        orderInserts.push({
          bakery_id: bakeryId,
          category_id: categoryId,
          trip_id: tripId,
          customer_id: customerId,
          product_id: productId,
          delivery_date: order.deliveryDate,
          quantity: product.quantity,
        })
      }
    }
    
    if (orderInserts.length > 0) {
      // Insert in batches
      const batchSize = 500
      for (let i = 0; i < orderInserts.length; i += batchSize) {
        const batch = orderInserts.slice(i, i + batchSize)
        
        const { data: insertedOrders, error: orderError } = await supabase
          .from('orders')
          .insert(batch)
          .select('id')
        
        if (orderError) {
          console.error('Order insert error:', orderError)
          throw new Error(`Feil ved import av ordrer: ${orderError.message}`)
        }
        
        // Create packing_status for each order
        if (insertedOrders) {
          const packingInserts = insertedOrders.map(o => ({
            order_id: o.id,
            status: 'pending' as const,
          }))
          
          await supabase.from('packing_status').insert(packingInserts)
          ordersCreated += insertedOrders.length
        }
      }
    }
  }
  
  // 4. Create import batch record
  const { error: batchError } = await supabase
    .from('import_batches')
    .insert({
      bakery_id: bakeryId,
      category_id: categoryId,
      trip_id: tripId,
      delivery_date: deliveryDate,
      products_count: products.length,
      customers_count: customers.length,
      orders_count: ordersCreated,
    })
  
  if (batchError) {
    console.error('Import batch error:', batchError)
    // Non-fatal, continue
  }
  
  return {
    productsCount: products.length,
    customersCount: customers.length,
    ordersCount: ordersCreated,
  }
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    
    const { categoryId, tripId, cronTriggered } = await req.json()

    // Check if cron-triggered
    const cronSecret = req.headers.get('X-Cron-Secret')
    const expectedCronSecret = Deno.env.get('CRON_SECRET')
    const isCronCall = cronTriggered && cronSecret === expectedCronSecret

    let supabase: ReturnType<typeof createClient>
    let userId: string | null = null

    if (isCronCall) {
      console.log('Sync triggered by cron job')
      supabase = createClient(supabaseUrl, supabaseServiceKey)
    } else {
      const authHeader = req.headers.get('Authorization')
      if (!authHeader?.startsWith('Bearer ')) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized - Missing authorization header' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } }
      })

      const token = authHeader.replace('Bearer ', '')
      const { data: claimsData, error: claimsError } = await supabase.auth.getUser(token)
      
      if (claimsError || !claimsData?.user) {
        console.error('Auth error:', claimsError?.message)
        return new Response(
          JSON.stringify({ error: 'Unauthorized - Invalid token' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      userId = claimsData.user.id
      console.log(`Sync triggered by user: ${userId}`)
    }

    if (!categoryId) {
      return new Response(
        JSON.stringify({ error: 'categoryId er påkrevd' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get OneDrive config
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

    // For manual calls, verify user has access
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

    // Get bakery settings
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

    // Get already imported dates
    const { data: importBatches } = await supabase
      .from('import_batches')
      .select('delivery_date')
      .eq('bakery_id', config.bakery_id)
      .eq('category_id', categoryId)
    
    const importedDates = new Set((importBatches || []).map(b => b.delivery_date))

    console.log(`Sync for category ${categoryId}, cutoff: ${cutoffDateStr}, imported dates: ${importedDates.size}`)

    // Update sync status
    await supabase
      .from('category_onedrive_config')
      .update({ sync_status: 'syncing', sync_error: null })
      .eq('id', config.id)

    // Use service role for database operations during sync
    const serviceSupabase = createClient(supabaseUrl, supabaseServiceKey)

    try {
      // Get Microsoft Graph access token
      const accessToken = await getGraphAccessToken()
      console.log('Successfully obtained Azure AD access token')

      // Get files from OneDrive folder (now returns driveId + files)
      const { driveId, files } = await getFilesInFolder(accessToken, config.onedrive_folder_url)
      console.log(`Found ${files.length} items in OneDrive folder (driveId: ${driveId})`)

      // Filter to only relevant file types
      const relevantFiles = files.filter(f => {
        const ext = f.name.toLowerCase()
        return ext.endsWith('.prd') || ext.endsWith('.cus') || ext.endsWith('.od0')
      })

      console.log(`Found ${relevantFiles.length} relevant files (.PRD, .CUS, .OD0)`)

      // Categorize files
      const prdFiles = relevantFiles.filter(f => f.name.toLowerCase().endsWith('.prd'))
      const cusFiles = relevantFiles.filter(f => f.name.toLowerCase().endsWith('.cus'))
      const od0Files = relevantFiles.filter(f => f.name.toLowerCase().endsWith('.od0'))

      // Track all files to delete after successful import
      const filesToDelete: { id: string; name: string }[] = []
      
      // Parse products first (step 1)
      let allProducts: ParsedProduct[] = []
      const allErrors: string[] = []

      for (const file of prdFiles) {
        console.log(`Processing product file: ${file.name}`)
        const content = await downloadFileContent(accessToken, driveId, file.id, file.name)
        const { products, errors } = parsePrdFile(content)
        allProducts = [...allProducts, ...products]
        allErrors.push(...errors.map(e => `${file.name}: ${e}`))
        
        // Mark PRD files for deletion if configured
        if (config.delete_after_import) {
          filesToDelete.push({ id: file.id, name: file.name })
        }
      }

      // Parse customers second (step 2)
      let allCustomers: ParsedCustomer[] = []

      for (const file of cusFiles) {
        console.log(`Processing customer file: ${file.name}`)
        const content = await downloadFileContent(accessToken, driveId, file.id, file.name)
        const { customers, errors } = parseCusFile(content)
        allCustomers = [...allCustomers, ...customers]
        allErrors.push(...errors.map(e => `${file.name}: ${e}`))
        
        // Mark CUS files for deletion if configured
        if (config.delete_after_import) {
          filesToDelete.push({ id: file.id, name: file.name })
        }
      }

      // Process order files third (step 3)
      let totalOrdersImported = 0
      const processedFiles: string[] = []

      for (const file of od0Files) {
        console.log(`Processing order file: ${file.name}`)
        
        // Extract date from filename
        const deliveryDate = extractDateFromFilename(file.name)
        
        if (!deliveryDate) {
          console.warn(`Could not extract date from filename: ${file.name}`)
          allErrors.push(`${file.name}: Kunne ikke ekstrahere dato fra filnavn`)
          continue
        }

        // Skip if date is too old
        if (deliveryDate < cutoffDateStr) {
          console.log(`Skipping ${file.name}: date ${deliveryDate} is before cutoff ${cutoffDateStr}`)
          continue
        }

        // Skip if already imported
        if (importedDates.has(deliveryDate)) {
          console.log(`Skipping ${file.name}: date ${deliveryDate} already imported`)
          continue
        }

        const content = await downloadFileContent(accessToken, driveId, file.id, file.name)
        const { orders, errors } = parseOd0File(content)
        allErrors.push(...errors.map(e => `${file.name}: ${e}`))

        if (orders.length > 0) {
          // Import data
          const result = await importData(
            serviceSupabase,
            config.bakery_id,
            categoryId,
            allProducts,
            allCustomers,
            orders,
            deliveryDate
          )
          
          totalOrdersImported += result.ordersCount
          processedFiles.push(file.name)
          
          // Mark OD0 file for deletion if configured
          if (config.delete_after_import) {
            filesToDelete.push({ id: file.id, name: file.name })
          }
        }
      }

      // Delete all processed files after successful import
      let filesDeletedCount = 0
      for (const file of filesToDelete) {
        try {
          await deleteFile(accessToken, driveId, file.id)
          console.log(`Deleted file: ${file.name}`)
          filesDeletedCount++
        } catch (deleteError) {
          console.error(`Failed to delete ${file.name}:`, deleteError)
          allErrors.push(`Kunne ikke slette ${file.name} fra OneDrive`)
        }
      }

      // Update sync status to completed
      await supabase
        .from('category_onedrive_config')
        .update({ 
          sync_status: 'completed',
          last_sync_at: new Date().toISOString(),
          sync_error: allErrors.length > 0 ? allErrors.slice(0, 5).join('; ') : null
        })
        .eq('id', config.id)

      return new Response(
        JSON.stringify({ 
          success: true,
          message: `Synkronisering fullført`,
          stats: {
            productsFound: allProducts.length,
            customersFound: allCustomers.length,
            ordersImported: totalOrdersImported,
            filesProcessed: processedFiles.length,
            filesDeleted: filesDeletedCount,
          },
          processedFiles,
          errors: allErrors.length > 0 ? allErrors : undefined,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )

    } catch (syncError) {
      const errorMessage = syncError instanceof Error ? syncError.message : 'Ukjent feil under synkronisering'
      console.error('Sync operation error:', errorMessage)
      
      // Update status to error
      await supabase
        .from('category_onedrive_config')
        .update({ 
          sync_status: 'error',
          sync_error: errorMessage
        })
        .eq('id', config.id)

      return new Response(
        JSON.stringify({ error: errorMessage }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Ukjent feil under synkronisering'
    console.error('Sync error:', errorMessage)
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
