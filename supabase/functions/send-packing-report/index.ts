import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { Resend } from 'npm:resend@4.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface EmailReportConfig {
  enabled: boolean;
  frequency: 'off' | 'daily' | 'weekly' | 'monthly';
  recipients: string[];
  include_deviations: boolean;
  include_summary: boolean;
  send_time?: string; // HH:MM format
  last_sent_at?: string;
}

interface BakerySettings {
  email_report_config?: EmailReportConfig;
}

interface DeviationData {
  customer_name: string;
  product_name: string;
  deviation_type: string;
  deviation_note: string;
  delivery_date: string;
}

interface PackingSummary {
  total_orders: number;
  packed_orders: number;
  deviation_orders: number;
  pending_orders: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY is not configured');
    }

    const resend = new Resend(resendApiKey);
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let bakeryId: string | null = null;
    let isTest = false;
    let isCron = false;

    // Check if this is a manual test or cron job
    if (req.method === 'POST') {
      try {
        const body = await req.json();
        bakeryId = body.bakery_id || null;
        isTest = body.is_test || false;
      } catch {
        // No body, assume cron job
        isCron = true;
      }
    }

    const results: { bakery: string; success: boolean; error?: string }[] = [];

    if (bakeryId && isTest) {
      // Single bakery test report
      const result = await sendReportForBakery(supabase, resend, bakeryId, true);
      results.push(result);
    } else {
      // Cron job: process all bakeries with enabled email reports
      const { data: bakeries, error: bakeriesError } = await supabase
        .from('bakeries')
        .select('id, name, settings')
        .eq('is_active', true);

      if (bakeriesError) {
        throw bakeriesError;
      }

      const now = new Date();
      
      for (const bakery of bakeries || []) {
        const settings = bakery.settings as BakerySettings | null;
        const config = settings?.email_report_config;
        
        if (!config?.enabled || config.frequency === 'off' || !config.recipients?.length) {
          continue;
        }

        // Check if it's time to send based on frequency
        if (!shouldSendReport(config, now)) {
          continue;
        }

        const result = await sendReportForBakery(supabase, resend, bakery.id, false);
        results.push(result);

        // Update last_sent_at on success
        if (result.success) {
          const newConfig = { ...config, last_sent_at: now.toISOString() };
          await supabase
            .from('bakeries')
            .update({ 
              settings: { 
                ...settings, 
                email_report_config: newConfig 
              } 
            })
            .eq('id', bakery.id);
        }
      }
    }

    console.log('Email report results:', results);

    return new Response(
      JSON.stringify({ success: true, results }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in send-packing-report:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function shouldSendReport(config: EmailReportConfig, now: Date): boolean {
  const lastSent = config.last_sent_at ? new Date(config.last_sent_at) : null;
  const currentHour = now.getHours();
  
  // Parse configured send time (default to 06:00)
  const sendTimeStr = config.send_time || '06:00';
  const [sendHour] = sendTimeStr.split(':').map(Number);
  
  // Only send at the configured hour (with 5-minute tolerance since cron runs every 5 mins)
  if (currentHour !== sendHour) {
    return false;
  }

  // If never sent, send now
  if (!lastSent) {
    return true;
  }

  const hoursSinceLastSent = (now.getTime() - lastSent.getTime()) / (1000 * 60 * 60);

  switch (config.frequency) {
    case 'daily':
      // At least 20 hours since last send
      return hoursSinceLastSent >= 20;
    
    case 'weekly':
      // Monday (day 1) and at least 6 days since last send
      return now.getDay() === 1 && hoursSinceLastSent >= 144;
    
    case 'monthly':
      // First of month and at least 25 days since last send
      return now.getDate() === 1 && hoursSinceLastSent >= 600;
    
    default:
      return false;
  }
}

async function sendReportForBakery(
  supabase: ReturnType<typeof createClient>,
  resend: Resend,
  bakeryId: string,
  isTest: boolean
): Promise<{ bakery: string; success: boolean; error?: string }> {
  try {
    // Get bakery info and settings
    const { data: bakery, error: bakeryError } = await supabase
      .from('bakeries')
      .select('id, name, settings')
      .eq('id', bakeryId)
      .single();

    if (bakeryError || !bakery) {
      throw new Error(`Bakery not found: ${bakeryId}`);
    }

    const settings = bakery.settings as BakerySettings | null;
    const config = settings?.email_report_config;

    if (!config?.recipients?.length) {
      throw new Error('No recipients configured');
    }

    // Calculate date range based on frequency
    const { startDate, endDate, periodLabel } = getReportPeriod(config.frequency, isTest);

    // Fetch packing data
    const { data: ordersData, error: ordersError } = await supabase
      .from('orders')
      .select(`
        id,
        delivery_date,
        quantity,
        customers!inner(name),
        products!inner(name),
        packing_status(status, deviation_type, deviation_note)
      `)
      .eq('bakery_id', bakeryId)
      .gte('delivery_date', startDate)
      .lte('delivery_date', endDate);

    if (ordersError) {
      throw ordersError;
    }

    const orders = ordersData || [];

    // Calculate summary
    const summary: PackingSummary = {
      total_orders: orders.length,
      packed_orders: orders.filter(o => o.packing_status?.status === 'packed').length,
      deviation_orders: orders.filter(o => o.packing_status?.status === 'deviation').length,
      pending_orders: orders.filter(o => !o.packing_status || o.packing_status.status === 'pending').length,
    };

    // Collect deviations
    const deviations: DeviationData[] = orders
      .filter(o => o.packing_status?.status === 'deviation')
      .map(o => ({
        customer_name: (o.customers as { name: string }).name,
        product_name: (o.products as { name: string }).name,
        deviation_type: o.packing_status?.deviation_type || 'other',
        deviation_note: o.packing_status?.deviation_note || '',
        delivery_date: o.delivery_date,
      }));

    // Generate HTML email
    const html = generateEmailHtml(bakery.name, periodLabel, summary, deviations, config, isTest);

    // Send email
    const { error: sendError } = await resend.emails.send({
      from: 'Loaf & Load <noreply@resend.dev>',
      to: config.recipients,
      subject: isTest 
        ? `[TEST] Pakkerapport - ${bakery.name}` 
        : `Pakkerapport - ${bakery.name} - ${periodLabel}`,
      html,
    });

    if (sendError) {
      throw sendError;
    }

    console.log(`Report sent for bakery ${bakery.name} to ${config.recipients.join(', ')}`);

    return { bakery: bakery.name, success: true };
  } catch (error) {
    console.error(`Error sending report for bakery ${bakeryId}:`, error);
    return { 
      bakery: bakeryId, 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

function getReportPeriod(frequency: string, isTest: boolean): { startDate: string; endDate: string; periodLabel: string } {
  const now = new Date();
  let start: Date;
  let end: Date;
  let label: string;

  if (isTest) {
    // For test, use today
    start = new Date(now);
    start.setHours(0, 0, 0, 0);
    end = new Date(now);
    end.setHours(23, 59, 59, 999);
    label = formatDate(now);
  } else {
    switch (frequency) {
      case 'daily':
        // Yesterday
        start = new Date(now);
        start.setDate(start.getDate() - 1);
        start.setHours(0, 0, 0, 0);
        end = new Date(start);
        end.setHours(23, 59, 59, 999);
        label = formatDate(start);
        break;

      case 'weekly':
        // Last 7 days
        end = new Date(now);
        end.setDate(end.getDate() - 1);
        end.setHours(23, 59, 59, 999);
        start = new Date(end);
        start.setDate(start.getDate() - 6);
        start.setHours(0, 0, 0, 0);
        label = `${formatDate(start)} - ${formatDate(end)}`;
        break;

      case 'monthly':
        // Previous month
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        label = start.toLocaleDateString('nb-NO', { month: 'long', year: 'numeric' });
        break;

      default:
        start = new Date(now);
        end = new Date(now);
        label = formatDate(now);
    }
  }

  return {
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0],
    periodLabel: label,
  };
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('nb-NO', { 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric' 
  });
}

function getDeviationTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    shortage: 'Manko',
    damaged: 'Skadet',
    wrong_product: 'Feil produkt',
    other: 'Annet',
  };
  return labels[type] || type;
}

function generateEmailHtml(
  bakeryName: string,
  periodLabel: string,
  summary: PackingSummary,
  deviations: DeviationData[],
  config: EmailReportConfig,
  isTest: boolean
): string {
  const completionRate = summary.total_orders > 0 
    ? Math.round(((summary.packed_orders + summary.deviation_orders) / summary.total_orders) * 100) 
    : 0;
  
  const deviationRate = summary.total_orders > 0 
    ? ((summary.deviation_orders / summary.total_orders) * 100).toFixed(1)
    : '0.0';

  let html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pakkerapport</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
  <div style="background-color: #ffffff; border-radius: 8px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    
    ${isTest ? '<div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 4px; padding: 12px; margin-bottom: 24px; text-align: center;"><strong>⚠️ Dette er en testrapport</strong></div>' : ''}
    
    <h1 style="color: #1f2937; margin: 0 0 8px 0; font-size: 24px;">📊 Pakkerapport</h1>
    <h2 style="color: #6b7280; margin: 0 0 24px 0; font-size: 16px; font-weight: normal;">${bakeryName}</h2>
    <p style="color: #6b7280; margin: 0 0 24px 0;">Periode: <strong>${periodLabel}</strong></p>
  `;

  if (config.include_summary) {
    html += `
    <div style="background-color: #f3f4f6; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
      <h3 style="color: #374151; margin: 0 0 16px 0; font-size: 16px;">Sammendrag</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Totalt ordrer:</td>
          <td style="padding: 8px 0; text-align: right; font-weight: bold;">${summary.total_orders}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Pakket:</td>
          <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #10b981;">${summary.packed_orders}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Avvik:</td>
          <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #ef4444;">${summary.deviation_orders} (${deviationRate}%)</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Venter:</td>
          <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #f59e0b;">${summary.pending_orders}</td>
        </tr>
        <tr style="border-top: 1px solid #e5e7eb;">
          <td style="padding: 12px 0 0 0; color: #374151; font-weight: bold;">Fullføringsrate:</td>
          <td style="padding: 12px 0 0 0; text-align: right; font-weight: bold; font-size: 18px; color: ${completionRate >= 95 ? '#10b981' : completionRate >= 80 ? '#f59e0b' : '#ef4444'};">${completionRate}%</td>
        </tr>
      </table>
    </div>
    `;
  }

  if (config.include_deviations && deviations.length > 0) {
    html += `
    <div style="margin-bottom: 24px;">
      <h3 style="color: #374151; margin: 0 0 16px 0; font-size: 16px;">Avviksdetaljer</h3>
      <table style="width: 100%; border-collapse: collapse; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
        <thead>
          <tr style="background-color: #f9fafb;">
            <th style="padding: 12px; text-align: left; font-size: 12px; font-weight: 600; color: #6b7280; border-bottom: 1px solid #e5e7eb;">Kunde</th>
            <th style="padding: 12px; text-align: left; font-size: 12px; font-weight: 600; color: #6b7280; border-bottom: 1px solid #e5e7eb;">Produkt</th>
            <th style="padding: 12px; text-align: left; font-size: 12px; font-weight: 600; color: #6b7280; border-bottom: 1px solid #e5e7eb;">Type</th>
            <th style="padding: 12px; text-align: left; font-size: 12px; font-weight: 600; color: #6b7280; border-bottom: 1px solid #e5e7eb;">Notat</th>
          </tr>
        </thead>
        <tbody>
    `;

    for (const deviation of deviations) {
      html += `
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-size: 14px;">${deviation.customer_name}</td>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-size: 14px;">${deviation.product_name}</td>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-size: 14px;">
              <span style="background-color: #fef2f2; color: #dc2626; padding: 2px 8px; border-radius: 4px; font-size: 12px;">${getDeviationTypeLabel(deviation.deviation_type)}</span>
            </td>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-size: 14px; color: #6b7280;">${deviation.deviation_note || '-'}</td>
          </tr>
      `;
    }

    html += `
        </tbody>
      </table>
    </div>
    `;
  } else if (config.include_deviations) {
    html += `
    <div style="background-color: #d1fae5; border-radius: 8px; padding: 20px; margin-bottom: 24px; text-align: center;">
      <p style="color: #065f46; margin: 0;">✅ Ingen avvik registrert i denne perioden</p>
    </div>
    `;
  }

  html += `
    <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 24px;">
      <p style="color: #9ca3af; font-size: 12px; margin: 0; text-align: center;">
        Denne rapporten ble generert automatisk av Loaf & Load.
      </p>
    </div>
  </div>
</body>
</html>
  `;

  return html;
}
