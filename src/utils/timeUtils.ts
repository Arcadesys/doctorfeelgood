/**
 * Utility functions for time formatting and manipulation
 */

/**
 * Formats seconds into a MM:SS string format
 * @param seconds - Number of seconds to format
 * @returns Formatted time string (e.g., "1:30")
 */
export const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Formats milliseconds into a MM:SS string format
 * @param milliseconds - Number of milliseconds to format
 * @returns Formatted time string (e.g., "1:30")
 */
export const formatMilliseconds = (milliseconds: number): string => {
  return formatTime(Math.floor(milliseconds / 1000));
};

/**
 * Converts a time string in MM:SS format to seconds
 * @param timeString - Time string to parse (e.g., "1:30")
 * @returns Number of seconds
 */
export const parseTimeString = (timeString: string): number => {
  const [mins, secs] = timeString.split(':').map(Number);
  return mins * 60 + secs;
}; 