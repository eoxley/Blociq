/**
 * Custom hook for safe destructuring patterns to prevent "Right side of assignment cannot be destructured" errors
 */

export function useSafeDestructuring() {
  /**
   * Safely destructure an object with fallback values
   * @param obj - The object to destructure
   * @param fallback - Fallback object if obj is null/undefined
   * @returns Object with safe destructured values
   */
  const safeDestructure = <T extends Record<string, any>>(
    obj: T | null | undefined,
    fallback: Partial<T> = {}
  ): T => {
    if (!obj || typeof obj !== 'object') {
      return fallback as T;
    }
    return { ...fallback, ...obj };
  };

  /**
   * Safely destructure API response data
   * @param response - API response object
   * @returns Safe destructured response
   */
  const safeApiResponse = (response: any) => {
    if (!response || typeof response !== 'object') {
      return { data: null, error: null, success: false };
    }
    
    return {
      data: response.data || null,
      error: response.error || null,
      success: response.success || false,
      message: response.message || null
    };
  };

  /**
   * Safely destructure Supabase auth response
   * @param authResult - Supabase auth result
   * @returns Safe destructured auth data
   */
  const safeAuthResponse = (authResult: any) => {
    if (!authResult || typeof authResult !== 'object') {
      return {
        data: { user: null, session: null },
        error: null
      };
    }

    const data = authResult.data || {};
    return {
      data: {
        user: data.user || null,
        session: data.session || null
      },
      error: authResult.error || null
    };
  };

  /**
   * Safely destructure array with fallback
   * @param arr - Array to destructure
   * @param fallback - Fallback array
   * @returns Safe array
   */
  const safeArray = <T>(arr: T[] | null | undefined, fallback: T[] = []): T[] => {
    return Array.isArray(arr) ? arr : fallback;
  };

  /**
   * Safely get nested property with fallback
   * @param obj - Object to traverse
   * @param path - Dot-separated path (e.g., 'user.profile.name')
   * @param fallback - Fallback value
   * @returns Safe property value
   */
  const safeGet = <T>(
    obj: any,
    path: string,
    fallback: T
  ): T => {
    if (!obj || typeof obj !== 'object') {
      return fallback;
    }

    const keys = path.split('.');
    let current = obj;

    for (const key of keys) {
      if (current === null || current === undefined || typeof current !== 'object') {
        return fallback;
      }
      current = current[key];
    }

    return current !== undefined ? current : fallback;
  };

  return {
    safeDestructure,
    safeApiResponse,
    safeAuthResponse,
    safeArray,
    safeGet
  };
}

/**
 * Higher-order function to wrap async functions with safe destructuring
 * @param fn - Async function to wrap
 * @returns Wrapped function with error handling
 */
export function withSafeDestructuring<T extends any[], R>(
  fn: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error) {
      console.error('Error in wrapped function:', error);
      throw error;
    }
  };
}

/**
 * Utility function to safely parse JSON
 * @param jsonString - JSON string to parse
 * @param fallback - Fallback value if parsing fails
 * @returns Parsed object or fallback
 */
export function safeJsonParse<T>(jsonString: string, fallback: T): T {
  try {
    const parsed = JSON.parse(jsonString);
    return parsed !== null && typeof parsed === 'object' ? parsed : fallback;
  } catch {
    return fallback;
  }
}
