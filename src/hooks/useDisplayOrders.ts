import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

function normalizePackingStatus<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

export interface DisplayOrder {
  id: string;
  quantity: number;
  customer: {
    id: string;
    name: string;
    customer_number: string;
  };
  product: {
    id: string;
    name: string;
    product_number: string;
    pieces_per_tray: number | null;
  };
  packing_status: {
    status: 'pending' | 'packed' | 'deviation';
    packed_at: string | null;
  } | null;
}

export interface CustomerDisplayData {
  customer: {
    id: string;
    name: string;
    customer_number: string;
  };
  orders: DisplayOrder[];
  packedCount: number;
  totalCount: number;
  progress: number;
}

// Fetch all orders for a bakery/category on a specific date
export function useDisplayOrders(
  bakeryId: string | null,
  categoryId: string | null,
  deliveryDate: string
) {
  return useQuery({
    queryKey: ['display-orders', bakeryId, categoryId, deliveryDate],
    queryFn: async () => {
      if (!bakeryId) return [];

      let query = supabase
        .from('orders')
        .select(`
          id,
          quantity,
          customer:customers!inner(id, name, customer_number),
          product:products!inner(id, name, product_number, pieces_per_tray, category_id),
          packing_status(status, packed_at)
        `)
        .eq('bakery_id', bakeryId)
        .eq('delivery_date', deliveryDate);

      if (categoryId) {
        query = query.eq('product.category_id', categoryId);
      }

      const { data, error } = await query.order('customer_id');

      if (error) throw error;

       return (data || []).map((order) => ({
         ...order,
         packing_status: normalizePackingStatus(order.packing_status),
       })) as DisplayOrder[];
    },
    enabled: !!bakeryId && !!deliveryDate,
    refetchInterval: 60000, // Fallback refetch every 60s
  });
}

// Get grouped customer data for shared display
export function useCustomerDisplayData(
  bakeryId: string | null,
  categoryId: string | null,
  deliveryDate: string
) {
  const { data: orders = [], ...rest } = useDisplayOrders(bakeryId, categoryId, deliveryDate);

  // Group orders by customer
  const customerMap = new Map<string, CustomerDisplayData>();

  orders.forEach((order) => {
    const customerId = order.customer.id;
    
    if (!customerMap.has(customerId)) {
      customerMap.set(customerId, {
        customer: order.customer,
        orders: [],
        packedCount: 0,
        totalCount: 0,
        progress: 0,
      });
    }

    const customerData = customerMap.get(customerId)!;
    customerData.orders.push(order);
    customerData.totalCount++;

    if (order.packing_status?.status === 'packed' || order.packing_status?.status === 'deviation') {
      customerData.packedCount++;
    }
  });

  // Calculate progress for each customer
  customerMap.forEach((data) => {
    data.progress = data.totalCount > 0 ? Math.round((data.packedCount / data.totalCount) * 100) : 0;
  });

  const customers = Array.from(customerMap.values()).sort((a, b) => 
    a.customer.name.localeCompare(b.customer.name, 'nb')
  );

  const totalProgress = orders.length > 0
    ? Math.round(
        (orders.filter((o) => o.packing_status?.status === 'packed' || o.packing_status?.status === 'deviation').length /
          orders.length) *
          100
      )
    : 0;

  return {
    customers,
    totalProgress,
    totalOrders: orders.length,
    packedOrders: orders.filter((o) => o.packing_status?.status === 'packed' || o.packing_status?.status === 'deviation').length,
    ...rest,
  };
}

