/**
 * Utility function to generate time-based greetings
 * Returns appropriate greeting based on current hour in user's timezone
 */

export function getTimeBasedGreeting(userName?: string): string {
  const now = new Date();
  const hour = now.getHours();
  
  let timeGreeting: string;
  
  if (hour >= 0 && hour < 12) {
    timeGreeting = "Good morning";
  } else if (hour >= 12 && hour < 18) {
    timeGreeting = "Good afternoon";
  } else {
    timeGreeting = "Good evening";
  }
  
  // If userName is provided, include it in the greeting
  if (userName) {
    return `${timeGreeting}, ${userName}!`;
  }
  
  // Fallback greeting if no name is available
  return `${timeGreeting}!`;
}

/**
 * Hook to get time-based greeting with user data
 * This can be used in components that need to access user data
 */
export function useTimeBasedGreeting(userData?: { name?: string }): string {
  const userName = userData?.name;
  return getTimeBasedGreeting(userName);
} 