import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import NewInboxClient from './NewInboxClient'

interface Email {
  id: string
  subject: string | null
  from_name: string | null
  from_email: string | null
  received_at: string | null
  body_preview: string | null
  body_full: string | null
  building_id: string | null
  unread: boolean | null
  handled: boolean | null
  tags: string[] | null
  outlook_id: string | null
  buildings?: { name: string } | null
}

export default async function InboxPage() {
  const supabase = createClient(cookies())
  
  try {
    // Check authentication
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      redirect('/login')
    }

    const userId = session.user.id

    // Fetch initial emails
    const { data: emailsData, error: emailsError } = await supabase
      .from('incoming_emails')
      .select(`
        id, 
        subject, 
        from_email, 
        from_name, 
        received_at, 
        body_preview, 
        body as body_full, 
        building_id, 
        is_read, 
        is_handled, 
        tags, 
        outlook_id, 
        outlook_message_id,
        created_at
      `)
      .eq('user_id', userId)
      .order('received_at', { ascending: false })
      .limit(50)

    if (emailsError) {
      console.error('Error fetching emails:', emailsError)
      return (
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-600 font-semibold">Error loading emails</p>
            <p className="text-red-500 text-sm">{emailsError.message}</p>
          </div>
        </div>
      )
    }

    // Process emails to match the expected interface
    const processedEmails: Email[] = (emailsData || []).map((email: any) => ({
      id: email.id,
      subject: email.subject || 'No Subject',
      from_name: email.from_name || email.from_email || 'Unknown Sender',
      from_email: email.from_email || 'unknown@example.com',
      received_at: email.received_at,
      body_preview: email.body_preview || 'No preview available',
      body_full: email.body_full || email.body_preview || 'No content available',
      building_id: email.building_id,
      unread: !email.is_read, // Invert is_read to get unread status
      handled: email.is_handled || false,
      tags: email.tags || [],
      outlook_id: email.outlook_id || email.outlook_message_id || null,
      buildings: null // Will be populated if needed
    }))

    // Get last sync time
    const { data: lastSyncData } = await supabase
      .from('incoming_emails')
      .select('last_sync_at')
      .eq('user_id', userId)
      .not('last_sync_at', 'is', null)
      .order('last_sync_at', { ascending: false })
      .limit(1)
      .single()

    const lastSyncTime = lastSyncData?.last_sync_at || null

    return (
      <NewInboxClient
        initialEmails={processedEmails}
        lastSyncTime={lastSyncTime}
        userId={userId}
      />
    )
  } catch (error) {
    console.error('Error in InboxPage:', error)
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600 font-semibold">Error loading inbox</p>
          <p className="text-red-500 text-sm">
            {error instanceof Error ? error.message : 'An unexpected error occurred'}
          </p>
        </div>
      </div>
    )
  }
}
