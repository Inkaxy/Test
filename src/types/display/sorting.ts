/**
 * Sort mode options for customer lists.
 */
export type CustomerSortMode = 'name' | 'progress' | 'customer_number';

/**
 * Sort direction options.
 */
export type CustomerSortDirection = 'asc' | 'desc';

/**
 * Sorting settings for customer lists.
 */
export interface SortingSettings {
  /** Sort mode */
  customer_sort_mode: CustomerSortMode;
  /** Sort direction */
  customer_sort_direction: CustomerSortDirection;
  /** Move completed customers to end of list */
  customer_sort_completed_last: boolean;
}

export const defaultSortingSettings: SortingSettings = {
  customer_sort_mode: 'name',
  customer_sort_direction: 'asc',
  customer_sort_completed_last: true,
};
