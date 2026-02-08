/**
 * Layout and scroll settings for display screens.
 * Controls grid layout, spacing, and auto-scroll behavior.
 */
export interface LayoutSettings {
  /** Number of columns */
  columns: number;
  /** Gap size between cards */
  gap_size: string;
  /** Padding around content */
  padding: string;
  /** Customer name font size (layout context) */
  customer_name_font_size: string;
  /** Product font size (layout context) */
  product_font_size: string;
  /** Enable auto-scroll */
  auto_scroll_enabled: boolean;
  /** Auto-scroll speed */
  auto_scroll_speed: 'slow' | 'medium' | 'fast';
  /** Pause auto-scroll on hover */
  auto_scroll_pause_on_hover: boolean;
}

export const defaultLayoutSettings: LayoutSettings = {
  columns: 3,
  gap_size: '1rem',
  padding: '1.5rem',
  customer_name_font_size: '2rem',
  product_font_size: '1rem',
  auto_scroll_enabled: false,
  auto_scroll_speed: 'medium',
  auto_scroll_pause_on_hover: true,
};
