/**
 * Product card settings for packing displays.
 * Controls appearance and behavior of individual product cards.
 */
export interface ProductCardSettings {
  /** Card layout orientation */
  product_card_layout: 'horizontal' | 'vertical';
  /** Product name font size */
  product_card_name_font_size: string;
  /** Product name font weight */
  product_card_name_font_weight: 'normal' | 'medium' | 'semibold' | 'bold';
  /** Show product number */
  product_card_show_product_number: boolean;
  /** Product number font size */
  product_card_product_number_font_size: string;
  /** Quantity display size */
  product_card_quantity_size: 'small' | 'medium' | 'large' | 'huge';
  /** Quantity position */
  product_card_quantity_position: 'left' | 'right' | 'center';
  /** Quantity display style */
  product_card_quantity_style: 'plain' | 'box' | 'circle' | 'pill';
  /** Quantity background color */
  product_card_quantity_background_color: string;
  /** Quantity text color */
  product_card_quantity_text_color: string;
  /** Show tray format */
  product_card_show_tray_format: boolean;
  /** Tray label text */
  product_card_tray_label: string;
  /** Show total pieces */
  product_card_show_total_pieces: boolean;
  /** Pieces label text */
  product_card_pieces_label: string;
  /** Minimum card height */
  product_card_min_height: string;
  /** Card padding */
  product_card_padding: string;
  /** Gap between cards */
  product_card_gap: string;
  /** Card border radius */
  product_card_border_radius: string;
  /** Card border width */
  product_card_border_width: string;
  /** Show status badge */
  product_card_show_status_badge: boolean;
  /** Button size */
  product_card_button_size: 'normal' | 'large' | 'huge';
  /** Button style */
  product_card_button_style: 'full' | 'icon-only' | 'compact';
  /** Enable alternating row colors */
  product_card_alternate_rows: boolean;
  /** Alternating row color */
  product_card_alternate_color: string;
  /** Packed item display style */
  product_card_packed_style: 'strikethrough' | 'fade' | 'collapse';
  /** Enable card animations */
  product_card_animation_enabled: boolean;
}

export const defaultProductCardSettings: ProductCardSettings = {
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
};
