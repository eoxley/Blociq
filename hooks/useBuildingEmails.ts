"use client";

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useSession } from '@/lib/auth'
import { useCurrentBuilding } from './useCurrentBuilding'

interface Email {
  id: string
  subject: string
  from_email: string
  body_preview: string
  received_at: string
  handled: boolean
  unread: boolean
  flag_status: string
  categories: string[]
  building_id?: number
}

interface UseBuildingEmailsReturn {
  emails: Email[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useBuildingEmails(): UseBuildingEmailsReturn {
  const { user, loading: sessionLoading } = useSession()
  const { currentBuilding, loading: buildingLoading } = useCurrentBuilding()
  const [emails, setEmails] = useState<Email[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchEmails = async () => {
    if (!user?.id) {
      console.log('👤 No user ID, skipping email fetch')
      setLoading(false)
      return
    }

    try {
      console.log('📧 Fetching emails for user:', user.id)
      console.log('👤 User ID:', user.id)
      console.log('🏢 Building ID:', currentBuilding?.id)

      let query = supabase
        .from('incoming_emails')
        .select('*')
        .eq('is_deleted', false) // Filter out deleted emails
        .order('received_at', { ascending: false })
        .limit(10)

      // If we have a current building, filter by building_id
      if (currentBuilding?.id) {
        query = query.eq('building_id', currentBuilding.id)
      }

      const { data, error } = await query

      if (error) {
        console.error('❌ Error fetching emails:', error)
        setError(`Failed to fetch emails: ${error.message}`)
        return
      }

      console.log('✅ Emails loaded:', data?.length || 0, 'items')
      setEmails(data || [])
      setError(null)
    } catch (error) {
      console.error('❌ Error in fetchEmails:', error)
      setError('Failed to load emails')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (sessionLoading || buildingLoading) return

    fetchEmails()
  }, [user?.id, currentBuilding?.id, sessionLoading, buildingLoading])

  return {
    emails,
    loading: sessionLoading || buildingLoading || loading,
    error,
    refetch: fetchEmails
  }
} 