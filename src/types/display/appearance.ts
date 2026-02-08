/**
 * Theme preset options.
 */
export type ThemePreset = 
  | 'dark' 
  | 'light' 
  | 'high-contrast' 
  | 'bakery-gold' 
  | 'industrial' 
  | 'minimalist' 
  | 'ocean' 
  | 'forest' 
  | 'coffee' 
  | 'wine' 
  | 'sunrise' 
  // Nye lyse temaer
  | 'nordic-frost'
  | 'morning-bakery'
  | 'lavender-dreams'
  | 'ocean-breeze'
  | 'peach-blossom'
  | 'sage-garden'
  | 'vanilla-cream'
  | 'cherry-blossom'
  | 'custom';

/**
 * Appearance settings for display screens.
 * Controls colors, borders, and visual theme.
 */
export interface AppearanceSettings {
  /** Background color */
  background_color: string;
  /** Card background color */
  card_background_color: string;
  /** Text color */
  text_color: string;
  /** Pending status color */
  pending_color: string;
  /** In-progress/packing color */
  packing_color: string;
  /** Completed status color */
  completed_color: string;
  /** Border radius for cards */
  border_radius: string;
  /** Card border width */
  card_border_width: string;
  /** Selected theme preset */
  theme_preset: ThemePreset;
}

export const defaultAppearanceSettings: AppearanceSettings = {
  background_color: '#1a1a2e',
  card_background_color: '#16213e',
  text_color: '#ffffff',
  pending_color: '#6b7280',
  packing_color: '#f59e0b',
  completed_color: '#22c55e',
  border_radius: '0.75rem',
  card_border_width: '4px',
  theme_preset: 'dark',
};
