/**
 * Utility functions for handling visual intensity conversions
 */

/**
 * Converts a decimal intensity (0-1) to a percentage (0-100)
 */
export const decimalToPercentage = (decimal: number): number => {
  return Math.round(decimal * 100);
};

/**
 * Converts a percentage intensity (0-100) to a decimal (0-1)
 */
export const percentageToDecimal = (percentage: number): number => {
  return percentage / 100;
};

/**
 * Ensures an intensity value is within the valid range (0-1)
 */
export const clampDecimalIntensity = (value: number): number => {
  return Math.max(0, Math.min(1, value));
};

/**
 * Ensures a percentage intensity value is within the valid range (0-100)
 */
export const clampPercentageIntensity = (value: number): number => {
  return Math.max(0, Math.min(100, value));
}; 