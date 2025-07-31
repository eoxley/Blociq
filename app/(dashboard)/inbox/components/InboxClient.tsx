'use client'

import { useState, useEffect } from 'react'
import { Mail, RefreshCw, AlertTriangle, Search, Filter, Clock, User, CheckCircle, Flag } from 'lucide-react'

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
  created_at: string | null
  updated_at: string | null
}

interface InboxClientProps {
  emails: Email[]
}

export default function InboxClient({ emails }: InboxClientProps) {
  const [isSyncing, setIsSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'unread' | 'handled'>('all')
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null)

  useEffect(() => {
    console.log('🎯 InboxClient: Component mounted with', emails.length, 'emails')
    console.log('📧 Emails data:', emails)
  }, [emails])

  const handleSyncInbox = async () => {
    console.log('🔄 Starting inbox sync...')
    setIsSyncing(true)
    setError(null)
    
    try {
      const response = await fetch('/api/sync-inbox', { method: 'POST' })
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

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Unknown date'
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    
    if (diffInHours < 1) return 'Just now'
    if (diffInHours < 24) return `${Math.floor(diffInHours)}h ago`
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`
    return date.toLocaleDateString()
  }

  const getSenderInitials = (email: string | null) => {
    if (!email) return '?'
    return email.split('@')[0].substring(0, 2).toUpperCase()
  }

  const getSenderName = (email: string | null) => {
    if (!email) return 'Unknown'
    return email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  // Filter emails based on search and filter
  const filteredEmails = emails.filter(email => {
    const matchesSearch = !searchTerm || 
      email.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      email.from_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      email.body_preview?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesFilter = filterStatus === 'all' ||
      (filterStatus === 'unread' && email.unread) ||
      (filterStatus === 'handled' && email.handled)
    
    return matchesSearch && matchesFilter
  })

  const unreadCount = emails.filter(email => email.unread).length
  const handledCount = emails.filter(email => email.handled).length

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

  if (emails.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-lg">
            <Mail className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-6">No emails found</h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Your inbox is empty. Emails will appear here once they're synced from your connected account.
          </p>
          
          <button
            onClick={handleSyncInbox}
            disabled={isSyncing}
            className="inline-flex items-center gap-3 bg-gradient-to-r from-teal-600 to-teal-700 text-white px-8 py-4 rounded-xl hover:from-teal-700 hover:to-teal-800 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-1 disabled:opacity-50"
          >
            <RefreshCw className={`h-5 w-5 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing...' : 'Sync Emails'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Email Inbox</h1>
            <p className="text-gray-600 mt-2">Manage and respond to incoming emails</p>
          </div>
          
          <button
            onClick={handleSyncInbox}
            disabled={isSyncing}
            className="inline-flex items-center gap-2 bg-teal-600 text-white px-4 py-2 rounded-xl hover:bg-teal-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing...' : 'Sync'}
          </button>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search emails by subject, sender, or content..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-gray-900"
            />
          </div>
          
          <div className="flex gap-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white"
            >
              <option value="all">All ({emails.length})</option>
              <option value="unread">Unread ({unreadCount})</option>
              <option value="handled">Handled ({handledCount})</option>
            </select>
          </div>
        </div>
      </div>

      {/* Email List */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-900">Recent Emails</h2>
          <p className="text-sm text-gray-600 mt-1">{filteredEmails.length} emails</p>
        </div>
        
        <div className="max-h-[calc(100vh-300px)] overflow-y-auto">
          {filteredEmails.map((email) => {
            const isSelected = selectedEmail === email.id
            
            return (
              <div
                key={email.id}
                onClick={() => setSelectedEmail(email.id)}
                className={`p-4 border-b border-gray-100 cursor-pointer transition-all hover:bg-gray-50 ${
                  isSelected ? 'bg-teal-50 border-l-4 border-l-teal-500' : ''
                } ${email.unread ? 'bg-blue-50' : ''}`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-semibold text-sm">
                      {getSenderInitials(email.from_email)}
                    </span>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <span className={`font-medium truncate ${
                        email.unread ? 'text-gray-900' : 'text-gray-700'
                      }`}>
                        {getSenderName(email.from_email)}
                      </span>
                      <div className="flex items-center gap-2">
                        {email.flag_status === 'flagged' && (
                          <Flag className="h-4 w-4 text-orange-500" />
                        )}
                        <span className="text-xs text-gray-500">
                          {formatDate(email.received_at)}
                        </span>
                      </div>
                    </div>
                    
                    <h3 className={`font-medium mb-2 line-clamp-2 ${
                      email.unread ? 'text-gray-900' : 'text-gray-700'
                    }`}>
                      {email.subject || 'No subject'}
                    </h3>
                    
                    <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                      {email.body_preview || 'No preview available'}
                    </p>
                    
                    <div className="flex items-center gap-2">
                      {email.unread && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      )}
                      {email.handled && (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      )}
                      <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded-full">
                        {email.building_id ? `Building ${email.building_id}` : 'Unassigned'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Email Detail Panel */}
      {selectedEmail && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Email Detail</h2>
              <button
                onClick={() => setSelectedEmail(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            {(() => {
              const email = emails.find(e => e.id === selectedEmail)
              if (!email) return <p>Email not found</p>
              
              return (
                <div>
                  <div className="mb-4">
                    <h3 className="font-semibold text-lg mb-2">{email.subject || 'No subject'}</h3>
                    <p className="text-gray-600 mb-2">From: {email.from_email}</p>
                    <p className="text-gray-500 text-sm">{formatDate(email.received_at)}</p>
                  </div>
                  
                  <div className="border-t pt-4">
                    <p className="text-gray-700 whitespace-pre-wrap">
                      {email.body_preview || 'No content available'}
                    </p>
                  </div>
                  
                  <div className="mt-6 flex gap-2">
                    <button className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700">
                      Reply
                    </button>
                    <button className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">
                      Forward
                    </button>
                  </div>
                </div>
              )
            })()}
          </div>
        </div>
      )}
    </div>
  )
}