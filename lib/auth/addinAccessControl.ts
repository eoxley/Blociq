/**
 * Add-in Access Control Library
 *
 * This module provides access control functions to ensure that Outlook add-in-only users
 * cannot access agency data (buildings, units, leaseholders, etc.) while still allowing
 * them to use AI endpoints for property management assistance.
 */

import { createClient } from '@/lib/supabase/server'
import { User } from '@supabase/supabase-js'

export interface UserAccessProfile {
  userId: string
  email?: string
  isAddinOnly: boolean
  agencyId?: string
  hasAgencyAccess: boolean
  allowedEndpoints: string[]
}

/**
 * Get user access profile with add-in restrictions
 */
export async function getUserAccessProfile(user: User): Promise<UserAccessProfile> {
  const supabase = await createClient()

  try {
    // Check both users and profiles tables for addin_only flag
    const [usersResult, profilesResult] = await Promise.all([
      supabase
        .from('users')
        .select('addin_only, agency_id, role')
        .eq('id', user.id)
        .single(),
      supabase
        .from('profiles')
        .select('addin_only, agency_id, role')
        .eq('user_id', user.id)
        .single()
    ])

    const userData = usersResult.data
    const profileData = profilesResult.data

    // Determine if user is add-in only (check both tables)
    const isAddinOnly = userData?.addin_only || profileData?.addin_only || false
    const agencyId = userData?.agency_id || profileData?.agency_id

    // Determine allowed endpoints based on user type
    const allowedEndpoints = isAddinOnly
      ? [
          '/api/ask-ai',
          '/api/ask-ai-outlook',
          '/api/addin/chat',
          '/api/generate-reply'
        ]
      : [
          '/api/ask-ai',
          '/api/ask-ai-outlook',
          '/api/addin/chat',
          '/api/generate-reply',
          '/api/buildings',
          '/api/units',
          '/api/leaseholders',
          '/api/compliance',
          '/api/documents',
          '/api/communications',
          '/api/inbox-triage'
        ]

    return {
      userId: user.id,
      email: user.email,
      isAddinOnly,
      agencyId: agencyId || undefined,
      hasAgencyAccess: !isAddinOnly && !!agencyId,
      allowedEndpoints
    }
  } catch (error) {
    console.error('Error getting user access profile:', error)

    // Default to restricted access on error
    return {
      userId: user.id,
      email: user.email,
      isAddinOnly: true,
      hasAgencyAccess: false,
      allowedEndpoints: ['/api/ask-ai', '/api/ask-ai-outlook', '/api/addin/chat']
    }
  }
}

/**
 * Check if user can access a specific API endpoint
 */
export async function canAccessEndpoint(user: User, endpoint: string): Promise<boolean> {
  const accessProfile = await getUserAccessProfile(user)

  // Check if endpoint is explicitly allowed
  const isAllowed = accessProfile.allowedEndpoints.some(allowed =>
    endpoint.startsWith(allowed)
  )

  // Log access attempt for monitoring
  await logEndpointAccess(user.id, endpoint, accessProfile.isAddinOnly, isAllowed)

  return isAllowed
}

/**
 * Middleware to check add-in access restrictions
 */
export async function enforceAddinAccessControl(user: User, requestPath: string): Promise<{
  allowed: boolean
  reason?: string
  accessProfile: UserAccessProfile
}> {
  const accessProfile = await getUserAccessProfile(user)

  // Allow access to AI endpoints for all authenticated users
  const aiEndpoints = ['/api/ask-ai', '/api/ask-ai-outlook', '/api/addin/chat', '/api/generate-reply']
  if (aiEndpoints.some(endpoint => requestPath.startsWith(endpoint))) {
    return {
      allowed: true,
      accessProfile
    }
  }

  // Block add-in only users from agency data endpoints
  const agencyEndpoints = ['/api/buildings', '/api/units', '/api/leaseholders', '/api/compliance']
  if (accessProfile.isAddinOnly && agencyEndpoints.some(endpoint => requestPath.startsWith(endpoint))) {
    return {
      allowed: false,
      reason: 'Add-in only users cannot access agency data. Please upgrade to full BlocIQ access.',
      accessProfile
    }
  }

  // Check agency membership for full users
  if (!accessProfile.isAddinOnly && !accessProfile.hasAgencyAccess) {
    return {
      allowed: false,
      reason: 'No agency membership found. Please contact support for access.',
      accessProfile
    }
  }

  return {
    allowed: true,
    accessProfile
  }
}

/**
 * Log endpoint access for monitoring and analytics
 */
async function logEndpointAccess(
  userId: string,
  endpoint: string,
  isAddinUser: boolean,
  accessGranted: boolean
): Promise<void> {
  try {
    const supabase = await createClient()

    await supabase
      .from('ai_endpoint_logs')
      .insert({
        user_id: userId,
        endpoint,
        is_addin_user: isAddinUser,
        agency_access: !isAddinUser,
        access_granted: accessGranted,
        created_at: new Date().toISOString()
      })
  } catch (error) {
    // Log silently - don't fail requests due to logging issues
    console.error('Failed to log endpoint access:', error)
  }
}

/**
 * Create a test add-in only user for testing
 */
export async function createTestAddinUser(email: string, testName?: string): Promise<string> {
  const supabase = await createClient()

  try {
    // Create in profiles table with addin_only flag
    const { data, error } = await supabase
      .from('profiles')
      .insert({
        user_id: '00000000-0000-0000-0000-000000000000', // Placeholder - would be real auth user ID
        full_name: testName || 'Test Add-in User',
        role: 'addin_user',
        addin_only: true
      })
      .select()
      .single()

    if (error) throw error

    console.log(`Created test add-in user: ${email}`)
    return data.id
  } catch (error) {
    console.error('Failed to create test add-in user:', error)
    throw error
  }
}

/**
 * Utility function to check if current API call should be restricted
 */
export function isAgencyDataEndpoint(pathname: string): boolean {
  const agencyEndpoints = [
    '/api/buildings',
    '/api/units',
    '/api/leaseholders',
    '/api/compliance',
    '/api/documents',
    '/api/communications',
    '/api/inbox-triage',
    '/api/tracker',
    '/api/property-events',
    '/api/calendar-events',
    '/api/works-orders'
  ]

  return agencyEndpoints.some(endpoint => pathname.startsWith(endpoint))
}

/**
 * Utility function to check if endpoint is AI-only (allowed for add-in users)
 */
export function isAIOnlyEndpoint(pathname: string): boolean {
  const aiEndpoints = [
    '/api/ask-ai',
    '/api/ask-ai-outlook',
    '/api/addin/chat',
    '/api/generate-reply'
  ]

  return aiEndpoints.some(endpoint => pathname.startsWith(endpoint))
}

// Export types for use in API routes
export type { UserAccessProfile }