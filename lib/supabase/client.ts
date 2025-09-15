import { createBrowserClient } from '@supabase/ssr'

// Singleton Supabase client to prevent multiple instances
let supabaseInstance: ReturnType<typeof createBrowserClient> | null = null

export function createClient() {
  if (supabaseInstance) {
    return supabaseInstance
  }

  // For development - provide fallback values if env vars are missing
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.warn('Missing Supabase environment variables - using fallback for development')
  }

  supabaseInstance = createBrowserClient(
    supabaseUrl,
    supabaseKey
  )

  return supabaseInstance
}

// Export the singleton client for direct use
export const supabase = createClient()
