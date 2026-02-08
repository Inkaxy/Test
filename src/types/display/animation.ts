/**
 * Animation settings for display screens.
 * Controls transitions and visual feedback on status changes.
 */
export interface AnimationSettings {
  /** Enable animations */
  animation_enabled: boolean;
  /** Animation speed */
  animation_speed: 'fast' | 'normal' | 'slow';
  /** Animate on status change */
  animation_on_status_change: boolean;
  /** Highlight new items */
  animation_highlight_new: boolean;
  /** Duration of highlight animation in ms */
  animation_highlight_duration: number;
}

export const defaultAnimationSettings: AnimationSettings = {
  animation_enabled: true,
  animation_speed: 'normal',
  animation_on_status_change: true,
  animation_highlight_new: true,
  animation_highlight_duration: 3000,
};
