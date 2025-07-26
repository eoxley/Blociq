import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/lib/database.types'

// Singleton pattern to prevent multiple GoTrueClient instances
let supabaseInstance: ReturnType<typeof createClientComponentClient<Database>> | null = null

function createSupabaseClient() {
  if (supabaseInstance) {
    return supabaseInstance
  }

  // Create the client only once
  supabaseInstance = createClientComponentClient<Database>()
  
  return supabaseInstance
}

// Export the singleton instance
export const supabase = createSupabaseClient()

// Export the function for cases where a fresh instance might be needed (rare)
export { createSupabaseClient }

// Type export for convenience
export type SupabaseClient = typeof supabase 