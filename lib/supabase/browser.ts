import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/types/supabase'

// Single browser client instance to prevent multiple GoTrueClient warnings
let browserClient: ReturnType<typeof createBrowserClient<Database>> | null = null

export function getBrowserClient() {
  if (!browserClient) {
    browserClient = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }
  return browserClient
}

// Export the client for direct use where needed
export const supabase = getBrowserClient()
