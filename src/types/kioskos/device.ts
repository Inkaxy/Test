export interface Device {
  id: string;
  tenant_id: string;
  device_token: string;
  name: string;
  model: string | null;
  android_version: number | null;
  app_version: string | null;
  current_url: string | null;
  is_online: boolean;
  last_seen: string | null;
  last_screenshot_url: string | null;
  battery_level: number | null;
  battery_health: string | null;
  is_charging: boolean | null;
  screen_on: boolean | null;
  brightness: number | null;
  config: DeviceConfig;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface DeviceConfig {
  start_url?: string;
  refresh_interval?: number;
  screen_timeout?: number;
  brightness_schedule?: BrightnessSchedule[];
  allowed_urls?: string[];
  kiosk_mode?: boolean;
  show_navigation_bar?: boolean;
  enable_motion_detection?: boolean;
  motion_sensitivity?: number;
  [key: string]: unknown;
}

export interface BrightnessSchedule {
  time: string; // HH:mm format
  brightness: number; // 0-255
}

export type DeviceEventType =
  | 'provisioned'
  | 'screen_on'
  | 'screen_off'
  | 'url_changed'
  | 'motion_detected'
  | 'battery_update'
  | 'config_updated'
  | 'app_updated'
  | 'error'
  | 'restart'
  | 'online'
  | 'offline';

export interface DeviceEvent {
  id: number;
  device_id: string;
  tenant_id: string;
  event_type: DeviceEventType;
  payload: Record<string, unknown>;
  created_at: string;
}

export interface DeviceStatus {
  id: string;
  name: string;
  model: string | null;
  is_online: boolean;
  last_seen: string | null;
  battery_level: number | null;
  is_charging: boolean | null;
  screen_on: boolean | null;
  current_url: string | null;
  tags: string[];
}
