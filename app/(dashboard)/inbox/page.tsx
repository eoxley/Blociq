import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { AlertTriangle, Mail } from 'lucide-react'
import InboxClient from './InboxClient'
import PageHero from '@/components/PageHero'

export default async function InboxPage() {
  console.log('🚀 InboxPage: Starting to render...')
  
  const supabase = createClient(cookies())

  try {
    // ✅ STEP 1: SESSION HANDLING
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
    console.log('✅ User authenticated:', userEmail)

    console.log('🎯 About to render InboxClient')
    
    // InboxClient uses useInbox hook to fetch its own data
    return (
      <div className="space-y-6">
        {/* Hero Banner */}
        <PageHero
          title="Email Inbox"
          subtitle="Manage and respond to all your property-related emails in one place"
          icon={<Mail className="h-8 w-8 text-white" />}
        />
        
        <InboxClient />
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
