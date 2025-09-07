import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/supabase'

// Single browser client instance to prevent GoTrue duplicates
let browserClient: ReturnType<typeof createBrowserClient<Database>> | null = null

export function createClient() {
  if (browserClient) {
    return browserClient
  }

  browserClient = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  return browserClient
}

// Export the client for direct use
export const supabase = createClient()