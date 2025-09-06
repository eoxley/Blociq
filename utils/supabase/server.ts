import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { Database } from '@/types/supabase'

// Cache for server-side instances to prevent multiple GoTrueClient instances
const serverInstances = new Map<string, ReturnType<typeof createServerComponentClient<Database>>>()

export async function createClient(cookieStore?: any) {
  // If no cookieStore provided, get it from cookies()
  if (!cookieStore) {
    cookieStore = await cookies();
  }
  
  // Create a unique key based on the cookie store
  // Handle both cookie store types safely
  let cookieKey = 'default';
  try {
    if (cookieStore && typeof cookieStore.getAll === 'function') {
      const allCookies = await cookieStore.getAll();
      cookieKey = JSON.stringify(allCookies);
    } else if (cookieStore && typeof cookieStore.toString === 'function') {
      cookieKey = cookieStore.toString();
    }
  } catch (error) {
    console.warn('Error creating cookie key:', error);
    cookieKey = 'fallback';
  }
  
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
