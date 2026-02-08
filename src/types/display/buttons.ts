/**
 * Pack button settings.
 */
export interface PackButtonSettings {
  /** Button text */
  pack_button_text: string;
  /** Button background color */
  pack_button_background_color: string;
  /** Button text color */
  pack_button_text_color: string;
  /** Button border radius */
  pack_button_border_radius: string;
  /** Button size */
  pack_button_size: 'normal' | 'large' | 'huge';
  /** Show icon on button */
  pack_button_show_icon: boolean;
}

export const defaultPackButtonSettings: PackButtonSettings = {
  pack_button_text: 'Pakket',
  pack_button_background_color: '#22c55e',
  pack_button_text_color: '#ffffff',
  pack_button_border_radius: '0.5rem',
  pack_button_size: 'large',
  pack_button_show_icon: true,
};

/**
 * Back button settings.
 */
export interface BackButtonSettings {
  /** Show back button */
  back_button_show: boolean;
  /** Button size */
  back_button_size: 'small' | 'medium' | 'large' | 'huge';
  /** Button style */
  back_button_style: 'icon' | 'icon-circle' | 'icon-square' | 'text' | 'text-icon';
  /** Button background color */
  back_button_background_color: string;
  /** Icon color */
  back_button_icon_color: string;
  /** Button text */
  back_button_text: string;
  /** Enable done highlight mode */
  back_button_done_highlight: boolean;
  /** Done mode background color */
  back_button_done_background_color: string;
  /** Done mode icon color */
  back_button_done_icon_color: string;
  /** Done mode text */
  back_button_done_text: string;
  /** Done mode style */
  back_button_done_style: 'icon' | 'icon-circle' | 'icon-square' | 'text' | 'text-icon';
  /** Done mode size */
  back_button_done_size: 'small' | 'medium' | 'large' | 'huge';
  /** Enable pulse animation in done mode */
  back_button_done_pulse_animation: boolean;
}

export const defaultBackButtonSettings: BackButtonSettings = {
  back_button_show: true,
  back_button_size: 'large',
  back_button_style: 'icon',
  back_button_background_color: 'transparent',
  back_button_icon_color: '',
  back_button_text: 'Tilbake',
  back_button_done_highlight: true,
  back_button_done_background_color: '#22c55e',
  back_button_done_icon_color: '#ffffff',
  back_button_done_text: 'Ferdig',
  back_button_done_style: 'text-icon',
  back_button_done_size: 'huge',
  back_button_done_pulse_animation: true,
};

/**
 * Refresh button settings.
 */
export interface RefreshButtonSettings {
  /** Show refresh button */
  refresh_button_show: boolean;
  /** Button size */
  refresh_button_size: 'small' | 'medium' | 'large' | 'huge';
  /** Button style */
  refresh_button_style: 'icon' | 'icon-circle' | 'icon-square' | 'text' | 'text-icon';
  /** Button background color */
  refresh_button_background_color: string;
  /** Icon color */
  refresh_button_icon_color: string;
  /** Button text */
  refresh_button_text: string;
}

export const defaultRefreshButtonSettings: RefreshButtonSettings = {
  refresh_button_show: true,
  refresh_button_size: 'medium',
  refresh_button_style: 'icon',
  refresh_button_background_color: 'transparent',
  refresh_button_icon_color: '',
  refresh_button_text: 'Oppdater',
};
