// Server-side agency utilities for Next.js
import { cookies } from 'next/headers'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/types/supabase'

const AGENCY_COOKIE_KEY = 'blociq_current_agency'

/**
 * Get current agency ID from server-side cookies
 */
export async function getCurrentAgencyIdServer(): Promise<string | null> {
  const cookieStore = cookies()
  const agencyCookie = cookieStore.get(AGENCY_COOKIE_KEY)
  return agencyCookie?.value || null
}

/**
 * Get user's agency memberships on server-side
 */
export async function getUserAgenciesServer(userId: string) {
  const cookieStore = cookies()
  const supabase = createServerComponentClient<Database>({ cookies: () => cookieStore })
  
  const { data, error } = await supabase
    .from('agency_members')
    .select(`
      agency_id,
      user_id,
      role,
      invitation_status,
      joined_at,
      agencies:agency_id (
        id,
        name,
        slug,
        status,
        domain,
        logo_url,
        created_at,
        updated_at
      )
    `)
    .eq('user_id', userId)
    .eq('invitation_status', 'accepted')
    .order('joined_at', { ascending: true })

  if (error) {
    console.error('Error fetching user agencies (server):', error)
    return []
  }

  return data?.map(member => ({
    ...member,
    agency: member.agencies
  })) || []
}

/**
 * Get current agency session on server-side
 */
export async function getAgencySessionServer(userId: string) {
  const agencies = await getUserAgenciesServer(userId)
  const currentAgencyId = await getCurrentAgencyIdServer()
  
  // Find current agency or default to first one
  let selectedAgency = null
  
  if (currentAgencyId) {
    selectedAgency = agencies.find(a => a.agency_id === currentAgencyId) || null
  }
  
  // If no selected agency or invalid selection, use first available
  if (!selectedAgency && agencies.length > 0) {
    selectedAgency = agencies[0]
  }
  
  return {
    currentAgencyId: selectedAgency?.agency_id || null,
    agencies,
    currentAgency: selectedAgency?.agencies || null,
    userRole: selectedAgency?.role || null,
    canManage: selectedAgency?.role ? ['owner', 'admin', 'manager'].includes(selectedAgency.role) : false
  }
}

/**
 * Enhanced Supabase client that automatically filters by current agency
 */
export async function createAgencyScopedServerClient() {
  const cookieStore = cookies()
  const supabase = createServerComponentClient<Database>({ cookies: () => cookieStore })
  const currentAgencyId = await getCurrentAgencyIdServer()
  
  return {
    ...supabase,
    
    // Override from method to add automatic agency filtering
    from<T extends keyof Database['public']['Tables']>(table: T) {
      const query = supabase.from(table)
      
      // Tables that should be automatically scoped by agency_id
      const agencyScopedTables = [
        'buildings',
        'units', 
        'leaseholders',
        'building_documents',
        'incoming_emails',
        'building_compliance_assets',
        'compliance_assets',
        'ai_logs',
        'email_history',
        'sent_emails',
        'building_setup',
        'leases',
        'contractors',
        'compliance_inspections',
        'building_compliance_config',
        'compliance_notifications',
        'property_events',
        'calendar_events',
        'works_orders',
        'connected_accounts'
      ]

      // If this table should be agency-scoped and we have a current agency
      if (agencyScopedTables.includes(table as string) && currentAgencyId) {
        return query.eq('agency_id', currentAgencyId)
      }

      return query
    }
  }
}

/**
 * Middleware helper to ensure user has agency access
 */
export async function requireAgencyAccess(userId: string, requiredRole?: 'owner' | 'admin' | 'manager' | 'viewer') {
  const session = await getAgencySessionServer(userId)
  
  if (!session.currentAgencyId) {
    throw new Error('No agency access')
  }
  
  if (requiredRole && session.userRole) {
    const roleHierarchy = ['viewer', 'manager', 'admin', 'owner']
    const userRoleIndex = roleHierarchy.indexOf(session.userRole)
    const requiredRoleIndex = roleHierarchy.indexOf(requiredRole)
    
    if (userRoleIndex < requiredRoleIndex) {
      throw new Error(`Insufficient permissions. Required: ${requiredRole}, Current: ${session.userRole}`)
    }
  }
  
  return session
}

/**
 * Get default agency slug from environment
 */
export function getDefaultAgencySlugServer(): string {
  return process.env.NEXT_PUBLIC_DEFAULT_AGENCY_SLUG || 'mih'
}
