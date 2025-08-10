import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Singleton pattern to prevent multiple GoTrueClient instances
let supabaseInstance: any = null;
let supabaseAdminInstance: any = null;

function createSupabaseClient() {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Missing Supabase environment variables:', {
      url: !!supabaseUrl,
      key: !!supabaseAnonKey
    });
    // Return a mock client that won't crash the app
    supabaseInstance = {
      auth: {
        getSession: async () => ({ data: { session: null }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: null } }),
        signOut: async () => ({ error: null }),
        signInWithPassword: async () => ({ error: { message: 'Supabase not configured' } })
      },
      from: () => ({
        select: () => ({ eq: () => ({ single: async () => ({ data: null, error: { message: 'Supabase not configured' } }) }) }),
        insert: () => ({ error: { message: 'Supabase not configured' } }),
        update: () => ({ eq: () => ({ error: { message: 'Supabase not configured' } }) }),
        delete: () => ({ eq: () => ({ error: { message: 'Supabase not configured' } }) })
      })
    };
  } else {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
  }
  return supabaseInstance;
}

function createSupabaseAdminClient() {
  if (supabaseAdminInstance) {
    return supabaseAdminInstance;
  }
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase admin environment variables');
  }
  supabaseAdminInstance = createClient(supabaseUrl, supabaseServiceKey);
  return supabaseAdminInstance;
}

export const supabase = createSupabaseClient();

export async function saveOutlookTokens({ access_token, refresh_token, expires_in, user_email }: {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user_email: string;
}) {
  const supabaseAdmin = createSupabaseAdminClient();
  const expires_at = new Date(Date.now() + expires_in * 1000).toISOString();
  console.log('[saveOutlookTokens] Upserting token for', user_email, 'expires_at:', expires_at);
  const { error } = await supabaseAdmin
    .from('outlook_tokens')
    .upsert({
      user_email,
      access_token,
      refresh_token,
      expires_at
    }, { onConflict: 'user_email' });
  if (error) {
    console.error('[saveOutlookTokens] Error upserting token:', error);
    throw error;
  }
  console.log('[saveOutlookTokens] Token upserted successfully for', user_email);
}
