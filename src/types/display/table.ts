/**
 * Table view settings for display screens.
 * Controls table appearance, row styling, and column configuration.
 */
export interface TableSettings {
  /** Row height preset */
  table_row_height: 'compact' | 'normal' | 'touch';
  /** Table font size */
  table_font_size: string;
  /** Show customer number column */
  table_show_customer_number: boolean;
  /** Show progress bar in rows */
  table_show_progress_bar: boolean;
  /** Show order count */
  table_show_order_count: boolean;
  /** Enable alternating row colors */
  table_alternate_rows: boolean;
  /** Alternating row color */
  table_alternate_row_color: string;
  /** Enable sticky header */
  table_sticky_header: boolean;
  /** Touch row spacing */
  table_touch_row_spacing: string;
  /** Header background color */
  table_header_background_color: string;
  /** Header text color */
  table_header_text_color: string;
  /** Header font size */
  table_header_font_size: string;
  /** Show status icons */
  table_show_status_icons: boolean;
  /** Customer name font weight */
  table_customer_name_font_weight: 'normal' | 'medium' | 'semibold' | 'bold';
  /** Enable touch tap feedback */
  table_touch_tap_feedback: boolean;
  /** Progress bar height */
  table_progress_bar_height: string;
  /** Enable row hover effect */
  table_row_hover_effect: boolean;
  /** Enable compact mode on mobile */
  table_compact_on_mobile: boolean;
  /** Show total quantity */
  table_show_total_quantity: boolean;
  /** Quantity position */
  table_quantity_position: 'inline' | 'separate';
  /** Border style */
  table_border_style: 'none' | 'subtle' | 'full';
  /** Selection color */
  table_selection_color: string;
  /** Enable click-to-pack on rows */
  table_row_click_to_pack: boolean;
  /** Quantity display size */
  table_quantity_display_size: 'small' | 'medium' | 'large' | 'huge';
  /** Quantity font weight */
  table_quantity_font_weight: 'normal' | 'bold';
  /** Quantity background color */
  table_quantity_background_color: string;
  /** Quantity text color */
  table_quantity_text_color: string;
  /** Show quantity label */
  table_quantity_show_label: boolean;
  /** Quantity border style */
  table_quantity_border_style: 'none' | 'outline' | 'filled';
  /** Show status column */
  table_show_status: boolean;
  /** Status font size */
  table_status_font_size: string;
  /** Status badge style */
  table_status_badge_style: 'filled' | 'outline' | 'minimal';
  /** Status badge padding */
  table_status_badge_padding: string;
  /** Show chevron/arrow */
  table_show_chevron: boolean;
  /** Chevron size */
  table_chevron_size: 'small' | 'medium' | 'large';
  /** Customer name font size */
  table_customer_name_font_size: string;
  /** Order column width */
  table_order_column_width: string;
  /** Progress column width */
  table_progress_column_width: string;
  /** Status column width */
  table_status_column_width: string;
}

export const defaultTableSettings: TableSettings = {
  table_row_height: 'touch',
  table_font_size: '1.25rem',
  table_show_customer_number: true,
  table_show_progress_bar: true,
  table_show_order_count: true,
  table_alternate_rows: true,
  table_alternate_row_color: '#f1f5f9',
  table_sticky_header: true,
  table_touch_row_spacing: '0.75rem',
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
  table_quantity_display_size: 'large',
  table_quantity_font_weight: 'bold',
  table_quantity_background_color: '#3b82f630',
  table_quantity_text_color: '#3b82f6',
  table_quantity_show_label: false,
  table_quantity_border_style: 'outline',
  table_show_status: true,
  table_status_font_size: '1rem',
  table_status_badge_style: 'outline',
  table_status_badge_padding: '0.5rem 1rem',
  table_show_chevron: true,
  table_chevron_size: 'medium',
  table_customer_name_font_size: '1.125rem',
  table_order_column_width: '9rem',
  table_progress_column_width: '14rem',
  table_status_column_width: '9rem',
};
