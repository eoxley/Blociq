import { createClient } from '@/lib/supabase/server'

export interface CommunicationLogEntry {
  building_id?: string
  leaseholder_id?: string
  user_id?: string
  direction: 'inbound' | 'outbound'
  subject?: string
  body: string
  metadata?: Record<string, any>
  sent_at?: string
}

/**
 * Logs a communication entry to the database
 * This function should be called whenever emails are sent or received
 */
export async function logCommunication(entry: CommunicationLogEntry) {
  try {
    const supabase = createClient()

    // Prepare the data for insertion
    const logData = {
      building_id: entry.building_id || null,
      leaseholder_id: entry.leaseholder_id || null,
      user_id: entry.user_id || null,
      direction: entry.direction,
      subject: entry.subject || null,
      body: entry.body,
      metadata: entry.metadata || {},
      sent_at: entry.sent_at ? new Date(entry.sent_at).toISOString() : new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('communications_log')
      .insert(logData)
      .select()
      .single()

    if (error) {
      console.error('Error logging communication:', error)
      // Don't throw error to avoid breaking email functionality
      return null
    }

    console.log('✅ Communication logged successfully:', data?.id)
    return data
  } catch (error) {
    console.error('Exception logging communication:', error)
    // Don't throw error to avoid breaking email functionality
    return null
  }
}

/**
 * Retrieves communications for a specific building
 */
export async function getBuildingCommunications(buildingId: string, limit = 50) {
  try {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('communications_log')
      .select(`
        *,
        leaseholder:leaseholders(name, email),
        user:users(email)
      `)
      .eq('building_id', buildingId)
      .order('sent_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching building communications:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Exception fetching building communications:', error)
    return []
  }
}

/**
 * Retrieves communications for a specific leaseholder
 */
export async function getLeaseholderCommunications(leaseholderId: string, limit = 50) {
  try {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('communications_log')
      .select(`
        *,
        building:buildings(name),
        user:users(email)
      `)
      .eq('leaseholder_id', leaseholderId)
      .order('sent_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching leaseholder communications:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Exception fetching leaseholder communications:', error)
    return []
  }
}

/**
 * Retrieves recent communications for AskBlocIQ context
 */
export async function getRecentCommunicationsForContext(buildingId?: string, limit = 20) {
  try {
    const supabase = createClient()

    let query = supabase
      .from('communications_log')
      .select(`
        direction,
        subject,
        body,
        sent_at,
        building:buildings(name),
        leaseholder:leaseholders(name, email)
      `)
      .order('sent_at', { ascending: false })
      .limit(limit)

    if (buildingId) {
      query = query.eq('building_id', buildingId)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching communications for context:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Exception fetching communications for context:', error)
    return []
  }
}

/**
 * Helper function to extract building/leaseholder info from email metadata
 */
export function extractRecipientInfo(recipients: any[]): { building_id?: string, leaseholder_id?: string } {
  // Try to find building and leaseholder from recipient data
  const result: { building_id?: string, leaseholder_id?: string } = {}

  for (const recipient of recipients || []) {
    if (recipient.building_id) {
      result.building_id = recipient.building_id
    }
    if (recipient.leaseholder_id) {
      result.leaseholder_id = recipient.leaseholder_id
    }
    // If we have both, we can break early
    if (result.building_id && result.leaseholder_id) {
      break
    }
  }

  return result
}