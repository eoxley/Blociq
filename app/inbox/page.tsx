import LayoutWithSidebar from '@/components/LayoutWithSidebar'
import InboxClient from './InboxClient'
import InboxSummary from '@/components/InboxSummary'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

// Example email data for UK leasehold block management
const exampleEmails = [
  {
    id: '1',
    from_email: 'mrs.patel@flat15ashwood.com',
    subject: 'Service Charge Payment Query - Flat 15',
    body_preview: 'Dear Management Company, I have received my service charge demand for 2024/25 and would like clarification on the 15% increase from last year. The major works contribution seems higher than expected. Could you please provide a breakdown of the costs?',
    received_at: '2024-01-15T14:30:00Z',
    unread: true,
    handled: false,
    pinned: false,
    flag_status: null,
    categories: ['Service Charge', 'Financial']
  },
  {
    id: '2',
    from_email: 'mr.thompson@flat8ashwood.com',
    subject: 'URGENT: Water Leak - Flat 8 affecting Flat 7',
    body_preview: 'There is a significant water leak in my bathroom that is now affecting the flat below (Flat 7). Water is coming through the ceiling in their bathroom. This appears to be from a pipe in the wall. Please arrange emergency repairs as soon as possible.',
    received_at: '2024-01-15T11:15:00Z',
    unread: true,
    handled: false,
    pinned: true,
    flag_status: 'flagged',
    categories: ['Maintenance', 'Emergency', 'Urgent']
  },
  {
    id: '3',
    from_email: 'certificates@firesafetyltd.co.uk',
    subject: 'Fire Alarm Inspection Certificate - Ashwood Court',
    body_preview: 'Please find attached the annual fire alarm inspection certificate for Ashwood Court, completed on 12th January 2024. All systems are functioning correctly and meet current regulations. The certificate is valid until 12th January 2025.',
    received_at: '2024-01-14T16:45:00Z',
    unread: false,
    handled: true,
    pinned: false,
    flag_status: null,
    categories: ['Compliance', 'Fire Safety', 'Certificates']
  },
  {
    id: '4',
    from_email: 'mr.williams@flat22ashwood.com',
    subject: 'Major Works Update Request - Roof Replacement',
    body_preview: 'I understand that major works are planned for the roof replacement this year. Could you please provide an update on the timeline and expected costs? I need to plan my finances accordingly and would appreciate any information on when the works will commence.',
    received_at: '2024-01-14T13:20:00Z',
    unread: true,
    handled: false,
    pinned: false,
    flag_status: null,
    categories: ['Major Works', 'Planning']
  },
  {
    id: '5',
    from_email: 'chairman@ashwoodrmc.org.uk',
    subject: 'Building Insurance Review - RMC Board Meeting',
    body_preview: 'As Chairman of the RMC, I need to review the current building insurance policy before our next board meeting. Could you please provide the current policy details, including coverage limits and any recent claims history? We need to ensure adequate cover for the building structure.',
    received_at: '2024-01-13T15:10:00Z',
    unread: false,
    handled: false,
    pinned: true,
    flag_status: 'flagged',
    categories: ['Insurance', 'RMC', 'Board']
  }
]

export default async function InboxPage() {
  const supabase = createServerComponentClient({ cookies })
  
  // Check if user is authenticated
  const { data: { user } } = await supabase.auth.getUser()
  
  // Temporarily bypass authentication for demonstration
  // if (!user) {
  //   redirect('/login')
  // }

  // Use example data instead of fetching from database
  const emails = exampleEmails

  // Original database fetch (commented out for now)
  // const { data: emails, error } = await supabase
  //   .from('incoming_emails')
  //   .select('*')
  //   .order('received_at', { ascending: false })

  // if (error) {
  //   console.error('Error fetching emails:', error)
  // }

  return (
    <LayoutWithSidebar>
      <div className="p-6 space-y-6">
        {/* Header with Back to Home navigation */}
        <div className="flex items-center gap-4 mb-6">
          <Link 
            href="/home" 
            className="inline-flex items-center gap-2 px-4 py-2 bg-teal-50 text-teal-700 rounded-lg hover:bg-teal-100 transition-colors border border-teal-200"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
          <h1 className="text-3xl font-bold text-[#0F5D5D]">Inbox</h1>
        </div>
        
        {/* Inbox Summary */}
        <div className="max-w-4xl">
          <InboxSummary />
        </div>
        
        {/* Inbox Client */}
        <InboxClient emails={emails} />
      </div>
    </LayoutWithSidebar>
  )
}
