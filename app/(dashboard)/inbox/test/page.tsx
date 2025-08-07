import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export default async function InboxTestPage() {
  console.log('🧪 InboxTestPage: Starting test...')
  
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
    console.log('✅ User authenticated:', userId)

    // Simple test query
    const result = await supabase
      .from('incoming_emails')
      .select('id, subject, from_email')
      .eq('user_id', userId)
      .limit(5)
    
    const emails = result.data || []
    console.log(`✅ Found ${emails.length} emails`)

    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Inbox Test Page</h1>
          
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Debug Info</h2>
            <div className="space-y-2 text-sm">
              <p><strong>User ID:</strong> {userId}</p>
              <p><strong>Emails Found:</strong> {emails.length}</p>
              <p><strong>Auth Status:</strong> ✅ Authenticated</p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Emails</h2>
            {emails.length > 0 ? (
              <div className="space-y-4">
                {emails.map((email) => (
                  <div key={email.id} className="border rounded p-4">
                    <p><strong>Subject:</strong> {email.subject || 'No Subject'}</p>
                    <p><strong>From:</strong> {email.from_email}</p>
                    <p><strong>ID:</strong> {email.id}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600">No emails found for this user.</p>
            )}
          </div>

          <div className="mt-6">
            <a 
              href="/inbox" 
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Back to Main Inbox
            </a>
          </div>
        </div>
      </div>
    )

  } catch (error) {
    console.error('❌ Error in InboxTestPage:', error)
    
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Test Failed</h2>
          <p className="text-gray-600 mb-4">
            {error instanceof Error ? error.message : 'An unexpected error occurred'}
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }
} 