"use client"

import { useState, useEffect, useContext, createContext, ReactNode } from 'react'
import { useSession } from '@/lib/auth'
import { 
  AgencySession, 
  getAgencySession, 
  switchAgency, 
  autoSelectAgency,
  setCurrentAgencyId 
} from '@/lib/agency'

interface AgencyContextType {
  session: AgencySession | null
  loading: boolean
  error: string | null
  switchToAgency: (agencyId: string) => Promise<boolean>
  refreshSession: () => Promise<void>
}

const AgencyContext = createContext<AgencyContextType | null>(null)

/**
 * Agency Provider Component
 */
export function AgencyProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useSession()
  const [session, setSession] = useState<AgencySession | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load agency session when user changes
  useEffect(() => {
    if (authLoading) return
    
    const loadAgencySession = async () => {
      if (!user?.id) {
        setSession(null)
        setLoading(false)
        return
      }

      try {
        setError(null)
        console.log('🏢 Loading agency session for user:', user.id)
        
        // Auto-select agency (handles default selection)
        const agencySession = await autoSelectAgency(user.id)
        
        // Only update if the agency has actually changed
        setSession(prevSession => {
          if (prevSession?.currentAgencyId === agencySession.currentAgencyId && 
              prevSession?.currentAgency?.name === agencySession.currentAgency?.name) {
            return prevSession // No change, keep existing session
          }
          return agencySession
        })
        
        console.log('✅ Agency session loaded:', {
          currentAgency: agencySession.currentAgency?.name,
          totalAgencies: agencySession.agencies.length,
          userRole: agencySession.userRole
        })
      } catch (err) {
        console.error('❌ Error loading agency session:', err)
        setError('Failed to load agency information')
      } finally {
        setLoading(false)
      }
    }

    loadAgencySession()
  }, [user?.id, authLoading])

  const switchToAgency = async (agencyId: string): Promise<boolean> => {
    if (!user?.id) return false
    
    try {
      setError(null)
      const success = await switchAgency(agencyId, user.id)
      
      if (success) {
        // Refresh session after switch
        const newSession = await getAgencySession(user.id)
        setSession(newSession)
        console.log('✅ Switched to agency:', newSession.currentAgency?.name)
      }
      
      return success
    } catch (err) {
      console.error('❌ Error switching agency:', err)
      setError('Failed to switch agency')
      return false
    }
  }

  const refreshSession = async () => {
    if (!user?.id) return
    
    try {
      setError(null)
      const newSession = await getAgencySession(user.id)
      setSession(newSession)
    } catch (err) {
      console.error('❌ Error refreshing agency session:', err)
      setError('Failed to refresh agency session')
    }
  }

  return (
    <AgencyContext.Provider value={{
      session,
      loading,
      error,
      switchToAgency,
      refreshSession
    }}>
      {children}
    </AgencyContext.Provider>
  )
}

/**
 * Hook to use agency context
 */
export function useAgency(): AgencyContextType {
  const context = useContext(AgencyContext)
  if (!context) {
    throw new Error('useAgency must be used within an AgencyProvider')
  }
  return context
}

/**
 * Hook to get current agency information
 */
export function useCurrentAgency() {
  const { session, loading, error } = useAgency()
  
  return {
    agency: session?.currentAgency || null,
    agencyId: session?.currentAgencyId || null,
    userRole: session?.userRole || null,
    canManage: session?.canManage || false,
    agencies: session?.agencies || [],
    loading,
    error
  }
}

/**
 * Hook to check agency permissions
 */
export function useAgencyPermissions() {
  const { session } = useAgency()
  
  const canRead = Boolean(session?.currentAgencyId)
  const canWrite = Boolean(session?.canManage)
  const isAdmin = Boolean(session?.userRole && ['owner', 'admin'].includes(session.userRole))
  const isOwner = Boolean(session?.userRole === 'owner')
  
  return {
    canRead,
    canWrite,
    isAdmin,
    isOwner,
    role: session?.userRole || null
  }
}
