/**
 * Statistics card settings for display screens.
 * Controls visibility and styling of progress bars and counters.
 */
export interface StatsSettings {
  /** Show total progress percentage */
  stats_show_total_progress: boolean;
  /** Show packed count */
  stats_show_packed_count: boolean;
  /** Show remaining count */
  stats_show_remaining_count: boolean;
  /** Progress bar style */
  stats_progress_bar_style: 'bar' | 'circle' | 'none';
  /** Progress bar height */
  stats_progress_bar_height: string;
  /** Label font size */
  stats_label_font_size: string;
  /** Value font size */
  stats_value_font_size: string;
}

export const defaultStatsSettings: StatsSettings = {
  stats_show_total_progress: true,
  stats_show_packed_count: true,
  stats_show_remaining_count: true,
  stats_progress_bar_style: 'bar',
  stats_progress_bar_height: '1rem',
  stats_label_font_size: '1rem',
  stats_value_font_size: '1.5rem',
};
