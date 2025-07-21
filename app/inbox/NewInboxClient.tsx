'use client'

import React, { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import {
  Mail,
  RefreshCw,
  Clock,
  Search,
  Loader2,
  Building as BuildingIcon,
  Inbox as InboxIcon,
  CheckCircle,
  Folder,
  Plus,
  Brain,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import EmailListItem from './components/EmailListItem'
import EmailDetail from './components/EmailDetail'
import AIActionBar from './components/AIActionBar'
import ComposeEmailModal from './components/ComposeEmailModal'
import FolderSidebar from './components/FolderSidebar'
import TriageAssistant from './components/TriageAssistant'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'

interface Email {
  id: string
  subject: string | null
  from_name: string | null
  from_email: string | null
  received_at: string | null
  body_preview: string | null
  body_full: string | null
  building_id: string | null
  is_read: boolean | null
  is_handled: boolean | null
  tags: string[] | null
  outlook_id: string | null
  buildings?: { name: string } | null
}

interface Building {
  id: string
  name: string
}

interface NewInboxClientProps {
  initialEmails: Email[]
  lastSyncTime: string | null
  userId: string
  searchParams?: { success?: string; email?: string; error?: string }
}

export default function NewInboxClient({
  initialEmails,
  lastSyncTime,
  userId,
  searchParams,
}: NewInboxClientProps) {
  const supabase = createClientComponentClient()
  const [emails, setEmails] = useState<Email[]>(initialEmails)
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null)
  const [isSyncing, setIsSyncing] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filter, setFilter] = useState<string>('inbox')
  const [lastSync, setLastSync] = useState<string | null>(lastSyncTime)
  const [buildings, setBuildings] = useState<Building[]>([])
  const [loadingEmails, setLoadingEmails] = useState(false)
  const [isComposeModalOpen, setIsComposeModalOpen] = useState(false)
  const [isTriageAssistantOpen, setIsTriageAssistantOpen] = useState(false)

  // Fetch emails based on filter
  useEffect(() => {
    const fetchEmails = async () => {
      setLoadingEmails(true)
      console.log('🔄 NewInboxClient - Fetching emails with filter:', filter)
      
      let query = supabase
        .from('incoming_emails')
        .select(`
          id, subject, from_name, from_email, received_at, body_preview, body_full, building_id, is_read, is_handled, tags, outlook_id, buildings(name)
        `)
        .order('received_at', { ascending: false })

      // Apply filters based on current filter state
      if (filter === 'inbox') {
        // Show all emails in inbox (not just unhandled ones)
        console.log('📧 NewInboxClient - Showing all emails in inbox')
      } else if (filter === 'handled') {
        query = query.eq('is_handled', true)
        console.log('📧 NewInboxClient - Filtering for handled emails')
      } else if (filter === 'unhandled') {
        query = query.eq('is_handled', false)
        console.log('📧 NewInboxClient - Filtering for unhandled emails')
      } else if (filter.startsWith('building-')) {
        const buildingId = filter.replace('building-', '')
        query = query.eq('building_id', buildingId)
        console.log('📧 NewInboxClient - Filtering for building:', buildingId)
      } else if (filter.startsWith('tag-')) {
        const tag = filter.replace('tag-', '')
        query = query.contains('tags', [tag])
        console.log('📧 NewInboxClient - Filtering for tag:', tag)
      } else {
        console.log('📧 NewInboxClient - Showing all emails (no filter)')
      }

      const { data, error } = await query
      console.log('📧 NewInboxClient - Query result:', { dataCount: data?.length || 0, error })
      
      if (!error && data) {
        // Fix buildings property: flatten if array
        const processedEmails = data.map((email: any) => ({
          ...email,
          buildings: Array.isArray(email.buildings) ? email.buildings[0] : email.buildings
        }))
        setEmails(processedEmails)
        console.log('📧 NewInboxClient - Processed emails:', processedEmails.length)
        console.log('📧 NewInboxClient - First email:', processedEmails[0])
      } else if (error) {
        console.error('❌ NewInboxClient - Query error:', error)
      }
      setLoadingEmails(false)
    }
    fetchEmails()
  }, [filter, supabase])

  // Filter emails by search
  const filteredEmails = emails.filter(email => {
    const matchesSearch = searchTerm === '' ||
      email.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      email.from_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      email.from_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      email.body_preview?.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesSearch
  })

  // Sync emails from Outlook
  const handleSync = async () => {
    setIsSyncing(true)
    try {
      console.log('🔄 Starting inbox sync...')
      const response = await fetch('/api/sync-inbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      
      const data = await response.json()
      console.log('📊 Sync response:', data)
      
      if (response.ok) {
        setFilter('inbox') // Always show inbox after sync
        setLastSync(new Date().toISOString())
        
        if (data.synced_count > 0) {
          toast.success(`✅ Synced ${data.synced_count} new emails`)
        } else if (data.total_processed > 0) {
          toast.info(`📧 No new emails to sync (${data.total_processed} emails checked)`)
        } else {
          toast.info('📧 No emails found to sync')
        }
        
        // Refresh the email list to show new emails
        const { data: refreshedEmails } = await supabase
          .from('incoming_emails')
          .select(`
            id, subject, from_name, from_email, received_at, body_preview, body_full, building_id, is_read, is_handled, tags, outlook_id, buildings(name)
          `)
          .order('received_at', { ascending: false })
        
        if (refreshedEmails) {
          setEmails(refreshedEmails.map((email: any) => ({
            ...email,
            buildings: Array.isArray(email.buildings) ? email.buildings[0] : email.buildings
          })))
        }
      } else {
        console.error('❌ Sync failed:', data)
        toast.error(`❌ Sync failed: ${data.message || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('❌ Sync error:', error)
      toast.error('❌ Sync failed: Network error')
    } finally {
      setIsSyncing(false)
    }
  }

  // Mark email as handled
  const markAsHandled = async (emailId: string) => {
    try {
      const { error } = await supabase
        .from('incoming_emails')
        .update({ is_handled: true, handled_at: new Date().toISOString() })
        .eq('id', emailId)
      if (!error) {
        setEmails(prev => prev.map(email =>
          email.id === emailId ? { ...email, is_handled: true } : email
        ))
        toast.success('Email marked as handled')
        setFilter('inbox') // Return to inbox after handling
      }
    } catch (error) {
      toast.error('Error marking as handled')
    }
  }

  // Handle email selection
  const handleEmailSelect = (email: Email) => {
    setSelectedEmail(email)
    if (!email.is_read) {
      supabase
        .from('incoming_emails')
        .update({ is_read: true })
        .eq('id', email.id)
      setEmails(prev => prev.map(e => e.id === email.id ? { ...e, is_read: true } : e))
    }
  }

  // Get current filter display name
  const getCurrentFilterName = () => {
    switch (filter) {
      case 'inbox':
        return 'Inbox (All)'
      case 'handled':
        return 'Handled'
      case 'unhandled':
        return 'Unhandled'
      case 'all':
        return 'All Emails'
      default:
        if (filter.startsWith('building-')) {
          const buildingId = filter.replace('building-', '')
          const building = buildings.find(b => b.id === buildingId)
          return building?.name || 'Building'
        }
        if (filter.startsWith('tag-')) {
          const tag = filter.replace('tag-', '')
          return `Tag: ${tag}`
        }
        return 'Unknown'
    }
  }

  // Start triage mode
  const startTriageMode = () => {
    setIsTriageAssistantOpen(true)
  }

  // Handle email processed in triage
  const handleEmailProcessed = () => {
    // Refresh the email list to reflect changes
    setFilter('inbox')
  }

  // Handle success/error messages from URL params and auto-reset on login
  useEffect(() => {
    if (searchParams?.success === 'outlook_connected' && searchParams?.email) {
      toast.success(`✅ Outlook connected as ${searchParams.email}`)
      // Clear emails and refresh on successful connection
      setEmails([])
      setSelectedEmail(null)
      setFilter('inbox')
      // Clear the URL params
      const url = new URL(window.location.href)
      url.searchParams.delete('success')
      url.searchParams.delete('email')
      window.history.replaceState({}, '', url.toString())
    }
    
    if (searchParams?.error) {
      toast.error(`❌ ${searchParams.error}`)
      // Clear the URL params
      const url = new URL(window.location.href)
      url.searchParams.delete('error')
      window.history.replaceState({}, '', url.toString())
    }
  }, [searchParams])

  // Auto-reset emails on component mount (login)
  useEffect(() => {
    console.log('🔄 Auto-resetting emails on login...')
    setEmails([])
    setSelectedEmail(null)
    setFilter('inbox')
    setSearchTerm('')
    setLastSync(null)
  }, [])

  // Add this function inside the NewInboxClient component
  const handleConnectOutlook = () => {
    window.location.href = '/api/auth/outlook';
  };

  // Reset inbox function
  const handleResetInbox = () => {
    console.log('🔄 Manually resetting inbox...')
    setEmails([])
    setSelectedEmail(null)
    setFilter('inbox')
    setSearchTerm('')
    setLastSync(null)
    toast.success('Inbox reset successfully')
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Enhanced Header with Gradient Background */}
      <div className="relative overflow-hidden bg-gradient-to-r from-teal-600 via-blue-600 to-purple-600 p-6 text-white shadow-2xl">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold">Email Inbox</h1>
              <p className="text-teal-100 text-lg">Manage and respond to property-related emails</p>
            </div>
            <div className="flex items-center gap-4">
              <Button 
                onClick={handleSync}
                disabled={isSyncing}
                className="bg-white/20 hover:bg-white/30 text-white border-white/30 backdrop-blur-sm"
              >
                {isSyncing ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                {isSyncing ? 'Syncing...' : 'Sync Emails'}
              </Button>
              <Button 
                onClick={handleResetInbox}
                variant="outline" 
                className="border-white/30 text-white hover:bg-white/10"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Reset Inbox
              </Button>
              <Button 
                onClick={() => setIsComposeModalOpen(true)}
                className="bg-white/20 hover:bg-white/30 text-white border-white/30 backdrop-blur-sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                Compose
              </Button>
              <Button 
                onClick={startTriageMode}
                variant="outline" 
                className="border-white/30 text-white hover:bg-white/10"
              >
                <Brain className="h-4 w-4 mr-2" />
                AI Triage
              </Button>
            </div>
          </div>
          
          {/* Email Stats */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold">{emails.length}</div>
                  <div className="text-sm text-teal-100">Total Emails</div>
                </div>
                <InboxIcon className="h-8 w-8 text-white/80" />
              </div>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold">{emails.filter(e => !e.is_read).length}</div>
                  <div className="text-sm text-teal-100">Unread</div>
                </div>
                <Mail className="h-8 w-8 text-white/80" />
              </div>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold">{emails.filter(e => !e.is_handled).length}</div>
                  <div className="text-sm text-teal-100">Pending</div>
                </div>
                <Clock className="h-8 w-8 text-white/80" />
              </div>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold">{emails.filter(e => e.is_handled).length}</div>
                  <div className="text-sm text-teal-100">Handled</div>
                </div>
                <CheckCircle className="h-8 w-8 text-white/80" />
              </div>
            </div>
          </div>
        </div>
        {/* Decorative elements */}
        <div className="absolute top-4 right-4 w-16 h-16 bg-white/10 rounded-full"></div>
        <div className="absolute bottom-4 left-4 w-12 h-12 bg-white/5 rounded-full"></div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Enhanced Folder Sidebar */}
        <FolderSidebar
          currentFilter={filter}
          onFilterChange={setFilter}
          onSync={handleSync}
          isSyncing={isSyncing}
          lastSync={lastSync}
        />

        {/* Email List and Detail */}
        <div className="flex-1 flex">
          {/* Email List */}
          <div className="w-1/2 border-r border-gray-200 flex flex-col">
            {/* Search and Filter Bar */}
            <div className="p-4 border-b border-gray-200 bg-white">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search emails..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="mt-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {getCurrentFilterName()}
                  </Badge>
                  <span className="text-sm text-gray-500">
                    {filteredEmails.length} emails
                  </span>
                </div>
                {lastSync && (
                  <span className="text-xs text-gray-400">
                    Last sync: {formatDistanceToNow(new Date(lastSync), { addSuffix: true })}
                  </span>
                )}
              </div>
            </div>

            {/* Email List */}
            <div className="flex-1 overflow-y-auto">
              {loadingEmails ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              ) : filteredEmails.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-gray-500">
                  <InboxIcon className="h-12 w-12 mb-2 text-gray-300" />
                  <p className="mb-4">No emails found</p>
                  <div className="flex gap-3">
                    <Button onClick={handleConnectOutlook} className="bg-blue-600 text-white hover:bg-blue-700">
                      <Mail className="h-4 w-4 mr-2" /> Connect Outlook
                    </Button>
                    <Button onClick={handleSync} disabled={isSyncing} className="bg-teal-600 text-white hover:bg-teal-700">
                      {isSyncing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                      {isSyncing ? 'Syncing...' : 'Sync Emails'}
                    </Button>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">Connect your Outlook account first, then sync to see your emails here.</p>
                </div>
              ) : (
                filteredEmails.map((email) => (
                  <EmailListItem
                    key={email.id}
                    email={email}
                    isSelected={selectedEmail?.id === email.id}
                    onSelect={() => handleEmailSelect(email)}
                    onMarkAsHandled={() => markAsHandled(email.id)}
                  />
                ))
              )}
            </div>
          </div>

          {/* Email Detail */}
          <div className="w-1/2 flex flex-col">
            {selectedEmail ? (
              <>
                <EmailDetail
                  email={selectedEmail}
                  onMarkAsHandled={() => markAsHandled(selectedEmail.id)}
                />
                <AIActionBar
                  email={selectedEmail}
                  onEmailProcessed={handleEmailProcessed}
                />
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <Mail className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p>Select an email to view details</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <ComposeEmailModal
        isOpen={isComposeModalOpen}
        onClose={() => setIsComposeModalOpen(false)}
        onEmailSent={handleEmailProcessed}
      />

      <TriageAssistant
        isOpen={isTriageAssistantOpen}
        onClose={() => setIsTriageAssistantOpen(false)}
        emails={emails.filter(e => !e.is_handled)}
        onEmailProcessed={handleEmailProcessed}
      />
    </div>
  )
} 