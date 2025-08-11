'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'

import { 
  Mail, 
  Search, 
  Filter, 
  RefreshCw, 
  Plus, 
  Brain, 
  Eye, 
  EyeOff, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Building, 
  User, 
  Calendar,
  Loader2,
  Trash2,
  Archive,
  Tag,
  Star,
  StarOff,
  Reply,
  Forward,
  Send,
  MoreHorizontal,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  AlertCircle,
  Info,
  Check,
  X,
  LogOut,
  Settings
} from 'lucide-react'
import { BlocIQButton } from '@/components/ui/blociq-button'
import { BlocIQCard, BlocIQCardContent, BlocIQCardHeader } from '@/components/ui/blociq-card'
import { BlocIQBadge } from '@/components/ui/blociq-badge'
import { Input } from '@/components/ui/input'
import EmailListItem from './components/EmailListItem'
import EmailDetailPanel from './components/EmailDetailPanel'
import AIActionBar from './components/AIActionBar'
import ComposeEmailModal from './components/ComposeEmailModal'
import FolderSidebar from './components/FolderSidebar'
import TriageAssistant from './components/TriageAssistant'
import PostSendTriageModal from './components/PostSendTriageModal'
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
  unread: boolean | null
  handled: boolean | null
  filed: boolean | null
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
  // Defensive initialization - ensure we have valid data
  const safeInitialEmails = Array.isArray(initialEmails) ? initialEmails : []
  const safeUserId = userId || 'unknown'
  
  const [emails, setEmails] = useState<Email[]>(safeInitialEmails)
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null)
  const [isSyncing, setIsSyncing] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filter, setFilter] = useState<string>('inbox')
  const [lastSync, setLastSync] = useState<string | null>(lastSyncTime)
  const [buildings, setBuildings] = useState<Building[]>([])
  const [loadingEmails, setLoadingEmails] = useState(false)
  const [isComposeModalOpen, setIsComposeModalOpen] = useState(false)
  const [isTriageAssistantOpen, setIsTriageAssistantOpen] = useState(false)
  const [isPostSendTriageOpen, setIsPostSendTriageOpen] = useState(false)
  const [availableTags, setAvailableTags] = useState<string[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  // Debug logging for initial data
  console.log('🚀 NewInboxClient - Initialized with:', {
    initialEmailsCount: initialEmails?.length || 0,
    lastSyncTime,
    userId,
    searchParams,
    hasInitialEmails: initialEmails && initialEmails.length > 0
  })

  // Initialize emails and tags from initial emails
  useEffect(() => {
    if (initialEmails && initialEmails.length > 0) {
      console.log('📧 NewInboxClient - Setting initial emails:', initialEmails.length)
      setEmails(initialEmails)
      
      const allTags = initialEmails
        .flatMap(email => email.tags || [])
        .filter((tag, index, arr) => arr.indexOf(tag) === index)
      console.log('🏷️ NewInboxClient - Initial tags from server:', allTags)
      setAvailableTags(allTags)
    }
  }, [initialEmails])

  // Fetch emails if we don't have any after initialization
  useEffect(() => {
    if (emails.length === 0 && initialEmails.length === 0) {
      console.log('📧 NewInboxClient - No emails available, fetching from client')
      fetchEmails()
    }
  }, [emails.length, initialEmails.length])

  // Create a reusable fetchEmails function
  const fetchEmails = async () => {
    if (!supabase) {
      console.warn('NewInboxClient - No Supabase client available')
      return
    }

    try {
      setLoadingEmails(true)
      console.log('🔄 NewInboxClient - Fetching emails with filter:', filter)

      // Defensive auth check
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        console.error('NewInboxClient - Auth error:', authError)
        setLoadingEmails(false)
        return
      }

      console.log('🔍 NewInboxClient - Supabase client initialized, checking auth...')
      console.log('🔍 NewInboxClient - User authenticated:', user.email)

      let query = supabase
        .from('incoming_emails')
        .select(`
          *,
          buildings(name)
        `)
        .eq('user_id', user.id)

      // Defensive filter handling
      switch (filter) {
        case 'inbox':
          console.log('📧 NewInboxClient - Showing all emails in inbox')
          break
        case 'handled':
          console.log('✅ NewInboxClient - Showing handled emails')
          query = query.eq('handled', true)
          break
        case 'unhandled':
          console.log('⏳ NewInboxClient - Showing unhandled emails')
          query = query.eq('handled', false)
          break
        case 'unread':
          console.log('📬 NewInboxClient - Showing unread emails')
          query = query.eq('unread', true)
          break
        default:
          console.log('📧 NewInboxClient - Showing all emails in inbox')
      }

      console.log('🔍 NewInboxClient - Executing query...')
      const { data, error } = await query.order('received_at', { ascending: false })

      if (error) {
        console.error('NewInboxClient - Supabase query error:', error)
        // Don't crash, just log the error and continue with empty data
        setEmails([])
        setLoadingEmails(false)
        return
      }

      console.log('📧 NewInboxClient - Raw data from Supabase:', data)
      console.log('📧 NewInboxClient - Number of emails fetched:', data?.length || 0)
      if (data && data.length > 0) {
        console.log('📧 NewInboxClient - First email sample:', data[0])
      }

      // Defensive data processing
      if (!data || !Array.isArray(data)) {
        console.warn('NewInboxClient - Invalid data received from Supabase')
        setEmails([])
        setLoadingEmails(false)
        return
      }

      const processedEmails = data.map((email: any) => ({
        ...email,
        tags: email.tags || [],
        building_id: email.building_id || null,
        buildings: email.buildings || null
      }))

      console.log('📧 NewInboxClient - Processed emails:', processedEmails)

      // Defensive tag handling
      const allTags = Array.from(new Set(
        processedEmails
          .flatMap(email => email.tags || [])
          .filter(Boolean)
      ))
      console.log('🏷️ NewInboxClient - Available tags:', allTags)

      setEmails(processedEmails)
      setLoadingEmails(false)

    } catch (error) {
      // Defensive error handling - don't crash the component
      console.error('NewInboxClient - Unexpected error in fetchEmails:', error)
      setEmails([])
      setLoadingEmails(false)
    }
  }

  // Fetch emails based on filter
  useEffect(() => {
    // Always fetch when filter changes, or if we don't have emails
    if (emails.length === 0 || filter !== 'inbox') {
      fetchEmails()
    }
  }, [filter, supabase])

  // Filter emails by search and tags
  const filteredEmails = emails.filter(email => {
    const searchLower = searchTerm.toLowerCase()
    const subjectMatch = email.subject?.toLowerCase().includes(searchLower)
    const fromMatch = email.from_name?.toLowerCase().includes(searchLower) || 
                     email.from_email?.toLowerCase().includes(searchLower)
    const bodyMatch = email.body_full?.toLowerCase().includes(searchLower)
    
    return subjectMatch || fromMatch || bodyMatch
  })

  // Debug logging for filtered emails
  console.log('🔍 NewInboxClient - Filtering emails:', {
    totalEmails: emails.length,
    searchTerm,
    selectedTags,
    filteredCount: filteredEmails.length,
    loadingEmails
  })

  const handleSync = async () => {
    setIsSyncing(true)
    try {
      const response = await fetch('/api/sync-emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const result = await response.json()
        console.log('Sync result:', result)
        
        // Refresh the email list
        const { data: newEmails, error } = await supabase
          .from('incoming_emails')
          .select(`
            id, subject, from_email, from_name, received_at, body, building_id, unread, handled, user_id, created_at
          `)
          .order('received_at', { ascending: false })

        if (error) {
          console.error('Error refreshing emails:', error)
        } else if (newEmails) {
          // Process emails with proper structure
          const processedEmails = newEmails.map((email: any) => ({
            ...email,
            buildings: null, // Set to null since we're not joining buildings table
            // Map database fields to expected interface fields
            subject: email.subject || 'No Subject',
            from_name: email.from_name || email.from_email || 'Unknown Sender',
            from_email: email.from_email || 'unknown@example.com',
            body_preview: email.body?.substring(0, 200) || 'No preview available',
            body_full: email.body || 'No content available',
            unread: email.unread || false, // Use unread field directly
            handled: email.handled || false,
            tags: [], // Tags are not directly available in this query
            building_id: email.building_id || null,
            outlook_id: null // Outlook ID is not directly available in this query
          }))
          
          setEmails(processedEmails)
          setLastSync(new Date().toISOString())
          setError(null) // Clear any previous errors
          
          // Extract unique tags (empty for now since tags are not in the query)
          setAvailableTags([])
        }

        toast.success(`Synced ${result.syncedCount || 0} new emails`)
      } else {
        const error = await response.json()
        console.error('Sync error:', error)
        
        // Show specific error message for token/connection issues
        if (error.error === 'Outlook not connected' || error.message?.includes('connect')) {
          toast.error('Email sync failed – please reconnect Outlook in settings.')
        } else {
          toast.error(error.message || 'Failed to sync emails')
        }
      }
    } catch (error) {
      console.error('Error syncing emails:', error)
      toast.error('Failed to sync emails')
    } finally {
      setIsSyncing(false)
    }
  }

  const markAsHandled = async (emailId: string) => {
    try {
      const { error } = await supabase
        .from('incoming_emails')
        .update({ 
          handled: true
        })
        .eq('id', emailId)

      if (error) {
        console.error('Error marking email as handled:', error)
        toast.error('Failed to mark email as handled')
        return
      }

      // Update local state
      setEmails(prev => prev.map(email => 
        email.id === emailId 
          ? { ...email, handled: true }
          : email
      ))

      toast.success('Email marked as handled')
    } catch (error) {
      console.error('Error marking email as handled:', error)
      toast.error('Failed to mark email as handled')
    }
  }

  const handleEmailSelect = (email: Email) => {
    setSelectedEmail(email)
    
    // Mark as read if not already read
    if (email.unread) {
      supabase
        .from('incoming_emails')
        .update({ unread: false })
        .eq('id', email.id)
        .then(() => {
          setEmails(prev => prev.map(e => 
            e.id === email.id ? { ...e, unread: false } : e
          ))
        })
    }
  }

  const handleEmailDeleted = () => {
    if (selectedEmail) {
      // Remove the deleted email from the emails list
      setEmails(prevEmails => prevEmails.filter(email => email.id !== selectedEmail.id))
      // Clear the selected email
      setSelectedEmail(null)
      toast.success('Email removed from inbox')
    }
  }

  const getCurrentFilterName = () => {
    switch (filter) {
      case 'inbox':
        return 'All Emails'
      case 'unread':
        return 'Unread'
      case 'unhandled':
        return 'Pending'
      case 'handled':
        return 'Handled'
      default:
        return 'All Emails'
    }
  }

  const startTriageMode = () => {
    setIsTriageAssistantOpen(true)
  }

  const handleEmailProcessed = () => {
    // Refresh the email list after processing
    console.log('🔄 NewInboxClient - Refreshing emails after processing')
    fetchEmails()
  }

  const handleTagsUpdated = () => {
    // Refresh the email list after tag updates
    console.log('🔄 NewInboxClient - Refreshing emails after tag update')
    fetchEmails()
  }

  const handleConnectOutlook = () => {
    // Redirect to Outlook OAuth endpoint
    window.location.href = '/api/auth/outlook'
  }

  const handleResetInbox = () => {
    if (confirm('Are you sure you want to reset the inbox? This will clear all emails.')) {
      setEmails([])
      setSelectedEmail(null)
      toast.success('Inbox reset successfully')
    }
  }



  const analyseEmailWithAI = async (email: Email) => {
    try {
      const response = await fetch('/api/analyse-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          emailId: email.id,
          subject: email.subject,
          body: email.body_full || email.body_preview,
          fromEmail: email.from_email,
          fromName: email.from_name,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        console.log('AI analysis result:', data)
        
        // Update the email in the local state with new tags and building_id
        setEmails(prev => prev.map(e => 
          e.id === email.id 
            ? { 
                ...e, 
                tags: data.analysis.tags,
                building_id: data.analysis.buildingMatch.buildingId || e.building_id,
                analysed_at: new Date().toISOString()
              }
            : e
        ))
      }
    } catch (error) {
      console.error('Error analysing email with AI:', error)
    }
  }

  // Defensive rendering - wrap the main render in try-catch
  try {
    return (
      <div className="flex h-screen bg-[#FAFAFA]">
        {/* Folder Sidebar */}
        <div className="w-1/5 border-r border-[#E2E8F0] bg-white">
          <FolderSidebar
            currentFilter={filter}
            onFilterChange={setFilter}
            onSync={handleSync}
            isSyncing={isSyncing}
            lastSync={lastSync}
          />
        </div>

        {/* Email List */}
        <div className="w-2/5 border-r border-[#E2E8F0] bg-white flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-[#E2E8F0]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-[#1E293B]">
                {getCurrentFilterName()}
              </h2>
              <div className="flex items-center gap-2">
                <BlocIQButton
                  onClick={startTriageMode}
                  size="sm"
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Brain className="h-4 w-4" />
                  AI Triage
                </BlocIQButton>
                <BlocIQButton
                  onClick={handleSync}
                  size="sm"
                  variant="outline"
                  disabled={isSyncing}
                  className="flex items-center gap-2"
                >
                  {isSyncing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  {isSyncing ? 'Syncing...' : 'Sync Emails'}
                </BlocIQButton>
              </div>
            </div>

            {/* Search and Filter Bar */}
            <div className="flex items-center gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#64748B]" />
                <Input
                  placeholder="Search emails..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-[#F8FAFC] border-[#E2E8F0] focus:border-[#3B82F6] focus:ring-[#3B82F6]"
                />
              </div>
              <div className="flex items-center gap-2">
                {availableTags.map((tag) => (
                  <BlocIQBadge
                    key={tag}
                    variant={selectedTags.includes(tag) ? 'default' : 'secondary'}
                    className={`cursor-pointer ${
                      selectedTags.includes(tag) ? 'bg-[#3B82F6] text-white' : 'bg-white text-[#64748B]'
                    }`}
                    onClick={() => {
                      if (selectedTags.includes(tag)) {
                        setSelectedTags(selectedTags.filter(t => t !== tag))
                      } else {
                        setSelectedTags([...selectedTags, tag])
                      }
                    }}
                  >
                    {tag}
                  </BlocIQBadge>
                ))}
              </div>
            </div>
          </div>

          {/* Email List Content */}
          <div className="flex-1 overflow-y-auto">
            {loadingEmails ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-8 w-8 animate-spin text-[#64748B]" />
              </div>
            ) : filteredEmails.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-[#64748B]">
                <Mail className="h-12 w-12 mb-4 opacity-50" />
                <p className="text-lg font-medium">No emails match your filters</p>
                <p className="text-sm">Try adjusting your search or filters</p>
                <BlocIQButton
                  onClick={() => {
                    setSearchTerm('')
                    setSelectedTags([])
                    setFilter('inbox')
                  }}
                  size="sm"
                  className="mt-2"
                >
                  Clear Filters
                </BlocIQButton>
              </div>
            ) : (
              <div className="space-y-1 p-2">
                {filteredEmails.map((email) => (
                  <EmailListItem
                    key={email.id}
                    email={email}
                    isSelected={selectedEmail?.id === email.id}
                    onSelect={() => handleEmailSelect(email)}
                    dimmed={email.handled || false}
                    onTagsUpdated={handleTagsUpdated}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Email Detail Panel */}
        <div className="w-3/5 flex flex-col">
          {selectedEmail ? (
            <EmailDetailPanel
              email={selectedEmail}
              onEmailDeleted={handleEmailDeleted}
              onEmailSent={() => {
                // Refresh the email list after sending
              }}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-[#64748B]">
              <div className="text-center">
                <Mail className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">Select an email to view details</p>
                <p className="text-sm">Choose an email from the list to see its content and take action</p>
              </div>
            </div>
          )}
        </div>

        {/* Compose Email Modal */}
        <ComposeEmailModal
          isOpen={isComposeModalOpen}
          onClose={() => setIsComposeModalOpen(false)}
        />

        {/* AI Triage Assistant */}
        <TriageAssistant
          isOpen={isTriageAssistantOpen}
          onClose={() => setIsTriageAssistantOpen(false)}
          onEmailProcessed={handleEmailProcessed}
        />

        {/* Post-Send Triage Modal */}
        <PostSendTriageModal
          isOpen={isPostSendTriageOpen}
          onClose={() => setIsPostSendTriageOpen(false)}
          emailId={selectedEmail?.id || ''}
          originalEmail={selectedEmail || {
            id: '',
            subject: null,
            from_name: null,
            from_email: null,
            body_full: null,
            tags: null,
            building_id: null
          }}
          onActionComplete={handleEmailProcessed}
        />
      </div>
    )
  } catch (renderError) {
    // Defensive error boundary - catch any rendering errors
    console.error('NewInboxClient render error:', renderError)
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Failed to render inbox</h2>
          <p className="text-gray-600 mb-4">Please refresh the page to try again</p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Refresh Page
          </button>
        </div>
      </div>
    )
  }
} 