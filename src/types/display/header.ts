/**
 * Header settings for display screens.
 * Controls visibility and styling of header elements like bakery name, clock, and date.
 */
export interface HeaderSettings {
  /** Show bakery name in header */
  header_show_bakery_name: boolean;
  /** Show category name in header */
  header_show_category_name: boolean;
  /** Show clock in header */
  header_show_clock: boolean;
  /** Show date in header */
  header_show_date: boolean;
  /** Bakery name font size */
  header_bakery_font_size: string;
  /** Category name font size */
  header_category_font_size: string;
  /** Clock font size */
  header_clock_font_size: string;
  /** Date font size */
  header_date_font_size: string;
  /** Clock format: 12-hour or 24-hour */
  header_clock_format: '12h' | '24h';
}

export const defaultHeaderSettings: HeaderSettings = {
  header_show_bakery_name: true,
  header_show_category_name: true,
  header_show_clock: true,
  header_show_date: true,
  header_bakery_font_size: '1.875rem',
  header_category_font_size: '1.25rem',
  header_clock_font_size: '1.5rem',
  header_date_font_size: '1.25rem',
  header_clock_format: '24h',
};
