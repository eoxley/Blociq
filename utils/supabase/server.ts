import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { Database } from '@/lib/database.types'

// Cache for server-side instances to prevent multiple GoTrueClient instances
const serverInstances = new Map<string, ReturnType<typeof createServerComponentClient<Database>>>()

export function createClient(cookieStore = cookies()) {
  // Create a unique key based on the cookie store
  const cookieKey = JSON.stringify(cookieStore.getAll())
  
  // Check if we already have an instance for this cookie store
  if (serverInstances.has(cookieKey)) {
    return serverInstances.get(cookieKey)!
  }

  // Create new instance
  const instance = createServerComponentClient<Database>({ cookies: () => cookieStore })
  
  // Cache the instance
  serverInstances.set(cookieKey, instance)
  
  return instance
}
