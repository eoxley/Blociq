'use client'

import { useState, useEffect, useRef } from 'react'
import { useSupabase } from '@/components/SupabaseProvider'
import { toast } from 'sonner'

// Define the Email type based on the database schema
type Email = {
  id: string
  from_email: string | null
  from_name: string | null
  subject: string | null
  body_preview: string | null
  body_full: string | null
  received_at: string | null
  unread: boolean | null
  is_read: boolean | null
  handled: boolean | null
  is_handled: boolean | null
  pinned: boolean | null
  flag_status: string | null
  categories: string[] | null
  tags: string[] | null
  building_id: number | null
  unit_id: number | null
  leaseholder_id: string | null
  outlook_id: string | null
  user_id: string | null
  buildings?: { name: string } | null
  units?: { unit_number: string } | null
  leaseholders?: { name: string; email: string } | null
}

type Folder = {
  id: string
  label: string
  count: number
  icon: any
}

export function useInbox() {
  const { supabase } = useSupabase();
  const [emails, setEmails] = useState<Email[]>([])
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null)
  const [loading, setLoading] = useState(true)
  const [isRealTimeEnabled, setIsRealTimeEnabled] = useState(false)
  const [folders, setFolders] = useState<Folder[]>([])
  const [error, setError] = useState<string | null>(null)
  
  const subscriptionRef = useRef<any>(null)

  // Fetch emails from Supabase
  const fetchEmails = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError) {
        console.error('Error getting user:', userError)
        setError('Authentication error')
        toast.error('Authentication failed')
        return
      }
      
      if (!user) {
        console.error('No user found')
        setError('No user found')
        toast.error('Please log in to view emails')
        return
      }

      console.log('Fetching emails for user:', user.id)
      
      const { data, error } = await supabase
        .from('incoming_emails')
        .select(`
          *,
          buildings (name),
          units (unit_number),
          leaseholders (name, email)
        `)
        .eq('user_id', user.id)
        .eq('is_deleted', false) // Filter out deleted emails
        .order('received_at', { ascending: false })

      if (error) {
        console.error('Error fetching emails:', error)
        setError(error.message)
        toast.error('Failed to load emails')
        return
      }

      console.log('Emails fetched successfully:', data?.length || 0)
      setEmails(data || [])
    } catch (error) {
      console.error('Error in fetchEmails:', error)
      setError(error instanceof Error ? error.message : 'Unknown error')
      toast.error('Failed to load emails')
    } finally {
      setLoading(false)
    }
  }

  // Manual sync function
  const manualSync = async () => {
    try {
      toast.loading('Syncing emails...')
      await fetchEmails()
      toast.success('Emails synced successfully')
    } catch (error) {
      console.error('Error in manual sync:', error)
      toast.error('Failed to sync emails')
    }
  }

  // Select an email
  const selectEmail = (email: Email) => {
    setSelectedEmail(email)
  }

  // Setup real-time subscription
  const setupRealTimeSubscription = async () => {
    try {
      // Clean up existing subscription
      if (subscriptionRef.current) {
        await supabase.removeChannel(subscriptionRef.current)
      }

      // Get current user for filtering
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.error('No user found for real-time subscription')
        return
      }

      // Create new subscription with user filter
      const channel = supabase
        .channel('incoming_emails_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'incoming_emails',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            console.log('Real-time update received:', payload)
            fetchEmails() // Refresh emails when changes occur
          }
        )
        .subscribe()

      subscriptionRef.current = channel
      setIsRealTimeEnabled(true)
      console.log('Real-time subscription enabled')
    } catch (error) {
      console.error('Error setting up real-time subscription:', error)
      setIsRealTimeEnabled(false)
    }
  }

  // Generate folders based on email categories
  const generateFolders = (emails: Email[]): Folder[] => {
    const folderMap = new Map<string, number>()
    
    // Count emails by category
    emails.forEach(email => {
      if (email.categories && email.categories.length > 0) {
        email.categories.forEach(category => {
          folderMap.set(category, (folderMap.get(category) || 0) + 1)
        })
      }
    })

    // Create folder objects
    const folders: Folder[] = [
      {
        id: 'inbox',
        label: 'Inbox',
        count: emails.length,
        icon: '📥'
      },
      {
        id: 'unread',
        label: 'Unread',
        count: emails.filter(e => e.unread || !e.is_read).length,
        icon: '📬'
      },
      {
        id: 'flagged',
        label: 'Flagged',
        count: emails.filter(e => e.flag_status === 'flagged').length,
        icon: '🚩'
      },
      {
        id: 'handled',
        label: 'Handled',
        count: emails.filter(e => e.handled || e.is_handled).length,
        icon: '✅'
      }
    ]

    // Add dynamic categories as folders
    folderMap.forEach((count, category) => {
      folders.push({
        id: category.toLowerCase().replace(/\s+/g, '-'),
        label: category,
        count,
        icon: '📁'
      })
    })

    return folders
  }

  // Initialize
  useEffect(() => {
    fetchEmails()
    setupRealTimeSubscription()

    return () => {
      // Cleanup subscription on unmount
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current)
      }
    }
  }, [])

  // Update folders when emails change
  useEffect(() => {
    setFolders(generateFolders(emails))
  }, [emails])

  return {
    emails,
    selectedEmail,
    selectEmail,
    manualSync,
    isRealTimeEnabled,
    folders,
    loading,
    error
  }
} 