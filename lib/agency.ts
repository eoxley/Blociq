// Agency context and utilities for multi-agency support
import { supabase } from '@/lib/supabaseClient'

export interface Agency {
  id: string
  name: string
  slug: string
  status?: string
  domain?: string
  logo_url?: string
  created_at: string
  updated_at: string
}

export interface AgencyMember {
  agency_id: string
  user_id: string
  role: 'owner' | 'admin' | 'manager' | 'viewer'
  invitation_status: string
  joined_at: string
  agency?: Agency
}

export interface AgencySession {
  currentAgencyId: string | null
  agencies: AgencyMember[]
  currentAgency: Agency | null
  userRole: string | null
  canManage: boolean
}

// Cookie key for storing current agency
const AGENCY_COOKIE_KEY = 'blociq_current_agency'

/**
 * Get user's agency memberships
 */
export async function getUserAgencies(userId: string): Promise<AgencyMember[]> {
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
        created_at,
        updated_at
      )
    `)
    .eq('user_id', userId)
    .eq('invitation_status', 'accepted')
    .order('joined_at', { ascending: true })

  if (error) {
    console.error('Error fetching user agencies:', error)
    return []
  }

  return data?.map(member => ({
    ...member,
    agency: member.agencies as Agency
  })) || []
}

/**
 * Get current agency ID from cookie or session
 */
export function getCurrentAgencyId(): string | null {
  if (typeof window === 'undefined') return null
  
  // Try to get from cookie first
  const cookies = document.cookie.split(';')
  const agencyCookie = cookies.find(cookie => 
    cookie.trim().startsWith(`${AGENCY_COOKIE_KEY}=`)
  )
  
  if (agencyCookie) {
    return agencyCookie.split('=')[1]?.trim() || null
  }
  
  // Fallback to localStorage
  return localStorage.getItem(AGENCY_COOKIE_KEY)
}

/**
 * Set current agency ID in cookie and localStorage
 */
export function setCurrentAgencyId(agencyId: string | null) {
  if (typeof window === 'undefined') return
  
  if (agencyId) {
    // Set cookie (expires in 30 days)
    const expires = new Date()
    expires.setDate(expires.getDate() + 30)
    document.cookie = `${AGENCY_COOKIE_KEY}=${agencyId}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`
    
    // Set localStorage as fallback
    localStorage.setItem(AGENCY_COOKIE_KEY, agencyId)
  } else {
    // Remove cookie and localStorage
    document.cookie = `${AGENCY_COOKIE_KEY}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
    localStorage.removeItem(AGENCY_COOKIE_KEY)
  }
}

/**
 * Get agency session for current user
 */
export async function getAgencySession(userId: string): Promise<AgencySession> {
  const agencies = await getUserAgencies(userId)
  const currentAgencyId = getCurrentAgencyId()
  
  // Find current agency or default to first one
  let selectedAgency: AgencyMember | null = null
  
  if (currentAgencyId) {
    selectedAgency = agencies.find(a => a.agency_id === currentAgencyId) || null
  }
  
  // If no selected agency or invalid selection, use first available
  if (!selectedAgency && agencies.length > 0) {
    selectedAgency = agencies[0]
    // Update the stored agency ID
    setCurrentAgencyId(selectedAgency.agency_id)
  }
  
  return {
    currentAgencyId: selectedAgency?.agency_id || null,
    agencies,
    currentAgency: selectedAgency?.agency || null,
    userRole: selectedAgency?.role || null,
    canManage: selectedAgency?.role ? ['owner', 'admin', 'manager'].includes(selectedAgency.role) : false
  }
}

/**
 * Switch to a different agency
 */
export async function switchAgency(agencyId: string, userId: string): Promise<boolean> {
  // Verify user has access to this agency
  const agencies = await getUserAgencies(userId)
  const targetAgency = agencies.find(a => a.agency_id === agencyId)
  
  if (!targetAgency) {
    console.error('User does not have access to agency:', agencyId)
    return false
  }
  
  // Update stored agency
  setCurrentAgencyId(agencyId)
  
  return true
}

/**
 * Get agency by ID
 */
export async function getAgency(agencyId: string): Promise<Agency | null> {
  const { data, error } = await supabase
    .from('agencies')
    .select('*')
    .eq('id', agencyId)
    .single()
    
  if (error) {
    console.error('Error fetching agency:', error)
    return null
  }
  
  return data
}

/**
 * Check if user can manage agency
 */
export function canManageAgency(role: string): boolean {
  return ['owner', 'admin', 'manager'].includes(role)
}

/**
 * Check if user is admin or owner
 */
export function isAgencyAdmin(role: string): boolean {
  return ['owner', 'admin'].includes(role)
}

/**
 * Get default agency slug from environment
 */
export function getDefaultAgencySlug(): string {
  return process.env.NEXT_PUBLIC_DEFAULT_AGENCY_SLUG || 'mih'
}

/**
 * Auto-select agency based on environment or user preference
 */
export async function autoSelectAgency(userId: string): Promise<AgencySession> {
  const session = await getAgencySession(userId)
  
  // If no current agency but we have agencies available
  if (!session.currentAgencyId && session.agencies.length > 0) {
    const defaultSlug = getDefaultAgencySlug()
    
    // Try to find default agency by slug
    const defaultAgency = session.agencies.find(a => a.agency?.slug === defaultSlug)
    
    if (defaultAgency) {
      setCurrentAgencyId(defaultAgency.agency_id)
      return {
        ...session,
        currentAgencyId: defaultAgency.agency_id,
        currentAgency: defaultAgency.agency,
        userRole: defaultAgency.role,
        canManage: canManageAgency(defaultAgency.role)
      }
    }
  }
  
  return session
}
