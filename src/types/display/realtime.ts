/**
 * Realtime and status settings for display screens.
 * Controls connection indicators, refresh behavior, and notifications.
 */
export interface RealtimeSettings {
  /** Show connection status indicator */
  realtime_show_connection_status: boolean;
  /** Show last update timestamp */
  realtime_show_last_update: boolean;
  /** Auto-refresh interval in seconds */
  realtime_auto_refresh_interval: number;
  /** Play sound on complete */
  realtime_sound_on_complete: boolean;
  /** Flash screen on update */
  realtime_flash_on_update: boolean;
  /** Status font size */
  realtime_status_font_size: string;
}

export const defaultRealtimeSettings: RealtimeSettings = {
  realtime_show_connection_status: true,
  realtime_show_last_update: false,
  realtime_auto_refresh_interval: 60,
  realtime_sound_on_complete: false,
  realtime_flash_on_update: true,
  realtime_status_font_size: '0.875rem',
};
