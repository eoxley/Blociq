import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/types/supabase'

// Global variable to store the singleton instance
let supabaseInstance: ReturnType<typeof createClientComponentClient<Database>> | null = null

function createSupabaseClient() {
  // Check if we're in a browser environment
  if (typeof window === 'undefined') {
    // Server-side: always create a new instance
    return createClientComponentClient<Database>()
  }

  // Client-side: use singleton pattern
  if (supabaseInstance) {
    return supabaseInstance
  }

  // Create the client only once for client-side
  try {
    supabaseInstance = createClientComponentClient<Database>()
  } catch (error) {
    console.error('Failed to create Supabase client:', error)
    // If we fail to create the singleton, create a new instance but don't store it
    return createClientComponentClient<Database>()
  }
  
  return supabaseInstance
}

// Export the singleton instance for client-side use
export const supabase = createSupabaseClient()

// Export the function for cases where a fresh instance might be needed
export { createSupabaseClient }

// Type export for convenience
export type SupabaseClient = typeof supabase 