// Fetch customer by display token (for customer-specific displays)
export function useCustomerByToken(displayToken: string | null) {
  return useQuery({
    queryKey: ['customer-by-token', displayToken],
    queryFn: async () => {
      if (!displayToken) return null;

      const { data, error } = await supabase
        .from('customers')
        .select('id, name, customer_number, bakery_id, has_dedicated_display')
        .eq('display_token', displayToken)
        .eq('has_dedicated_display', true)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!displayToken,
  });
}

// Fetch orders for a specific customer display
export function useCustomerDisplayOrders(
  customerId: string | null,
  bakeryId: string | null,
  deliveryDate: string
) {
  return useQuery({
    queryKey: ['customer-display-orders', customerId, deliveryDate],
    queryFn: async () => {
      if (!customerId || !bakeryId) return [];

      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          quantity,
          customer:customers!inner(id, name, customer_number),
          product:products!inner(id, name, product_number, pieces_per_tray),
          packing_status(status, packed_at)
        `)
        .eq('bakery_id', bakeryId)
        .eq('customer_id', customerId)
        .eq('delivery_date', deliveryDate);

      if (error) throw error;

       return (data || []).map((order) => ({
         ...order,
         packing_status: normalizePackingStatus(order.packing_status),
       })) as DisplayOrder[];
    },
    enabled: !!customerId && !!bakeryId && !!deliveryDate,
    refetchInterval: 60000,
  });
}

// Fetch the latest order date for a specific customer
export function useLatestOrderDate(
  customerId: string | null,
  bakeryId: string | null
) {
  return useQuery({
    queryKey: ['latest-order-date', customerId, bakeryId],
    queryFn: async () => {
      if (!customerId || !bakeryId) return null;

      const { data, error } = await supabase
        .from('orders')
        .select('delivery_date')
        .eq('bakery_id', bakeryId)
        .eq('customer_id', customerId)
        .order('delivery_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data?.delivery_date || null;
    },
    enabled: !!customerId && !!bakeryId,
  });
}

export type DisplayType = 'shared' | 'customer' | 'packing';

export const DISPLAY_TYPES: Record<DisplayType, { label: string; description: string }> = {
  shared: {
    label: 'Felles Display',
    description: 'Storskjerm i produksjonen som viser alle kunder og deres pakkestatus',
  },
  customer: {
    label: 'Kunde Display',
    description: 'Dedikert skjerm for enkelt kunde som viser deres produkter og status',
  },
  packing: {
    label: 'Pakkedisplay',
    description: 'Touch-optimalisert visning for pakkere som jobber med ordrer',
  },
};

export type CustomerSortMode = 'name' | 'progress' | 'customer_number';
export type CustomerSortDirection = 'asc' | 'desc';
export type ThemePreset = 'dark' | 'light' | 'high-contrast' | 'bakery-gold' | 'industrial' | 'minimalist' | 'ocean' | 'forest' | 'coffee' | 'wine' | 'sunrise' | 'custom';

export interface DisplaySettings {
  // Topptekst (Header)
  header_show_bakery_name: boolean;
  header_show_category_name: boolean;
  header_show_clock: boolean;
  header_show_date: boolean;
  header_bakery_font_size: string;
  header_category_font_size: string;
  header_clock_font_size: string;
  header_date_font_size: string;
  header_clock_format: '12h' | '24h';
  
  // Statistikk-kort (Stats card)
  stats_show_total_progress: boolean;
  stats_show_packed_count: boolean;
  stats_show_remaining_count: boolean;
  stats_progress_bar_style: 'bar' | 'circle' | 'none';
  stats_progress_bar_height: string;
  stats_label_font_size: string;
  stats_value_font_size: string;
  
  // Kundekort (Customer cards)
  card_show_customer_number: boolean;
  card_show_product_list: boolean;
  card_show_product_numbers: boolean;
  card_show_quantity_as_trays: boolean;
  card_show_individual_progress: boolean;
  card_compact_mode: boolean;
  card_customer_name_font_size: string;
  card_product_font_size: string;
  card_quantity_font_size: string;
  card_progress_font_size: string;
  
  // Utseende (Appearance)
  background_color: string;
  card_background_color: string;
  text_color: string;
  pending_color: string;
  packing_color: string;
  completed_color: string;
  border_radius: string;
  card_border_width: string;
  theme_preset: ThemePreset;
  
  // Layout & Scroll
  columns: number;
  gap_size: string;
  padding: string;
  customer_name_font_size: string;
  product_font_size: string;
  auto_scroll_enabled: boolean;
  auto_scroll_speed: 'slow' | 'medium' | 'fast';
  auto_scroll_pause_on_hover: boolean;
  
  // Sortering (Sorting)
  customer_sort_mode: CustomerSortMode;
  customer_sort_direction: CustomerSortDirection;
  customer_sort_completed_last: boolean;
  
  // Animasjoner (Animations)
  animation_enabled: boolean;
  animation_speed: 'fast' | 'normal' | 'slow';
  animation_on_status_change: boolean;
  animation_highlight_new: boolean;
  animation_highlight_duration: number;
  
  // Sanntid & Status (Realtime & Status)
  realtime_show_connection_status: boolean;
  realtime_show_last_update: boolean;
  realtime_auto_refresh_interval: number;
  realtime_sound_on_complete: boolean;
  realtime_flash_on_update: boolean;
  realtime_status_font_size: string;
  
  // Produktbasert pakking (Product-based packing)
  product_line_colors_enabled: boolean;
  product_line_colors_palette: string[];
  
  // Fullskjerm & Wake Lock
  fullscreen_button_visible: boolean;
  wake_lock_enabled: boolean;
  
  // Visningsmodus (pakkedisplay)
  packing_view_mode: 'cards' | 'table';
  
  // Språk (Language)
  packing_language: 'nb' | 'en';
  
  // Tabell-spesifikke innstillinger
  table_row_height: 'compact' | 'normal' | 'touch';
  table_font_size: string;
  table_show_customer_number: boolean;
  table_show_progress_bar: boolean;
  table_show_order_count: boolean;
  table_alternate_rows: boolean;
  table_alternate_row_color: string;
  table_sticky_header: boolean;
  table_touch_row_spacing: string;
  
  // Nye tabell-forbedringer
  table_header_background_color: string;
  table_header_text_color: string;
  table_header_font_size: string;
  table_show_status_icons: boolean;
  table_customer_name_font_weight: 'normal' | 'medium' | 'semibold' | 'bold';
  table_touch_tap_feedback: boolean;
  table_progress_bar_height: string;
  table_row_hover_effect: boolean;
  table_compact_on_mobile: boolean;
  table_show_total_quantity: boolean;
  table_quantity_position: 'inline' | 'separate';
  table_border_style: 'none' | 'subtle' | 'full';
  table_selection_color: string;
  table_row_click_to_pack: boolean;
  
  // Nye innstillinger for antalls-visning
  table_quantity_display_size: 'small' | 'medium' | 'large' | 'huge';
  table_quantity_font_weight: 'normal' | 'bold';
  table_quantity_background_color: string;
  table_quantity_text_color: string;
  table_quantity_show_label: boolean;
  table_quantity_border_style: 'none' | 'outline' | 'filled';
  
  // Status-kolonne innstillinger
  table_show_status: boolean;
  table_status_font_size: string;
  table_status_badge_style: 'filled' | 'outline' | 'minimal';
  table_status_badge_padding: string;
  
  // Pil/chevron-innstillinger
  table_show_chevron: boolean;
  table_chevron_size: 'small' | 'medium' | 'large';
  
  // Kundenavn-innstillinger
  table_customer_name_font_size: string;
  
  // Kolonnebredder
  table_order_column_width: string;
  table_progress_column_width: string;
  table_status_column_width: string;
  
  // Produktkort-innstillinger (når kunden pakkes)
  product_card_layout: 'horizontal' | 'vertical';
  product_card_name_font_size: string;
  product_card_name_font_weight: 'normal' | 'medium' | 'semibold' | 'bold';
  product_card_show_product_number: boolean;
  product_card_product_number_font_size: string;
  product_card_quantity_size: 'small' | 'medium' | 'large' | 'huge';
  product_card_quantity_position: 'left' | 'right' | 'center';
  product_card_quantity_style: 'plain' | 'box' | 'circle' | 'pill';
  product_card_quantity_background_color: string;
  product_card_quantity_text_color: string;
  product_card_show_tray_format: boolean;
  product_card_tray_label: string;
  product_card_show_total_pieces: boolean;
  product_card_pieces_label: string;
  product_card_min_height: string;
  product_card_padding: string;
  product_card_gap: string;
  product_card_border_radius: string;
  product_card_border_width: string;
  product_card_show_status_badge: boolean;
  product_card_button_size: 'normal' | 'large' | 'huge';
  product_card_button_style: 'full' | 'icon-only' | 'compact';
  product_card_alternate_rows: boolean;
  product_card_alternate_color: string;
  product_card_packed_style: 'strikethrough' | 'fade' | 'collapse';
  product_card_animation_enabled: boolean;
  
  // Pakke-knapp innstillinger
  pack_button_text: string;
  pack_button_background_color: string;
  pack_button_text_color: string;
  pack_button_border_radius: string;
  pack_button_size: 'normal' | 'large' | 'huge';
  pack_button_show_icon: boolean;
  
  // Tilbakeknapp-innstillinger
  back_button_show: boolean;
  back_button_size: 'small' | 'medium' | 'large' | 'huge';
  back_button_style: 'icon' | 'icon-circle' | 'icon-square' | 'text' | 'text-icon';
  back_button_background_color: string;
  back_button_icon_color: string;
  back_button_text: string;
  
  // Oppdateringsknapp-innstillinger
  refresh_button_show: boolean;
  refresh_button_size: 'small' | 'medium' | 'large' | 'huge';
  refresh_button_style: 'icon' | 'icon-circle' | 'icon-square' | 'text' | 'text-icon';
  refresh_button_background_color: string;
  refresh_button_icon_color: string;
  refresh_button_text: string;
  
  // Låsefunksjon (Customer locking)
  lock_enabled: boolean;
  lock_show_indicator: boolean;
  lock_indicator_style: 'badge' | 'icon' | 'border' | 'overlay';
  lock_my_lock_color: string;
  lock_other_lock_color: string;
  lock_show_locked_by_text: boolean;
  lock_locked_by_you_text: string;
  lock_locked_by_other_text: string;
  lock_fade_locked_cards: boolean;
  lock_block_locked_cards: boolean;
  
  // Legacy support
  show_progress_bar: boolean;
  progress_bar_style: string;
  show_clock: boolean;
  show_date: boolean;
}

export function getDefaultDisplaySettings(): DisplaySettings {
  return {
    // Topptekst
    header_show_bakery_name: true,
    header_show_category_name: true,
    header_show_clock: true,
    header_show_date: true,
    header_bakery_font_size: '1.875rem',
    header_category_font_size: '1.25rem',
    header_clock_font_size: '1.5rem',
    header_date_font_size: '1.25rem',
    header_clock_format: '24h',
    
    // Statistikk-kort
    stats_show_total_progress: true,
    stats_show_packed_count: true,
    stats_show_remaining_count: true,
    stats_progress_bar_style: 'bar',
    stats_progress_bar_height: '1rem',
    stats_label_font_size: '1rem',
    stats_value_font_size: '1.5rem',
    
    // Kundekort
    card_show_customer_number: false,
    card_show_product_list: true,
    card_show_product_numbers: false,
    card_show_quantity_as_trays: true,
    card_show_individual_progress: true,
    card_compact_mode: false,
    card_customer_name_font_size: '1.5rem',
    card_product_font_size: '1rem',
    card_quantity_font_size: '1rem',
    card_progress_font_size: '0.875rem',
    
    // Utseende
    background_color: '#1a1a2e',
    card_background_color: '#16213e',
    text_color: '#ffffff',
    pending_color: '#6b7280',
    packing_color: '#f59e0b',
    completed_color: '#22c55e',
    border_radius: '0.75rem',
    card_border_width: '4px',
    theme_preset: 'dark',
    
    // Layout & Scroll
    columns: 3,
    gap_size: '1rem',
    padding: '1.5rem',
    customer_name_font_size: '2rem',
    product_font_size: '1rem',
    auto_scroll_enabled: false,
    auto_scroll_speed: 'medium',
    auto_scroll_pause_on_hover: true,
    
    // Sortering
    customer_sort_mode: 'name',
    customer_sort_direction: 'asc',
    customer_sort_completed_last: true,
    
    // Animasjoner
    animation_enabled: true,
    animation_speed: 'normal',
    animation_on_status_change: true,
    animation_highlight_new: true,
    animation_highlight_duration: 3000,
    
    // Sanntid & Status
    realtime_show_connection_status: true,
    realtime_show_last_update: false,
    realtime_auto_refresh_interval: 60,
    realtime_sound_on_complete: false,
    realtime_flash_on_update: true,
    realtime_status_font_size: '0.875rem',
    
    // Produktbasert pakking
    product_line_colors_enabled: true,
    product_line_colors_palette: [
      '#DBEAFE', // Lys blå (Horten-stil)
      '#D1FAE5', // Lys grønn (Loff-stil)
      '#FEF3C7', // Lys gul/beige (Formloff-stil)
      '#FCE7F3', // Lys rosa
      '#E0E7FF', // Lys indigo
      '#CCFBF1', // Lys teal
      '#FED7AA', // Lys oransje
      '#DDD6FE', // Lys lilla
    ],
    
    // Fullskjerm & Wake Lock
    fullscreen_button_visible: true,
    wake_lock_enabled: true,
    
    // Visningsmodus
    packing_view_mode: 'cards',
    
    // Språk
    packing_language: 'nb',
    
    // Tabell-innstillinger
    table_row_height: 'touch',
    table_font_size: '1.25rem',
    table_show_customer_number: true,
    table_show_progress_bar: true,
    table_show_order_count: true,
    table_alternate_rows: true,
    table_alternate_row_color: '#f1f5f9',
    table_sticky_header: true,
    table_touch_row_spacing: '0.75rem',
    
    // Nye tabell-forbedringer
    table_header_background_color: '#1e293b',
    table_header_text_color: '#94a3b8',
    table_header_font_size: '0.875rem',
    table_show_status_icons: true,
    table_customer_name_font_weight: 'bold',
    table_touch_tap_feedback: true,
    table_progress_bar_height: '0.75rem',
    table_row_hover_effect: true,
    table_compact_on_mobile: true,
    table_show_total_quantity: false,
    table_quantity_position: 'inline',
    table_border_style: 'subtle',
    table_selection_color: '#3b82f6',
    table_row_click_to_pack: false,
    
    // Nye antalls-innstillinger
    table_quantity_display_size: 'large',
    table_quantity_font_weight: 'bold',
    table_quantity_background_color: '#3b82f630',
    table_quantity_text_color: '#3b82f6',
    table_quantity_show_label: false,
    table_quantity_border_style: 'outline',
    
    // Status-kolonne innstillinger
    table_show_status: true,
    table_status_font_size: '1rem',
    table_status_badge_style: 'outline',
    table_status_badge_padding: '0.5rem 1rem',
    
    // Pil/chevron-innstillinger
    table_show_chevron: true,
    table_chevron_size: 'medium',
    
    // Kundenavn-innstillinger
    table_customer_name_font_size: '1.125rem',
    
    // Kolonnebredder
    table_order_column_width: '9rem',
    table_progress_column_width: '14rem',
    table_status_column_width: '9rem',
    
    // Produktkort-innstillinger
    product_card_layout: 'horizontal',
    product_card_name_font_size: '1.25rem',
    product_card_name_font_weight: 'semibold',
    product_card_show_product_number: true,
    product_card_product_number_font_size: '0.875rem',
    product_card_quantity_size: 'large',
    product_card_quantity_position: 'right',
    product_card_quantity_style: 'box',
    product_card_quantity_background_color: '#3b82f620',
    product_card_quantity_text_color: '#3b82f6',
    product_card_show_tray_format: true,
    product_card_tray_label: 'pl',
    product_card_show_total_pieces: true,
    product_card_pieces_label: 'stk',
    product_card_min_height: '100px',
    product_card_padding: '1.25rem',
    product_card_gap: '1rem',
    product_card_border_radius: '0.75rem',
    product_card_border_width: '2px',
    product_card_show_status_badge: true,
    product_card_button_size: 'large',
    product_card_button_style: 'full',
    product_card_alternate_rows: false,
    product_card_alternate_color: '#f1f5f920',
    product_card_packed_style: 'strikethrough',
    product_card_animation_enabled: true,
    
    // Pakke-knapp innstillinger
    pack_button_text: 'Pakket',
    pack_button_background_color: '#22c55e',
    pack_button_text_color: '#ffffff',
    pack_button_border_radius: '0.5rem',
    pack_button_size: 'large',
    pack_button_show_icon: true,
    
    // Tilbakeknapp-innstillinger
    back_button_show: true,
    back_button_size: 'large',
    back_button_style: 'icon',
    back_button_background_color: 'transparent',
    back_button_icon_color: '',
    back_button_text: 'Tilbake',
    
    // Oppdateringsknapp-innstillinger
    refresh_button_show: true,
    refresh_button_size: 'medium',
    refresh_button_style: 'icon',
    refresh_button_background_color: 'transparent',
    refresh_button_icon_color: '',
    refresh_button_text: 'Oppdater',
    
    // Låsefunksjon
    lock_enabled: true,
    lock_show_indicator: true,
    lock_indicator_style: 'badge',
    lock_my_lock_color: '#3b82f6',
    lock_other_lock_color: '#6b7280',
    lock_show_locked_by_text: true,
    lock_locked_by_you_text: 'Din lås',
    lock_locked_by_other_text: 'Låst',
    lock_fade_locked_cards: true,
    lock_block_locked_cards: true,
    
    // Legacy
    show_progress_bar: true,
    progress_bar_style: 'bar',
    show_clock: true,
    show_date: true,
  };
}

// Fetch display settings with support for display type
export function useDisplaySettings(
  bakeryId: string | null,
  categoryId?: string | null,
  displayType: DisplayType = 'shared'
) {
  return useQuery({
    queryKey: ['display-settings', bakeryId, categoryId, displayType],
    queryFn: async (): Promise<DisplaySettings> => {
      if (!bakeryId) return getDefaultDisplaySettings();

      let query = supabase
        .from('display_settings')
        .select('*')
        .eq('bakery_id', bakeryId)
        .eq('display_type', displayType);

      if (categoryId) {
        query = query.eq('category_id', categoryId);
      } else {
        query = query.is('category_id', null);
      }

      const { data, error } = await query.maybeSingle();

      if (error) throw error;
      
      if (data?.settings && typeof data.settings === 'object' && !Array.isArray(data.settings)) {
        return { ...getDefaultDisplaySettings(), ...data.settings } as DisplaySettings;
      }
      
      return getDefaultDisplaySettings();
    },
    enabled: !!bakeryId,
  });
}
// Fetch bakery info by short_id
export function useBakeryByShortId(shortId: string | null) {
  return useQuery({
    queryKey: ['bakery-by-short-id', shortId],
    queryFn: async () => {
      if (!shortId) return null;

      const { data, error } = await supabase
        .from('bakeries')
        .select('id, name, short_id')
        .eq('short_id', shortId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!shortId,
  });
}

// Fetch category by ID
export function useCategoryById(categoryId: string | null) {
  return useQuery({
    queryKey: ['category-by-id', categoryId],
    queryFn: async () => {
      if (!categoryId) return null;

      const { data, error } = await supabase
        .from('categories')
        .select('id, name, packing_mode, bakery_id')
        .eq('id', categoryId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!categoryId,
  });
}
