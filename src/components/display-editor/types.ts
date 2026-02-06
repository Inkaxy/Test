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
  { 
    id: 'header-bakery-name', 
    label: 'Bakerinavn', 
    category: 'header', 
    settingKeys: ['header_show_bakery_name', 'header_bakery_font_size', 'text_color'] 
  },
  { 
    id: 'header-category', 
    label: 'Kategorinavn', 
    category: 'header', 
    settingKeys: ['header_show_category_name', 'header_category_font_size', 'text_color'] 
  },
  { 
    id: 'header-clock', 
    label: 'Klokke', 
    category: 'header', 
    settingKeys: ['header_show_clock', 'header_clock_font_size', 'header_clock_format', 'text_color'] 
  },
  { 
    id: 'header-date', 
    label: 'Dato', 
    category: 'header', 
    settingKeys: ['header_show_date', 'header_date_font_size', 'text_color'] 
  },
  
  // Stats elements
  { 
    id: 'stats-progress', 
    label: 'Fremdrift', 
    category: 'stats', 
    settingKeys: [
      'stats_show_total_progress', 
      'stats_show_packed_count', 
      'stats_show_remaining_count',
      'stats_progress_bar_style', 
      'stats_progress_bar_height',
      'stats_value_font_size',
      'stats_label_font_size',
      'completed_color',
      'pending_color',
      'card_background_color'
    ] 
  },
  
  // Card elements
  { 
    id: 'layout-card', 
    label: 'Kundekort', 
    category: 'cards', 
    settingKeys: [
      'card_show_customer_number',
      'card_show_product_list',
      'card_show_product_numbers',
      'card_show_quantity_as_trays',
      'card_show_individual_progress',
      'card_compact_mode',
      'card_customer_name_font_size',
      'card_product_font_size',
      'card_quantity_font_size',
      'card_progress_font_size',
      'card_background_color',
      'border_radius', 
      'card_border_width',
      'completed_color',
      'pending_color',
      'packing_color'
    ] 
  },
  
  // Layout elements
  { 
    id: 'layout-grid', 
    label: 'Rutenett', 
    category: 'layout', 
    settingKeys: [
      'columns', 
      'gap_size', 
      'padding',
      'background_color',
      'auto_scroll_enabled',
      'auto_scroll_speed',
      'auto_scroll_pause_on_hover'
    ] 
  },
  
  // Appearance
  { 
    id: 'appearance-colors', 
    label: 'Farger', 
    category: 'appearance', 
    settingKeys: [
      'background_color', 
      'card_background_color', 
      'text_color',
      'pending_color', 
      'packing_color', 
      'completed_color'
    ] 
  },
  
  // Animation settings
  {
    id: 'appearance-animations',
    label: 'Animasjoner',
    category: 'appearance',
    settingKeys: [
      'animation_enabled',
      'animation_speed',
      'animation_on_status_change',
      'animation_highlight_new',
      'animation_highlight_duration',
      'realtime_flash_on_update'
    ]
  },
  
  // Sorting settings
  {
    id: 'appearance-sorting',
    label: 'Sortering',
    category: 'appearance',
    settingKeys: [
      'customer_sort_mode',
      'customer_sort_direction',
      'customer_sort_completed_last'
    ]
  },
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
  bakery: {
    background_color: '#fef3c7',
    card_background_color: '#fef9e7',
    text_color: '#78350f',
    pending_color: '#d97706',
    packing_color: '#f59e0b',
    completed_color: '#059669',
  },
  industrial: {
    background_color: '#27272a',
    card_background_color: '#3f3f46',
    text_color: '#fafafa',
    pending_color: '#71717a',
    packing_color: '#ef4444',
    completed_color: '#10b981',
  },
  minimalist: {
    background_color: '#ffffff',
    card_background_color: '#f5f5f5',
    text_color: '#262626',
    pending_color: '#d4d4d4',
    packing_color: '#4b5563',
    completed_color: '#31a24c',
  },
  ocean: {
    background_color: '#001f3f',
    card_background_color: '#003d5c',
    text_color: '#e0f2fe',
    pending_color: '#7dd3fc',
    packing_color: '#06b6d4',
    completed_color: '#10b981',
  },
  sunset: {
    background_color: '#1e3a8a',
    card_background_color: '#1e40af',
    text_color: '#fef08a',
    pending_color: '#fbbf24',
    packing_color: '#f97316',
    completed_color: '#84cc16',
  },
  forest: {
    background_color: '#1b4332',
    card_background_color: '#2d6a4f',
    text_color: '#d8f3dc',
    pending_color: '#95b8a1',
    packing_color: '#52b788',
    completed_color: '#74c69d',
  },
} as const;
