'use client'

import { useState, useEffect } from 'react'
import { Mail, RefreshCw, AlertTriangle } from 'lucide-react'

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

interface InboxClientProps {
  emails: Email[]
}

export default function InboxClient({ emails }: InboxClientProps) {
  const [isSyncing, setIsSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    console.log('🎯 InboxClient: Component mounted with', emails.length, 'emails')
    console.log('📧 Emails data:', emails)
  }, [emails])

  const handleSyncInbox = async () => {
    console.log('🔄 Starting inbox sync...')
    setIsSyncing(true)
    setError(null)
    
    try {
      // First, fix any existing emails without user_id
      const fixResponse = await fetch('/api/fix-email-user-association', { method: 'POST' })
      const fixResult = await fixResponse.json()
      
      if (fixResult.success && fixResult.updatedCount > 0) {
        console.log(`✅ Fixed ${fixResult.updatedCount} emails without user_id`)
      }

      // Then sync new emails
      const response = await fetch('/api/sync-emails', { method: 'POST' })
      const result = await response.json()
      
      if (result.success) {
        // Show success toast
        showToast('Inbox updated successfully!', 'success')
        // Reload page to show new emails
        setTimeout(() => window.location.reload(), 1000)
      } else {
        setError(result.error || 'Sync failed')
        showToast(result.error || 'Sync failed', 'error')
      }
    } catch (error) {
      const errorMessage = 'Sync failed - please try again'
      setError(errorMessage)
      showToast(errorMessage, 'error')
    } finally {
      setIsSyncing(false)
    }
  }

  const showToast = (message: string, type: 'success' | 'error') => {
    // Simple toast implementation
    const toast = document.createElement('div')
    toast.className = `fixed top-4 right-4 px-6 py-3 rounded-lg text-white z-50 ${
      type === 'success' ? 'bg-green-600' : 'bg-red-600'
    }`
    toast.textContent = message
    document.body.appendChild(toast)
    setTimeout(() => toast.remove(), 3000)
  }

  console.log('🎨 InboxClient: Rendering component...')

  if (error) {
    console.log('❌ InboxClient: Rendering error state')
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="max-w-md mx-auto text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Failed to load inbox</h2>
          <p className="text-gray-600 mb-4">{error}</p>
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

  console.log('✅ InboxClient: Rendering main UI')

  return (
    <div className="w-full">
      {/* TOP: Inbox Header with BlocIQ Gradient */}
      <div className="bg-gradient-to-r from-[#008C8F] to-[#7645ED] text-white rounded-2xl mb-6">
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                <Mail className="h-8 w-8" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Inbox</h1>
                <p className="text-white/80 text-lg">
                  {emails.length} email{emails.length !== 1 ? 's' : ''} • 
                  {emails.filter(e => e.unread).length} unread
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button 
                onClick={handleSyncInbox}
                disabled={isSyncing}
                className="bg-white/20 text-white px-4 py-2 rounded-lg hover:bg-white/30 transition-colors flex items-center disabled:opacity-50"
                aria-label="Sync inbox"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                {isSyncing ? 'Syncing...' : 'Sync Inbox'}
              </button>
              {emails.length === 0 && (
                <button 
                  onClick={async () => {
                    setIsSyncing(true)
                    try {
                      const response = await fetch('/api/fix-email-user-association', { method: 'POST' })
                      const result = await response.json()
                      if (result.success) {
                        showToast(result.message, 'success')
                        setTimeout(() => window.location.reload(), 1000)
                      } else {
                        showToast(result.error || 'Failed to fix emails', 'error')
                      }
                    } catch (error) {
                      showToast('Failed to fix emails', 'error')
                    } finally {
                      setIsSyncing(false)
                    }
                  }}
                  disabled={isSyncing}
                  className="bg-white/20 text-white px-4 py-2 rounded-lg hover:bg-white/30 transition-colors flex items-center disabled:opacity-50"
                  aria-label="Fix email association"
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Fix Email Association
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-2xl shadow-xl">
        
        {/* Email List Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h2 className="text-xl font-semibold text-gray-900">Messages</h2>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500">
                  {emails.filter(e => e.unread).length} unread
                </span>
                <span className="text-sm text-gray-500">•</span>
                <span className="text-sm text-gray-500">
                  {emails.length} total
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Email List */}
        <div className="divide-y divide-gray-200">
          {emails.length > 0 ? (
            emails.map((email) => (
              <div 
                key={email.id} 
                className={`p-6 hover:bg-gray-50 transition-colors cursor-pointer ${email.unread ? 'bg-blue-50' : ''}`}
              >
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    {email.unread ? (
                      <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                    ) : (
                      <div className="w-3 h-3 bg-gray-300 rounded-full"></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <p className={`text-sm font-medium ${email.unread ? 'text-gray-900' : 'text-gray-700'}`}>
                          {email.from_name || email.from_email}
                        </p>
                        {email.unread && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            New
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-500">
                          {new Date(email.received_at).toLocaleDateString()}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(email.received_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                    <p className={`text-sm font-medium mt-1 ${email.unread ? 'text-gray-900' : 'text-gray-700'}`}>
                      {email.subject || 'No Subject'}
                    </p>
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                      {email.body?.substring(0, 150) || 'No preview available'}
                    </p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-12 text-center">
              <Mail className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No emails yet</h3>
              <p className="text-gray-600 mb-6">
                Your inbox is empty. Click "Sync Inbox" to fetch emails from Outlook.
              </p>
              <button 
                onClick={handleSyncInbox}
                disabled={isSyncing}
                className="bg-gradient-to-r from-[#008C8F] to-[#7645ED] text-white px-6 py-3 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                aria-label="Sync inbox"
              >
                <RefreshCw className={`h-4 w-4 mr-2 inline ${isSyncing ? 'animate-spin' : ''}`} />
                {isSyncing ? 'Syncing...' : 'Sync Inbox'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}