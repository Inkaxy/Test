/**
 * Product-based packing settings.
 * Controls product line colors and related features.
 */
export interface ProductSettings {
  /** Enable product line colors */
  product_line_colors_enabled: boolean;
  /** Color palette for product lines */
  product_line_colors_palette: string[];
}

export const defaultProductSettings: ProductSettings = {
  product_line_colors_enabled: true,
  product_line_colors_palette: [
    '#DBEAFE', // Light blue
    '#D1FAE5', // Light green
    '#FEF3C7', // Light yellow
    '#FCE7F3', // Light pink
    '#E0E7FF', // Light indigo
    '#CCFBF1', // Light teal
    '#FED7AA', // Light orange
    '#DDD6FE', // Light purple
  ],
};
