/**
 * Format milliseconds to seconds with one decimal place
 * @param milliseconds - The time in milliseconds
 * @returns Formatted time string (e.g., "10.5")
 */
export const formatTime = (milliseconds: number): string => {
  return (milliseconds / 1000).toFixed(1);
};
