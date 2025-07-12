import LayoutWithSidebar from '@/components/LayoutWithSidebar'
import InboxClient from './InboxClient'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function InboxPage() {
  const supabase = createServerComponentClient({ cookies })
  
  // Check if user is authenticated
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  // Fetch emails from incoming_emails table
  const { data: emails, error } = await supabase
    .from('incoming_emails')
    .select('*')
    .order('received_at', { ascending: false })

  if (error) {
    console.error('Error fetching emails:', error)
  }

  return (
    <LayoutWithSidebar>
      <div className="p-6">
        <h1 className="text-3xl font-bold text-[#0F5D5D] mb-6">Inbox</h1>
        <InboxClient emails={emails || []} />
      </div>
    </LayoutWithSidebar>
  )
}
