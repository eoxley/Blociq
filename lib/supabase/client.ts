import { createClient } from '@supabase/supabase-js';

// Singleton client instance to prevent multiple GoTrueClient instances
let supabaseInstance: ReturnType<typeof createClient> | null = null;

export function getSupabaseClient() {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
  }

  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      storageKey: 'blociq-supabase-auth',
      flowType: 'pkce',
    },
    global: {
      headers: {
        'X-Client-Info': 'blociq-frontend',
      },
    },
  });

  return supabaseInstance;
}

export default getSupabaseClient;