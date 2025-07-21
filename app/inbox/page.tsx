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
      outlook_id,
      buildings(name)
    `)
    .eq('is_deleted', false) // Filter out deleted emails
    .order('received_at', { ascending: false })

  console.log('📧 Inbox page - Emails fetched:', rawEmails?.length || 0)
  console.log('📧 Inbox page - First email:', rawEmails?.[0])

  if (error) {
    console.error('❌ Error fetching emails:', error)
  }

  // Process emails to match the Email interface
  const emails = rawEmails?.map((email: any) => ({
    ...email,
    buildings: Array.isArray(email.buildings) ? email.buildings[0] : email.buildings
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
