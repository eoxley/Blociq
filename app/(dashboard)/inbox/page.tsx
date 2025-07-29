import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { AlertTriangle } from 'lucide-react'
import InboxClient from './components/InboxClient'

interface Email {
  id: string
  subject: string | null
  from_email: string
  to_email: string | null
  body_preview: string | null
  received_at: string
  message_id: string | null
}

export default async function InboxPage() {
  const supabase = createClient(cookies())

  try {
    // Check authentication
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) redirect('/login')

    // Fetch emails from Supabase with only safe fields
    const { data: emails = [], error: emailsError } = await supabase
      .from('incoming_emails')
      .select('id, subject, from_email, to_email, body_preview, received_at, message_id')
      .order('received_at', { ascending: false })
      .limit(50)

    if (emailsError) {
      console.error('Error fetching emails:', emailsError)
      throw new Error('Failed to fetch emails')
    }

    // Pass emails as prop to client component
    return <InboxClient emails={emails} />

  } catch (error) {
    console.error('❌ Error in InboxPage:', error)
    
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Failed to load inbox</h2>
          <p className="text-gray-600 mb-4">
            {error instanceof Error ? error.message : 'An unexpected error occurred'}
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-gradient-to-r from-[#008C8F] to-[#7645ED] text-white px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }
}
