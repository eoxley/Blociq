import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { AlertTriangle, Mail } from 'lucide-react'
import NewInboxClient from './NewInboxClient'
import PageHero from '@/components/PageHero'

export default async function InboxPage() {
  console.log('🚀 InboxPage: Starting to render...')
  
  try {
    const supabase = createClient(cookies())

    // ✅ STEP 1: USER AUTHENTICATION
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError) {
      console.error('❌ Auth error:', authError)
      throw new Error('Authentication failed')
    }
    
    if (!user) {
      console.log('❌ No user found, redirecting to login')
      redirect('/login')
    }

    const userId = user.id
    const userEmail = user.email
    console.log('✅ User authenticated:', userEmail)

    // ✅ STEP 2: FETCH INITIAL EMAILS FOR V2 INBOX
    console.log('📧 Fetching initial emails for V2 inbox...')
    const { data: emails, error: emailsError } = await supabase
      .from('incoming_emails')
      .select(`
        *,
        buildings(name)
      `)
      .eq('user_id', userId)
      .order('received_at', { ascending: false })
      .limit(50)

    if (emailsError) {
      console.error('❌ Error fetching emails:', emailsError)
      // Don't fail the page, just pass empty array
    }

    // ✅ STEP 3: GET LAST SYNC TIME
    const { data: syncData } = await supabase
      .from('outlook_sync_status')
      .select('last_sync_at')
      .eq('user_id', userId)
      .single()

    const lastSyncTime = syncData?.last_sync_at || null

    console.log('🎯 About to render NewInboxClient (V2)')
    
    // NewInboxClient (V2) with initial data
    return (
      <div className="space-y-6">
        {/* Hero Banner */}
        <PageHero
          title="Email Inbox"
          subtitle="Manage and respond to all your property-related emails in one place"
          icon={<Mail className="h-8 w-8 text-white" />}
        />
        
        <NewInboxClient 
          initialEmails={emails || []}
          lastSyncTime={lastSyncTime}
          userId={userId}
        />
      </div>
    )

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
