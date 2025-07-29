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
  const [isPostSendTriageOpen, setIsPostSendTriageOpen] = useState(false)
  const [availableTags, setAvailableTags] = useState<string[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])

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
    setLoadingEmails(true)
    console.log('🔄 NewInboxClient - Fetching emails with filter:', filter)
    
    try {
      // Check if Supabase client is properly initialized
      if (!supabase) {
        console.error('❌ Supabase client is not initialized')
        toast.error('Database connection not available')
        return
      }

      console.log('🔍 NewInboxClient - Supabase client initialized, checking auth...')

      // Check authentication status
      const { data: { session }, error: authError } = await supabase.auth.getSession()
      if (authError) {
        console.error('❌ Authentication error:', authError)
        toast.error('Authentication error')
        return
      }

      if (!session) {
        console.error('❌ No active session')
        toast.error('Please log in to access emails')
        return
      }

      console.log('✅ User authenticated:', session.user.id)
      
      let query = supabase
        .from('incoming_emails')
        .select(`
          id, subject, from_email, from_name, received_at, body_preview, body, building_id, is_read, is_handled, tags, outlook_id, outlook_message_id, folder, user_id, created_at
        `)
        .order('received_at', { ascending: false })

      // Apply filters based on current filter state
      if (filter === 'inbox') {
        // Show all emails in inbox (not just unhandled ones)
        console.log('📧 NewInboxClient - Showing all emails in inbox')
      } else if (filter === 'handled') {
        query = query.eq('is_handled', true)
        console.log('✅ NewInboxClient - Showing handled emails')
      } else if (filter === 'unhandled') {
        query = query.eq('is_handled', false)
        console.log('⏳ NewInboxClient - Showing unhandled emails')
      } else if (filter === 'unread') {
        query = query.eq('is_read', false)
        console.log('📬 NewInboxClient - Showing unread emails')
      }

      console.log('🔍 NewInboxClient - Executing query...')
      const { data, error } = await query
      
      if (error) {
        console.error('❌ Supabase error fetching emails:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          user_id: session.user.id,
          filter: filter
        })
        toast.error(`Failed to fetch emails: ${error.message}`)
        return
      }

      console.log('📧 NewInboxClient - Raw data from Supabase:', data)
      console.log('📧 NewInboxClient - Number of emails fetched:', data?.length || 0)
      
      if (data && data.length > 0) {
        console.log('📧 NewInboxClient - First email sample:', data[0])
        
        // Process emails with proper structure
        const processedEmails = data.map((email: any) => ({
          ...email,
          buildings: null, // Set to null since we're not joining buildings table
          // Map database fields to expected interface fields
          subject: email.subject || 'No Subject',
          from_name: email.from_name || email.from_email || 'Unknown Sender',
          from_email: email.from_email || 'unknown@example.com',
          body_preview: email.body_preview || 'No preview available',
          body_full: email.body || email.body_preview || 'No content available',
          unread: !email.is_read, // Invert is_read to get unread status
          handled: email.is_handled || false,
          tags: email.tags || [], // Use the tags array directly
          building_id: email.building_id || null,
          outlook_id: email.outlook_id || email.outlook_message_id || null
        }))
        
        console.log('📧 NewInboxClient - Processed emails:', processedEmails)
        setEmails(processedEmails)
        
        // Extract unique tags from fetched emails
        const allTags = processedEmails
          .flatMap(email => email.tags || [])
          .filter((tag, index, arr) => arr.indexOf(tag) === index)
          .filter(tag => tag && tag.trim() !== '') // Filter out empty tags
        console.log('🏷️ NewInboxClient - Available tags:', allTags)
        setAvailableTags(allTags)
        
        // Temporarily disable AI analysis to prevent errors
        // const unanalysedEmails = processedEmails.filter(email => !email.tags || email.tags.length === 0)
        // console.log('🤖 NewInboxClient - Found unanalysed emails:', unanalysedEmails.length)
        
        // for (const email of unanalysedEmails.slice(0, 5)) { // Limit to 5 at a time
        //   await analyseEmailWithAI(email)
        // }
      } else {
        console.log('📧 NewInboxClient - No emails found')
        setEmails([])
        setAvailableTags([])
      }
    } catch (error) {
      console.error('❌ Unexpected error in fetchEmails:', {
        error: error,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      })
      toast.error('Failed to fetch emails: Unexpected error')
    } finally {
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
    const matchesSearch = searchTerm === '' ||
      email.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      email.from_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      email.from_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      email.body_preview?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesTags = selectedTags.length === 0 ||
      selectedTags.some(tag => email.tags?.includes(tag))
    
    return matchesSearch && matchesTags
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
      const response = await fetch('/api/sync-inbox', {
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
            id, subject, from_email, from_name, received_at, body_preview, body, building_id, is_read, is_handled, tags, outlook_id, outlook_message_id, folder, user_id, created_at
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
            body_preview: email.body_preview || 'No preview available',
            body_full: email.body || email.body_preview || 'No content available',
            unread: !email.is_read, // Invert is_read to get unread status
            handled: email.is_handled || false,
            tags: email.tags || [], // Use the tags array directly
            building_id: email.building_id || null,
            outlook_id: email.outlook_id || email.outlook_message_id || null
          }))
          
          setEmails(processedEmails)
          setLastSync(new Date().toISOString())
          
          // Extract unique tags
          const allTags = processedEmails
            .flatMap(email => email.tags || [])
            .filter((tag, index, arr) => arr.indexOf(tag) === index)
            .filter(tag => tag && tag.trim() !== '') // Filter out empty tags
          setAvailableTags(allTags)
        }

        toast.success(`Synced ${result.syncedCount || 0} new emails`)
      } else {
        const error = await response.json()
        console.error('Sync error:', error)
        toast.error(error.message || 'Failed to sync emails')
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
          is_handled: true
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
        .update({ is_read: true })
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

  return (
    <div className="space-y-8">
      {/* Enhanced Header with BlocIQ Branding */}
      <div className="bg-gradient-to-r from-[#008C8F] to-[#7645ED] rounded-2xl p-8 text-white shadow-xl">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold">Email Inbox</h1>
            <p className="text-xl text-white/90">Manage and respond to property-related emails</p>
          </div>
          <div className="flex items-center gap-4">
            <BlocIQButton 
              onClick={handleSync}
              disabled={isSyncing}
              variant="secondary"
              className="bg-white/20 hover:bg-white/30 text-white border-white/30"
            >
              {isSyncing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              {isSyncing ? 'Syncing...' : 'Sync Emails'}
            </BlocIQButton>
            <BlocIQButton 
              onClick={() => setIsComposeModalOpen(true)}
              variant="secondary"
              className="bg-white/20 hover:bg-white/30 text-white border-white/30"
            >
              <Plus className="h-4 w-4 mr-2" />
              Compose
            </BlocIQButton>
            <BlocIQButton 
              onClick={startTriageMode}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white border-0 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 font-semibold relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-purple-400/20 to-blue-400/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
              <span className="relative z-10">🚑 AI Triage</span>
            </BlocIQButton>
          </div>
        </div>
        
        {/* Email Stats */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold">{emails?.length || 0}</div>
                <div className="text-sm text-white/80">Total Emails</div>
              </div>
              <Building className="h-10 w-10 text-white/80" />
            </div>
          </div>
          
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold">{emails?.filter(e => e.unread).length || 0}</div>
                <div className="text-sm text-white/80">Unread</div>
              </div>
              <Mail className="h-10 w-10 text-white/80" />
            </div>
          </div>
          
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold">{emails?.filter(e => !e.handled).length || 0}</div>
                <div className="text-sm text-white/80">Pending</div>
              </div>
              <Clock className="h-10 w-10 text-white/80" />
            </div>
          </div>
          
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold">{emails?.filter(e => e.handled).length || 0}</div>
                <div className="text-sm text-white/80">Handled</div>
              </div>
              <CheckCircle className="h-10 w-10 text-white/80" />
            </div>
          </div>
        </div>
      </div>



      <div className="flex h-[calc(100vh-400px)] min-h-[600px]">
        {/* Email List */}
        <div className="w-2/5 border-r border-[#E2E8F0] flex flex-col">
          {/* Search and Filter Bar */}
          <div className="p-4 border-b border-[#E2E8F0] bg-white">
            <div className="flex items-center gap-3 mb-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#64748B] h-4 w-4" />
                <Input
                  type="text"
                  placeholder="Search emails..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-[#FAFAFA] border-[#E2E8F0] focus:border-[#008C8F] h-9"
                />
              </div>
              <BlocIQButton
                variant="outline"
                size="sm"
                onClick={() => setFilter('inbox')}
                className={`text-xs h-8 px-2 ${filter === 'inbox' ? 'bg-[#F0FDFA] border-[#008C8F] text-[#0F5D5D]' : ''}`}
              >
                All
              </BlocIQButton>
              <BlocIQButton
                variant="outline"
                size="sm"
                onClick={() => setFilter('unread')}
                className={`text-xs h-8 px-2 ${filter === 'unread' ? 'bg-[#F0FDFA] border-[#008C8F] text-[#0F5D5D]' : ''}`}
              >
                Unread
              </BlocIQButton>
              <BlocIQButton
                variant="outline"
                size="sm"
                onClick={() => setFilter('unhandled')}
                className={`text-xs h-8 px-2 ${filter === 'unhandled' ? 'bg-[#F0FDFA] border-[#008C8F] text-[#0F5D5D]' : ''}`}
              >
                Pending
              </BlocIQButton>
            </div>
            
            {/* Tag Filters */}
            {availableTags.length > 0 && (
              <div className="mt-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-medium text-[#64748B]">Tags:</span>
                  {selectedTags.length > 0 && (
                    <BlocIQButton
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedTags([])}
                      className="text-xs text-[#64748B] hover:text-[#0F5D5D] h-6 px-2"
                    >
                      Clear
                    </BlocIQButton>
                  )}
                </div>
                <div className="flex flex-wrap gap-1">
                  {availableTags.map((tag) => (
                    <BlocIQButton
                      key={tag}
                      variant={selectedTags.includes(tag) ? "primary" : "outline"}
                      size="sm"
                      className={`text-xs h-6 px-2 ${
                        selectedTags.includes(tag) ? 'bg-[#008C8F] text-white' : ''
                      }`}
                      onClick={() => {
                        setSelectedTags(prev => 
                          prev.includes(tag) 
                            ? prev.filter(t => t !== tag)
                            : [...prev, tag]
                        )
                      }}
                    >
                      {tag}
                    </BlocIQButton>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {/* Email List */}
          <div className="flex-1 overflow-y-auto">
            {loadingEmails ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-6 w-6 animate-spin text-[#008C8F]" />
                <span className="ml-2 text-sm text-[#64748B]">Loading emails...</span>
              </div>
            ) : emails.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-[#64748B]">
                <Mail className="h-12 w-12 mb-4 opacity-50" />
                <p className="text-lg font-medium">No emails found</p>
                <div className="text-center">
                  <p className="text-sm mb-4">Your inbox is empty. Sync with Outlook to get started.</p>
                  <BlocIQButton
                    onClick={handleSync}
                    disabled={isSyncing}
                    size="sm"
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
      </div>

      {/* Compose Email Modal */}
      <ComposeEmailModal
        isOpen={isComposeModalOpen}
        onClose={() => setIsComposeModalOpen(false)}
        onEmailSent={handleEmailProcessed}
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
          building_id: null,
          received_at: null,
          body_preview: null,
          unread: null,
          handled: null,
          outlook_id: null,
          buildings: null
        }}
        onActionComplete={handleEmailProcessed}
      />
    </div>
  )
} 