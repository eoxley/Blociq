'use client'

import { useSupabase } from '@/components/SupabaseProvider'

export function useAuth() {
  const { user, session, loading } = useSupabase()

  return {
    user,
    session,
    loading,
    isAuthenticated: !!user
  }
}
