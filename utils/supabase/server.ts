import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { Database } from '@/types/supabase'

// Cache for server-side instances to prevent multiple GoTrueClient instances
const serverInstances = new Map<string, ReturnType<typeof createServerComponentClient<Database>>>()

// Global instance to prevent multiple clients
let globalClient: ReturnType<typeof createServerComponentClient<Database>> | null = null

export async function createClient(cookieStore?: any) {
  // Use global client to prevent multiple instances
  if (globalClient) {
    return globalClient;
  }

  // If no cookieStore provided, get it from cookies()
  if (!cookieStore) {
    try {
      cookieStore = await cookies();
    } catch (error) {
      console.warn('Error getting cookies:', error);
      // Fallback to service role client for API routes
      return getServiceRoleClient();
    }
  }
  
  // Create new instance
  globalClient = createServerComponentClient<Database>({ cookies: () => cookieStore })
  
  return globalClient
}

// Service role client for admin operations (no auth required)
let serviceRoleClient: ReturnType<typeof createSupabaseClient<Database>> | null = null

export function getServiceRoleClient() {
  if (!serviceRoleClient) {
    serviceRoleClient = createSupabaseClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          persistSession: false
        }
      }
    )
  }
  return serviceRoleClient
}
