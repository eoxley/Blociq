import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { Mail, RefreshCw, AlertTriangle, CheckCircle, Clock } from 'lucide-react'
import PageHero from '@/components/PageHero';

export default async function TestOutlookPage() {
  const supabase = createClient(cookies())

  try {
    // Check authentication
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) redirect('/login')

    // Test Outlook integration
    let outlookStatus = null
    try {
      const statusResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/check-outlook-integration`)
      if (statusResponse.ok) {
        outlookStatus = await statusResponse.json()
      }
    } catch (error) {
      console.error('Error checking Outlook integration:', error)
    }

    // Test sync
    let syncResult = null
    try {
      const syncResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/sync-emails`, { method: 'POST' })
      if (syncResponse.ok) {
        syncResult = await syncResponse.json()
      }
    } catch (error) {
      console.error('Error testing sync:', error)
    }

    return (
      <>
        <PageHero title="Outlook Integration Test" subtitle="Check and test your Outlook integration and email sync." icon={<Mail className="h-8 w-8 text-white" />} />
        <div className="min-h-screen bg-gray-50 p-8">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">Outlook Integration Test</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              {/* Outlook Status */}
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Outlook Status</h2>
                {outlookStatus ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Token Status</span>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        outlookStatus.tokenStatus === 'valid' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {outlookStatus.tokenStatus}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Email Access</span>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        outlookStatus.emailAccess 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {outlookStatus.emailAccess ? 'Yes' : 'No'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Sync Ready</span>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        outlookStatus.syncReady 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {outlookStatus.syncReady ? 'Yes' : 'No'}
                      </span>
                    </div>
                    {outlookStatus.recentSubject && (
                      <div className="pt-3 border-t border-gray-200">
                        <span className="text-sm text-gray-600">Latest Email</span>
                        <p className="text-sm text-gray-900 mt-1">{outlookStatus.recentSubject}</p>
                      </div>
                    )}
                    {outlookStatus.error && (
                      <div className="pt-3 border-t border-gray-200">
                        <span className="text-sm text-red-600">{outlookStatus.error}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <AlertTriangle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">Unable to check status</p>
                  </div>
                )}
              </div>

              {/* Sync Test */}
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Sync Test</h2>
                {syncResult ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Success</span>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        syncResult.success 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {syncResult.success ? 'Yes' : 'No'}
                      </span>
                    </div>
                    {syncResult.synced !== undefined && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Emails Synced</span>
                        <span className="font-semibold text-gray-900">{syncResult.synced}</span>
                      </div>
                    )}
                    {syncResult.total !== undefined && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Total Found</span>
                        <span className="font-semibold text-gray-900">{syncResult.total}</span>
                      </div>
                    )}
                    {syncResult.message && (
                      <div className="pt-3 border-t border-gray-200">
                        <span className="text-sm text-gray-600">Message</span>
                        <p className="text-sm text-gray-900 mt-1">{syncResult.message}</p>
                      </div>
                    )}
                    {syncResult.error && (
                      <div className="pt-3 border-t border-gray-200">
                        <span className="text-sm text-red-600">{syncResult.error}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <RefreshCw className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">No sync test run</p>
                  </div>
                )}
              </div>
            </div>

            {/* Test Buttons */}
            <div className="mt-8 bg-white rounded-2xl shadow-xl p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Test Actions</h2>
              <div className="flex space-x-4">
                <button 
                  className="bg-gradient-to-r from-[#008C8F] to-[#7645ED] text-white px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
                  onClick={() => window.location.reload()}
                >
                  Refresh Status
                </button>
                <button 
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                  onClick={async () => {
                    try {
                      const response = await fetch('/api/sync-emails', { method: 'POST' })
                      const result = await response.json()
                      alert(JSON.stringify(result, null, 2))
                      window.location.reload()
                    } catch (error) {
                      alert('Sync failed: ' + error)
                    }
                  }}
                >
                  Test Sync
                </button>
                <a 
                  href="/inbox-overview"
                  className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Go to Inbox
                </a>
              </div>
            </div>
          </div>
        </div>
      </>
    )

  } catch (error) {
    console.error('❌ Error in TestOutlookPage:', error)
    
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error loading test page</h2>
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