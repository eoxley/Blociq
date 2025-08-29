import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
// import type { Database } from '@/types/supabase';

/**
 * Unified authentication helper for server-side routes
 * Provides consistent authentication patterns across all AI endpoints
 */
export async function createAuthenticatedSupabaseClient() {
  const supabase = createRouteHandlerClient({ 
    cookies 
  });
  
  return supabase;
}

/**
 * Get authenticated user or throw unauthorized error
 */
export async function requireAuth() {
  const supabase = await createAuthenticatedSupabaseClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    throw new Error('Unauthorized');
  }
  
  return { supabase, user };
}

/**
 * Get authenticated user with optional requirement
 */
export async function getAuthenticatedUser() {
  const supabase = await createAuthenticatedSupabaseClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  return { 
    supabase, 
    user: authError ? null : user, 
    isAuthenticated: !authError && !!user 
  };
}