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
};
