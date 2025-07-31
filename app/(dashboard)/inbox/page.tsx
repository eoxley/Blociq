import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { AlertTriangle } from 'lucide-react'
import InboxClient from './InboxClient'

interface Email {
  id: string
  subject: string | null
  from_email: string | null
  from_name: string | null
  body_preview: string | null
  received_at: string | null
  unread: boolean | null
  handled: boolean | null
  pinned: boolean | null
  flag_status: string | null
  categories: string[] | null
  building_id: number | null
  unit_id: number | null
  leaseholder_id: string | null
  user_id: string | null
  to_email: string[] | null
  created_at: string | null
  updated_at: string | null
}

export default async function InboxPage() {
  console.log('🚀 InboxPage: Starting to render...')
  
  const supabase = createClient(cookies())

  try {
    // Check authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    
    if (authError) {
      console.error('❌ Auth error:', authError)
      throw new Error('Authentication failed')
    }
    
    if (!session) {
      console.log('❌ No session found, redirecting to login')
      redirect('/login')
    }

    const userId = session.user.id
    const userEmail = session.user.email
    console.log('✅ User authenticated:', userId, 'Email:', userEmail)

    // First, let's test if the table exists and what columns it has
    let emails: Email[] = []
    let emailsError = null
    
    try {
      console.log('🔍 Testing database connection...')
      
      // Try a simple query first to see if the table exists
      const tableTest = await supabase
        .from('incoming_emails')
        .select('id')
        .limit(1)
      
      if (tableTest.error) {
        console.error('❌ Table test error:', tableTest.error)
        throw new Error(`Database table error: ${tableTest.error.message}`)
      }

      console.log('✅ Table test successful')

      // Now try the full query with the correct schema
      // Fetch ALL emails for the current user by recipient email
      const result = await supabase
        .from('incoming_emails')
        .select(`
          id, 
          subject, 
          from_email, 
          from_name, 
          body_preview, 
          received_at, 
          is_read, 
          is_handled, 
          user_id, 
          created_at, 
          updated_at,
          building_id,
          unit_id,
          leaseholder_id,
          to_email
        `)
        .or(`to_email.cs.{${userEmail}},to_email.ilike.%${userEmail}%`) // Fetch emails where user is recipient
        .order('received_at', { ascending: false })
        .limit(50)
      
      if (result.error) {
        console.error('❌ Emails query error:', result.error)
        emailsError = result.error
      } else {
        // Map database fields to expected interface
        emails = (result.data || []).map(email => ({
          id: email.id,
          subject: email.subject,
          from_email: email.from_email,
          from_name: email.from_name,
          body_preview: email.body_preview,
          received_at: email.received_at,
          unread: !email.is_read, // Map is_read to unread (inverted)
          handled: email.is_handled, // Map is_handled to handled
          pinned: false, // Default value since not in schema
          flag_status: null, // Default value since not in schema
          categories: null, // Default value since not in schema
          building_id: email.building_id,
          unit_id: email.unit_id,
          leaseholder_id: email.leaseholder_id,
          user_id: email.user_id,
          to_email: email.to_email,
          created_at: email.created_at,
          updated_at: email.updated_at
        }))
        
        console.log(`✅ Found ${emails.length} emails for user ${userId} (${userEmail})`)
      }
      
    } catch (dbError) {
      console.error('❌ Database query error:', dbError)
      emailsError = dbError as any
    }

    if (emailsError) {
      console.error('❌ Error fetching emails:', emailsError)
      // Don't throw error, just pass empty array to client
      emails = []
    }

    console.log('🎯 About to render InboxClient with', emails.length, 'emails')
    
    // Pass emails as prop to client component
    return <InboxClient emails={emails} />

  } catch (error) {
    console.error('❌ Error in InboxPage:', error)
    
    return (
      <div className="flex items-center justify-center min-h-[400px]">
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
