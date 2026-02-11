/**
 * Customer card settings for display screens.
 * Controls what information is shown on customer cards.
 */
export interface CardSettings {
  /** Show customer number on cards */
  card_show_customer_number: boolean;
  /** Show product list on cards */
  card_show_product_list: boolean;
  /** Show product numbers */
  card_show_product_numbers: boolean;
  /** Show quantity as trays instead of pieces */
  card_show_quantity_as_trays: boolean;
  /** Show individual progress for each customer */
  card_show_individual_progress: boolean;
  /** Enable compact mode for cards */
  card_compact_mode: boolean;
  /** Customer name font size */
  card_customer_name_font_size: string;
  /** Product font size */
  card_product_font_size: string;
  /** Quantity font size */
  card_quantity_font_size: string;
  /** Progress font size */
  card_progress_font_size: string;
  /** Show bottom progress bar on cards */
  card_show_bottom_progress_bar: boolean;
  /** Show completed text when customer is 100% packed */
  card_show_completed_text: boolean;
  /** Text to display when customer is 100% packed */
  card_completed_text: string;
  /** Font size for completed text */
  card_completed_text_font_size: string;
  /** Background color for completed card */
  card_completed_bg_color: string;
  /** Text color for completed state */
  card_completed_text_color: string;
  /** Show logo watermark on completed card */
  card_completed_show_logo: boolean;
  /** Opacity of the logo watermark (0.05-0.4) */
  card_completed_logo_opacity: number;
  /** Animation type for completed state: 'none' | 'fade' | 'pulse' | 'scale' */
  card_completed_animation: string;
  /** Minimum height for cards to ensure uniform sizing */
  card_min_height: string;
}

export const defaultCardSettings: CardSettings = {
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
  card_show_bottom_progress_bar: true,
  card_show_completed_text: true,
  card_completed_text: 'FERDIG PAKKET',
  card_completed_text_font_size: '1.5rem',
  card_completed_bg_color: '#22c55e',
  card_completed_text_color: '#ffffff',
  card_completed_show_logo: true,
  card_completed_logo_opacity: 0.15,
  card_completed_animation: 'fade',
  card_min_height: '0',
};
