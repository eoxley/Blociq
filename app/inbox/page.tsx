import LayoutWithSidebar from '@/components/LayoutWithSidebar'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import NewInboxClient from './NewInboxClient'

interface InboxPageProps {
  searchParams: Promise<{ success?: string; email?: string; error?: string }>
}

export default async function InboxPage({ searchParams }: InboxPageProps) {
  const supabase = createServerComponentClient({ cookies })
  
  // Check if user is authenticated
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  console.log('🔍 Inbox page - User authenticated:', user.id)

  // Fetch all emails from Supabase (no limit)
  const { data: rawEmails, error } = await supabase
    .from('incoming_emails')
    .select(`
      id,
      subject,
      from_name,
      from_email,
      received_at,
      body_preview,
      body_full,
      building_id,
      is_read,
      is_handled,
      tags,
      outlook_id
    `)
    .eq('is_deleted', false) // Filter out deleted emails
    .eq('user_id', user.id) // Only get emails for this user
    .order('received_at', { ascending: false })

  console.log('📧 Inbox page - Emails fetched:', rawEmails?.length || 0)
  console.log('📧 Inbox page - First email:', rawEmails?.[0])

  if (error) {
    console.error('❌ Error fetching emails:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
      user_id: user.id
    })
  }

  // Process emails to match the Email interface
  const emails = rawEmails?.map((email: any) => ({
    ...email,
    buildings: null, // Set to null since we're not joining buildings table
    // Ensure all required fields have fallback values
    subject: email.subject || 'No Subject',
    from_name: email.from_name || email.from_email || 'Unknown Sender',
    from_email: email.from_email || 'unknown@example.com',
    body_preview: email.body_preview || 'No preview available',
    body_full: email.body_full || email.body_preview || 'No content available',
    is_read: email.is_read || false,
    is_handled: email.is_handled || false,
    tags: email.tags || [],
    building_id: email.building_id || null,
    outlook_id: email.outlook_id || null
  })) || []

  // Get last sync time
  const { data: lastSync } = await supabase
    .from('incoming_emails')
    .select('received_at')
    .order('received_at', { ascending: false })
    .limit(1)

  const lastSyncTime = lastSync?.[0]?.received_at || null
  const params = await searchParams

  console.log('🕐 Inbox page - Last sync time:', lastSyncTime)
  console.log('🔗 Inbox page - Search params:', params)

    return (
    <LayoutWithSidebar>
      <NewInboxClient
        initialEmails={emails || []} // Pass fetched emails to show immediately
        lastSyncTime={lastSyncTime}
        userId={user.id}
        searchParams={params}
      />
    </LayoutWithSidebar>
  )
}
