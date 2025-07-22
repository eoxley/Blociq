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

  // Fetch all emails from Supabase (no limit) - exclude deleted emails
  const { data: rawEmails, error } = await supabase
    .from('incoming_emails')
    .select(`
      id,
      subject,
      from_email,
      received_at,
      body_preview,
      building_id,
      unit_id,
      leaseholder_id,
      unread,
      handled,
      pinned,
      flag_status,
      categories,
      tag,
      message_id,
      thread_id,
      unit,
      user_id,
      created_at,
      buildings (name),
      units (unit_number),
      leaseholders (name, email)
    `)
    .eq('user_id', user.id) // Only get emails for this user
    .neq('tag', 'deleted') // Exclude deleted emails
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
    // Map database fields to expected interface fields
    subject: email.subject || 'No Subject',
    from_name: email.from_email || 'Unknown Sender', // Use from_email as from_name
    from_email: email.from_email || 'unknown@example.com',
    body_preview: email.body_preview || 'No preview available',
    body_full: email.body_preview || 'No content available', // Use body_preview as body_full
    is_read: !email.unread, // Convert unread to is_read (inverted)
    is_handled: email.handled || false,
    tags: email.tag ? [email.tag] : [], // Convert single tag to array
    building_id: email.building_id || null,
    outlook_id: email.message_id || null // Use message_id as outlook_id
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
      <NewInboxClient
        initialEmails={emails || []} // Pass fetched emails to show immediately
        lastSyncTime={lastSyncTime}
        userId={user.id}
        searchParams={params}
      />
    )
}
