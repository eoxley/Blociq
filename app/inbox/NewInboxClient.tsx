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
      let query = supabase
        .from('incoming_emails')
        .select(`
          id, subject, from_name, from_email, received_at, body_preview, body_full, building_id, is_read, is_handled, tags, outlook_id, buildings(name)
        `)
        .order('received_at', { ascending: false })

      // Apply filters based on current filter state
      if (filter === 'inbox') {
        query = query.eq('is_handled', false)
      } else if (filter === 'handled') {
        query = query.eq('is_handled', true)
      } else if (filter.startsWith('building-')) {
        const buildingId = filter.replace('building-', '')
        query = query.eq('building_id', buildingId)
      } else if (filter.startsWith('tag-')) {
        const tag = filter.replace('tag-', '')
        query = query.contains('tags', [tag])
      }
      // 'all' shows all emails (no additional filter)

      const { data, error } = await query
      if (!error && data) {
        // Fix buildings property: flatten if array
        setEmails(data.map((email: any) => ({
          ...email,
          buildings: Array.isArray(email.buildings) ? email.buildings[0] : email.buildings
        })))
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
        return 'Inbox'
      case 'handled':
        return 'Handled'
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

  // Handle success/error messages from URL params
  useEffect(() => {
    if (searchParams?.success === 'outlook_connected' && searchParams?.email) {
      toast.success(`✅ Outlook connected as ${searchParams.email}`)
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
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b bg-white px-6 py-4 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">{getCurrentFilterName()}</h1>
            {filter !== 'inbox' && filter !== 'handled' && filter !== 'all' && (
              <Badge variant="outline" className="text-xs">
                {filteredEmails.length} emails
              </Badge>
            )}
          </div>
          <div className="flex-1" />
          
          {/* Sync Button */}
          <Button
            onClick={handleSync}
            disabled={isSyncing}
            variant="outline"
            className="flex items-center gap-2 bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 hover:bg-green-100"
          >
            {isSyncing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {isSyncing ? 'Syncing...' : '🔄 Sync'}
          </Button>
          
          <Button
            onClick={startTriageMode}
            variant="outline"
            className="flex items-center gap-2 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 hover:bg-blue-100"
          >
            <Brain className="h-4 w-4" />
            🧠 Start Triage Assistant
          </Button>
          <Button
            onClick={() => setIsComposeModalOpen(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            New Email
          </Button>
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search emails..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Main Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel - Email List */}
          <div className="w-1/2 border-r bg-gray-50 overflow-y-auto">
            <div className="p-4">
              {loadingEmails ? (
                <div className="text-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-teal-600" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Loading emails...</h3>
                </div>
              ) : filteredEmails.length === 0 ? (
                <div className="text-center py-12">
                  <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {searchTerm ? 'No emails found' : `No emails in ${getCurrentFilterName()}`}
                  </h3>
                  <p className="text-gray-500">
                    {searchTerm
                      ? 'Try adjusting your search terms'
                      : 'Click "Sync Now" to fetch emails from Outlook'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredEmails.map((email) => (
                    <EmailListItem
                      key={email.id}
                      email={email}
                      isSelected={selectedEmail?.id === email.id}
                      onSelect={() => handleEmailSelect(email)}
                      dimmed={!!email.is_handled && filter !== 'handled'}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Panel - Email Detail */}
          <div className="w-1/2 bg-white flex flex-col">
            {selectedEmail ? (
              <>
                <EmailDetail email={selectedEmail} />
                <AIActionBar
                  email={selectedEmail}
                  onMarkHandled={() => markAsHandled(selectedEmail.id)}
                />
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Select an email
                  </h3>
                  <p className="text-gray-500">
                    Choose an email from the list to view details and AI tools
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Compose Email Modal */}
      <ComposeEmailModal
        isOpen={isComposeModalOpen}
        onClose={() => setIsComposeModalOpen(false)}
        onEmailSent={() => {
          // Optionally refresh the inbox after sending
          setFilter('inbox')
        }}
      />

      {/* Triage Assistant */}
      <TriageAssistant
        isOpen={isTriageAssistantOpen}
        onClose={() => setIsTriageAssistantOpen(false)}
        onEmailProcessed={handleEmailProcessed}
      />
    </div>
  )
} 