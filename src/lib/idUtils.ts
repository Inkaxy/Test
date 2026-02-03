/**
 * Utility functions for ID normalization in bakery import files
 */

/**
 * Remove leading zeros from an ID string
 * Used for customer numbers in .CUS and .OD0 files
 * 
 * @example
 * removeLeadingZeros("000123") // "123"
 * removeLeadingZeros("001")    // "1"
 * removeLeadingZeros("000")    // "0"
 */
export const removeLeadingZeros = (id: string): string => {
  const trimmed = id.replace(/^0+/, '');
  return trimmed || '0';
};

/**
 * Pad a string with leading zeros to a specified length
 * Useful for formatting display
 */
export const padWithZeros = (id: string, length: number): string => {
  return id.padStart(length, '0');
};
