/**
 * Display Settings Type System
 * 
 * This module provides modular type definitions for display settings.
 * Each category of settings is defined in its own file for better organization
 * and maintainability.
 * 
 * Usage:
 * ```typescript
 * // Import the full DisplaySettings type
 * import type { DisplaySettings } from '@/types/display';
 * 
 * // Or import specific sub-interfaces
 * import type { HeaderSettings, AppearanceSettings } from '@/types/display';
 * ```
 */

// Re-export all sub-interfaces
export * from './header';
export * from './stats';
export * from './card';
export * from './appearance';
export * from './layout';
export * from './animation';
export * from './realtime';
export * from './table';
export * from './productCard';
export * from './buttons';
export * from './lock';
export * from './sorting';
export * from './product';
export * from './general';

// Import all settings types for the composed interface
import type { HeaderSettings } from './header';
import type { StatsSettings } from './stats';
import type { CardSettings } from './card';
import type { AppearanceSettings } from './appearance';
import type { LayoutSettings } from './layout';
import type { AnimationSettings } from './animation';
import type { RealtimeSettings } from './realtime';
import type { TableSettings } from './table';
import type { ProductCardSettings } from './productCard';
import type { PackButtonSettings, BackButtonSettings, RefreshButtonSettings } from './buttons';
import type { LockSettings } from './lock';
import type { SortingSettings } from './sorting';
import type { ProductSettings } from './product';
import type { GeneralSettings, LegacySettings } from './general';

/**
 * Complete DisplaySettings interface.
 * Composes all sub-interfaces into one unified type.
 * 
 * This interface is backward compatible with the original flat interface
 * in useDisplayOrders.ts.
 */
export interface DisplaySettings extends
  HeaderSettings,
  StatsSettings,
  CardSettings,
  AppearanceSettings,
  LayoutSettings,
  AnimationSettings,
  RealtimeSettings,
  TableSettings,
  ProductCardSettings,
  PackButtonSettings,
  BackButtonSettings,
  RefreshButtonSettings,
  LockSettings,
  SortingSettings,
  ProductSettings,
  GeneralSettings,
  LegacySettings {}

// Import defaults for composed default object
import { defaultHeaderSettings } from './header';
import { defaultStatsSettings } from './stats';
import { defaultCardSettings } from './card';
import { defaultAppearanceSettings } from './appearance';
import { defaultLayoutSettings } from './layout';
import { defaultAnimationSettings } from './animation';
import { defaultRealtimeSettings } from './realtime';
import { defaultTableSettings } from './table';
import { defaultProductCardSettings } from './productCard';
import { defaultPackButtonSettings, defaultBackButtonSettings, defaultRefreshButtonSettings } from './buttons';
import { defaultLockSettings } from './lock';
import { defaultSortingSettings } from './sorting';
import { defaultProductSettings } from './product';
import { defaultGeneralSettings, defaultLegacySettings } from './general';

/**
 * Default display settings composed from all sub-defaults.
 */
export const defaultDisplaySettings: DisplaySettings = {
  ...defaultHeaderSettings,
  ...defaultStatsSettings,
  ...defaultCardSettings,
  ...defaultAppearanceSettings,
  ...defaultLayoutSettings,
  ...defaultAnimationSettings,
  ...defaultRealtimeSettings,
  ...defaultTableSettings,
  ...defaultProductCardSettings,
  ...defaultPackButtonSettings,
  ...defaultBackButtonSettings,
  ...defaultRefreshButtonSettings,
  ...defaultLockSettings,
  ...defaultSortingSettings,
  ...defaultProductSettings,
  ...defaultGeneralSettings,
  ...defaultLegacySettings,
};
