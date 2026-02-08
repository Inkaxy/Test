/**
 * Customer lock settings for packing displays.
 * Controls how locked customers are displayed and handled.
 */
export interface LockSettings {
  /** Enable customer locking */
  lock_enabled: boolean;
  /** Show lock indicator */
  lock_show_indicator: boolean;
  /** Lock indicator style */
  lock_indicator_style: 'badge' | 'icon' | 'border' | 'overlay';
  /** Color for your own locks */
  lock_my_lock_color: string;
  /** Color for other users' locks */
  lock_other_lock_color: string;
  /** Show "locked by" text */
  lock_show_locked_by_text: boolean;
  /** Text for your own locks */
  lock_locked_by_you_text: string;
  /** Text for other users' locks */
  lock_locked_by_other_text: string;
  /** Fade locked cards */
  lock_fade_locked_cards: boolean;
  /** Block interaction with locked cards */
  lock_block_locked_cards: boolean;
}

export const defaultLockSettings: LockSettings = {
  lock_enabled: true,
  lock_show_indicator: true,
  lock_indicator_style: 'badge',
  lock_my_lock_color: '#3b82f6',
  lock_other_lock_color: '#6b7280',
  lock_show_locked_by_text: true,
  lock_locked_by_you_text: 'Din lås',
  lock_locked_by_other_text: 'Låst',
  lock_fade_locked_cards: true,
  lock_block_locked_cards: true,
};
