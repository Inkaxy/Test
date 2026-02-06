import { DisplaySettings } from '@/hooks/useDisplayOrders';

export interface EditorState {
  settings: DisplaySettings;
  selectedElement: string | null;
  isDirty: boolean;
  history: DisplaySettings[];
  historyIndex: number;
}

export interface EditableElementConfig {
  id: string;
  label: string;
  category: 'header' | 'stats' | 'cards' | 'layout' | 'appearance';
  settingKeys: (keyof DisplaySettings)[];
}

export const EDITABLE_ELEMENTS: EditableElementConfig[] = [
  // Header elements
  { id: 'header-bakery-name', label: 'Bakerinavn', category: 'header', settingKeys: ['header_show_bakery_name', 'header_bakery_font_size'] },
  { id: 'header-category', label: 'Kategorinavn', category: 'header', settingKeys: ['header_show_category_name', 'header_category_font_size'] },
  { id: 'header-clock', label: 'Klokke', category: 'header', settingKeys: ['header_show_clock', 'header_clock_font_size', 'header_clock_format'] },
  { id: 'header-date', label: 'Dato', category: 'header', settingKeys: ['header_show_date', 'header_date_font_size'] },
  
  // Stats elements
  { id: 'stats-progress', label: 'Fremdrift', category: 'stats', settingKeys: ['stats_show_total_progress', 'stats_progress_bar_style', 'stats_progress_bar_height'] },
  { id: 'stats-packed', label: 'Pakket-teller', category: 'stats', settingKeys: ['stats_show_packed_count', 'stats_value_font_size'] },
  { id: 'stats-remaining', label: 'Gjenstående', category: 'stats', settingKeys: ['stats_show_remaining_count', 'stats_label_font_size'] },
  
  // Card elements
  { id: 'card-customer-name', label: 'Kundenavn', category: 'cards', settingKeys: ['card_customer_name_font_size'] },
  { id: 'card-customer-number', label: 'Kundenummer', category: 'cards', settingKeys: ['card_show_customer_number'] },
  { id: 'card-products', label: 'Produktliste', category: 'cards', settingKeys: ['card_show_product_list', 'card_product_font_size'] },
  { id: 'card-progress', label: 'Kundeprogress', category: 'cards', settingKeys: ['card_show_individual_progress', 'card_progress_font_size'] },
  
  // Layout elements
  { id: 'layout-grid', label: 'Rutenett', category: 'layout', settingKeys: ['columns', 'gap_size', 'padding'] },
  { id: 'layout-card', label: 'Kort-stil', category: 'layout', settingKeys: ['border_radius', 'card_border_width'] },
  
  // Appearance
  { id: 'appearance-background', label: 'Bakgrunn', category: 'appearance', settingKeys: ['background_color'] },
  { id: 'appearance-card-bg', label: 'Kortbakgrunn', category: 'appearance', settingKeys: ['card_background_color'] },
  { id: 'appearance-text', label: 'Tekstfarge', category: 'appearance', settingKeys: ['text_color'] },
  { id: 'appearance-status', label: 'Statusfarger', category: 'appearance', settingKeys: ['pending_color', 'packing_color', 'completed_color'] },
];

export const THEME_PRESETS = {
  dark: {
    background_color: '#1a1a2e',
    card_background_color: '#16213e',
    text_color: '#ffffff',
    pending_color: '#6b7280',
    packing_color: '#f59e0b',
    completed_color: '#22c55e',
  },
  light: {
    background_color: '#f8fafc',
    card_background_color: '#ffffff',
    text_color: '#1e293b',
    pending_color: '#94a3b8',
    packing_color: '#f59e0b',
    completed_color: '#22c55e',
  },
  'high-contrast': {
    background_color: '#000000',
    card_background_color: '#1a1a1a',
    text_color: '#ffffff',
    pending_color: '#ffffff',
    packing_color: '#ffff00',
    completed_color: '#00ff00',
  },
} as const;
