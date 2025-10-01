'use client';

import { createBrowserClient } from '@supabase/ssr';
import { createContext, useContext, useEffect, useState } from 'react';
import type { SupabaseClient, User, Session } from '@supabase/supabase-js';

// Create a context for the Supabase client
const SupabaseContext = createContext<{
  supabase: SupabaseClient | null;
  user: User | null;
  session: Session | null;
  loading: boolean;
}>({
  supabase: null,
  user: null,
  session: null,
  loading: true,
});

// Singleton client instance
let supabaseInstance: SupabaseClient | null = null;

function getSupabaseClient() {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  supabaseInstance = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    }
  );

  return supabaseInstance;
}

export function useSupabase() {
  const context = useContext(SupabaseContext);
  if (!context) {
    throw new Error('useSupabase must be used within a SupabaseProvider');
  }
  return context;
}

export default function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const [supabase] = useState(() => getSupabaseClient());
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error('Session error:', error);
          // Clear corrupted session
          await supabase.auth.signOut();
        }
        setSession(session);
        setUser(session?.user ?? null);
      } catch (error) {
        console.error('Failed to get session:', error);
        // Clear any corrupted cookies
        try {
          await supabase.auth.signOut();
        } catch (e) {
          console.error('Failed to sign out:', e);
        }
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => {
      if (subscription && typeof subscription.unsubscribe === 'function') {
        subscription.unsubscribe();
      }
    };
  }, [supabase]);

  return (
    <SupabaseContext.Provider value={{ supabase, user, session, loading }}>
      {children}
    </SupabaseContext.Provider>
  );
}
