import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { Mail, RefreshCw, AlertTriangle, CheckCircle, Clock, Search, Filter, Download, Trash2, Archive, Star, Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'

interface Email {
  id: string
  subject: string | null
  from_email: string
  from_name: string | null
  to_email: string | null
  body_preview: string | null
  body: string | null
  received_at: string
  outlook_message_id: string | null
  unread: boolean
  handled: boolean
  building_id: string | null
  leaseholder_id: string | null
  thread_id: string | null
  user_id: string | null
  created_at: string
  updated_at: string
}

export default async function InboxPage() {
  const supabase = createClient(cookies())

  try {
    // Check authentication
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) redirect('/login')

    // Fetch emails from Supabase with correct field names
    const { data: emails = [], error: emailsError } = await supabase
      .from('incoming_emails')
      .select(`
        id,
        subject,
        from_email,
        from_name,
        to_email,
        body_preview,
        body,
        received_at,
        outlook_message_id,
        unread,
        handled,
        building_id,
        leaseholder_id,
        thread_id,
        user_id,
        created_at,
        updated_at
      `)
      .order('received_at', { ascending: false })
      .limit(50)

    if (emailsError) {
      console.error('Error fetching emails:', emailsError)
    }

    return (
      <div className="min-h-screen bg-gray-50">
        {/* TOP: Inbox Header with BlocIQ Gradient */}
        <div className="bg-gradient-to-r from-[#008C8F] to-[#7645ED] text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
                  className="bg-white/20 text-white px-4 py-2 rounded-lg hover:bg-white/30 transition-colors flex items-center"
                  id="sync-inbox-btn"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Sync Inbox
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
                          {email.body_preview || email.body?.substring(0, 150) || 'No preview available'}
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
                    className="bg-gradient-to-r from-[#008C8F] to-[#7645ED] text-white px-6 py-3 rounded-lg hover:opacity-90 transition-opacity"
                    id="sync-empty-inbox-btn"
                  >
                    <RefreshCw className="h-4 w-4 mr-2 inline" />
                    Sync Inbox
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sync Button Script */}
        <script dangerouslySetInnerHTML={{
          __html: `
            document.addEventListener('DOMContentLoaded', function() {
              const syncButtons = document.querySelectorAll('#sync-inbox-btn, #sync-empty-inbox-btn');
              
              syncButtons.forEach(button => {
                button.addEventListener('click', async function() {
                  const originalText = button.innerHTML;
                  button.innerHTML = '<RefreshCw class="h-4 w-4 mr-2 animate-spin" /> Syncing...';
                  button.disabled = true;
                  
                  try {
                    const response = await fetch('/api/sync-emails', { method: 'POST' });
                    const result = await response.json();
                    
                    if (result.success) {
                      // Show success toast
                      showToast('Inbox updated successfully!', 'success');
                      // Reload page to show new emails
                      setTimeout(() => window.location.reload(), 1000);
                    } else {
                      showToast(result.error || 'Sync failed', 'error');
                    }
                  } catch (error) {
                    showToast('Sync failed - please try again', 'error');
                  } finally {
                    button.innerHTML = originalText;
                    button.disabled = false;
                  }
                });
              });
              
              function showToast(message, type) {
                // Simple toast implementation
                const toast = document.createElement('div');
                toast.className = \`fixed top-4 right-4 px-6 py-3 rounded-lg text-white z-50 \${
                  type === 'success' ? 'bg-green-600' : 'bg-red-600'
                }\`;
                toast.textContent = message;
                document.body.appendChild(toast);
                setTimeout(() => toast.remove(), 3000);
              }
            });
          `
        }} />
      </div>
    )

  } catch (error) {
    console.error('❌ Error in InboxPage:', error)
    
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error loading inbox</h2>
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
