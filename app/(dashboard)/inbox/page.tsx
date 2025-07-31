import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { AlertTriangle } from 'lucide-react'
import InboxClient from './components/InboxClient'

interface Email {
  id: string
  subject: string | null
  from_email: string
  from_name: string | null
  body: string | null
  received_at: string
  handled: boolean
  unread: boolean
  thread_id: string | null
  user_id: string | null
  created_at: string
  updated_at: string
}

export default async function InboxPage() {
  const supabase = createClient(cookies())

  try {
    // Check authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    
    if (authError) {
      console.error('Auth error:', authError)
      throw new Error('Authentication failed')
    }
    
    if (!session) {
      redirect('/login')
    }

    const userId = session.user.id
    console.log('✅ User authenticated:', userId)

    // First, let's test if the table exists and what columns it has
    let emails: Email[] = []
    let emailsError = null
    
    try {
      // Try a simple query first to see if the table exists
      const tableTest = await supabase
        .from('incoming_emails')
        .select('id')
        .limit(1)
      
      if (tableTest.error) {
        console.error('Table test error:', tableTest.error)
        throw new Error(`Database table error: ${tableTest.error.message}`)
      }

      // Now try the full query with the correct schema from types/supabase.ts
      // Fetch emails for the current user
      const result = await supabase
        .from('incoming_emails')
        .select('id, subject, from_email, from_name, body, received_at, handled, unread, thread_id, user_id, created_at, updated_at')
        .eq('user_id', userId) // Only fetch emails for current user
        .order('received_at', { ascending: false })
        .limit(50)
      
      emails = result.data || []
      emailsError = result.error
      
      console.log(`✅ Found ${emails.length} emails for user ${userId}`)
      
    } catch (dbError) {
      console.error('Database query error:', dbError)
      emailsError = dbError as any
    }

    if (emailsError) {
      console.error('Error fetching emails:', emailsError)
      // Don't throw error, just pass empty array to client
      emails = []
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
