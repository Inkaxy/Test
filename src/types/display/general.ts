/**
 * General display settings.
 * Controls fullscreen, wake lock, view mode, and language.
 */
export interface GeneralSettings {
  /** Show fullscreen button */
  fullscreen_button_visible: boolean;
  /** Enable wake lock to prevent screen sleep */
  wake_lock_enabled: boolean;
  /** Packing view mode */
  packing_view_mode: 'cards' | 'table';
  /** Display language */
  packing_language: 'nb' | 'en';
}

export const defaultGeneralSettings: GeneralSettings = {
  fullscreen_button_visible: true,
  wake_lock_enabled: true,
  packing_view_mode: 'cards',
  packing_language: 'nb',
};

/**
 * Legacy settings for backward compatibility.
 */
export interface LegacySettings {
  /** Show progress bar (legacy) */
  show_progress_bar: boolean;
  /** Progress bar style (legacy) */
  progress_bar_style: string;
  /** Show clock (legacy) */
  show_clock: boolean;
  /** Show date (legacy) */
  show_date: boolean;
}

export const defaultLegacySettings: LegacySettings = {
  show_progress_bar: true,
  progress_bar_style: 'bar',
  show_clock: true,
  show_date: true,
};
