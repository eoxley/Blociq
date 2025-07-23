// utils/supabase/index.ts

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Add error handling for missing environment variables
let supabase: any;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables:', {
    url: !!supabaseUrl,
    key: !!supabaseKey
  });
  
  // Return a mock client that won't crash the app
  supabase = {
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
  supabase = createClient(supabaseUrl, supabaseKey);
}

export { supabase };
