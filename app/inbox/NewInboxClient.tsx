'use client'

import React, { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'
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
  Settings,
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
  X
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
import OutlookConnectButton from '@/components/OutlookConnectButton'

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
  const [isPostSendTriageOpen, setIsPostSendTriageOpen] = useState(false)
  const [availableTags, setAvailableTags] = useState<string[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])

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
        .eq('is_deleted', false) // Filter out deleted emails
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

      try {
        const { data, error } = await query
        
        if (error) {
          console.error('Error fetching emails:', error)
          toast.error('Failed to fetch emails')
          return
        }

        console.log('📧 NewInboxClient - Fetched emails:', data?.length || 0)
        
        if (data) {
          // Process buildings property: flatten if array
          const processedEmails = data.map((email: any) => ({
            ...email,
            buildings: Array.isArray(email.buildings) ? email.buildings[0] : email.buildings
          }))
          
          setEmails(processedEmails)
          
          // Extract unique tags from fetched emails
          const allTags = processedEmails
            .flatMap(email => email.tags || [])
            .filter((tag, index, arr) => arr.indexOf(tag) === index)
          setAvailableTags(allTags)
          
          // Analyze unanalyzed emails with AI
          const unanalyzedEmails = processedEmails.filter(email => !email.tags || email.tags.length === 0)
          console.log('🤖 NewInboxClient - Found unanalyzed emails:', unanalyzedEmails.length)
          
          for (const email of unanalyzedEmails.slice(0, 5)) { // Limit to 5 at a time
            await analyzeEmailWithAI(email)
          }
        }
      } catch (error) {
        console.error('Error in fetchEmails:', error)
        toast.error('Failed to fetch emails')
      } finally {
        setLoadingEmails(false)
      }
    }

    fetchEmails()
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
            id, subject, from_name, from_email, received_at, body_preview, body_full, building_id, is_read, is_handled, tags, outlook_id, buildings(name)
          `)
          .eq('is_deleted', false)
          .order('received_at', { ascending: false })

        if (error) {
          console.error('Error refreshing emails:', error)
        } else if (newEmails) {
          // Process buildings property: flatten if array
          const processedEmails = newEmails.map((email: any) => ({
            ...email,
            buildings: Array.isArray(email.buildings) ? email.buildings[0] : email.buildings
          }))
          
          setEmails(processedEmails)
          setLastSync(new Date().toISOString())
          
          // Extract unique tags
          const allTags = processedEmails
            .flatMap(email => email.tags || [])
            .filter((tag, index, arr) => arr.indexOf(tag) === index)
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
          is_handled: true, 
          handled_at: new Date().toISOString() 
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
          ? { ...email, is_handled: true, handled_at: new Date().toISOString() }
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
    if (!email.is_read) {
      supabase
        .from('incoming_emails')
        .update({ is_read: true })
        .eq('id', email.id)
        .then(() => {
          setEmails(prev => prev.map(e => 
            e.id === email.id ? { ...e, is_read: true } : e
          ))
        })
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
    // Use the main fetchEmails function from useEffect
    const refreshEmails = async () => {
      setLoadingEmails(true)
      console.log('🔄 NewInboxClient - Refreshing emails after processing')
      
      let query = supabase
        .from('incoming_emails')
        .select(`
          id, subject, from_name, from_email, received_at, body_preview, body_full, building_id, is_read, is_handled, tags, outlook_id, buildings(name)
        `)
        .eq('is_deleted', false)
        .order('received_at', { ascending: false })

      // Apply current filter
      if (filter === 'handled') {
        query = query.eq('is_handled', true)
      } else if (filter === 'unhandled') {
        query = query.eq('is_handled', false)
      } else if (filter === 'unread') {
        query = query.eq('is_read', false)
      }

      try {
        const { data, error } = await query
        
        if (error) {
          console.error('Error refreshing emails:', error)
          return
        }

        if (data) {
          const processedEmails = data.map((email: any) => ({
            ...email,
            buildings: Array.isArray(email.buildings) ? email.buildings[0] : email.buildings
          }))
          setEmails(processedEmails)
        }
      } catch (error) {
        console.error('Error refreshing emails:', error)
      } finally {
        setLoadingEmails(false)
      }
    }

    refreshEmails()
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

  const analyzeEmailWithAI = async (email: Email) => {
    try {
      const response = await fetch('/api/analyze-email', {
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
                analyzed_at: new Date().toISOString()
              }
            : e
        ))
      }
    } catch (error) {
      console.error('Error analyzing email with AI:', error)
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
              variant="secondary"
              className="bg-white/20 hover:bg-white/30 text-white border-white/30"
            >
              <Brain className="h-4 w-4 mr-2" />
              AI Triage
            </BlocIQButton>
          </div>
        </div>
        
        {/* Email Stats */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold">{emails.length}</div>
                <div className="text-sm text-white/80">Total Emails</div>
              </div>
              <Building className="h-10 w-10 text-white/80" />
            </div>
          </div>
          
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold">{emails.filter(e => !e.is_read).length}</div>
                <div className="text-sm text-white/80">Unread</div>
              </div>
              <Mail className="h-10 w-10 text-white/80" />
            </div>
          </div>
          
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold">{emails.filter(e => !e.is_handled).length}</div>
                <div className="text-sm text-white/80">Pending</div>
              </div>
              <Clock className="h-10 w-10 text-white/80" />
            </div>
          </div>
          
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold">{emails.filter(e => e.is_handled).length}</div>
                <div className="text-sm text-white/80">Handled</div>
              </div>
              <CheckCircle className="h-10 w-10 text-white/80" />
            </div>
          </div>
        </div>
      </div>

      {/* Outlook Integration */}
      <div className="mb-6">
        <OutlookConnectButton onSyncComplete={fetchEmails} />
      </div>

      <div className="flex h-[600px]">
        {/* Email List */}
        <div className="w-1/2 border-r border-[#E2E8F0] flex flex-col">
          {/* Search and Filter Bar */}
          <div className="p-6 border-b border-[#E2E8F0] bg-white">
            <div className="flex items-center gap-4 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#64748B] h-4 w-4" />
                <Input
                  type="text"
                  placeholder="Search emails..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-[#FAFAFA] border-[#E2E8F0] focus:border-[#008C8F]"
                />
              </div>
              <BlocIQButton
                variant="outline"
                size="sm"
                onClick={() => setFilter('inbox')}
                className={filter === 'inbox' ? 'bg-[#F0FDFA] border-[#008C8F] text-[#0F5D5D]' : ''}
              >
                All
              </BlocIQButton>
              <BlocIQButton
                variant="outline"
                size="sm"
                onClick={() => setFilter('unread')}
                className={filter === 'unread' ? 'bg-[#F0FDFA] border-[#008C8F] text-[#0F5D5D]' : ''}
              >
                Unread
              </BlocIQButton>
              <BlocIQButton
                variant="outline"
                size="sm"
                onClick={() => setFilter('unhandled')}
                className={filter === 'unhandled' ? 'bg-[#F0FDFA] border-[#008C8F] text-[#0F5D5D]' : ''}
              >
                Pending
              </BlocIQButton>
            </div>
            
            {/* Tag Filters */}
            {availableTags.length > 0 && (
              <div className="mt-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-medium text-[#64748B]">Filter by tags:</span>
                  {selectedTags.length > 0 && (
                    <BlocIQButton
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedTags([])}
                      className="text-xs text-[#64748B] hover:text-[#0F5D5D]"
                    >
                      Clear all
                    </BlocIQButton>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {availableTags.map((tag) => (
                    <BlocIQButton
                      key={tag}
                      variant={selectedTags.includes(tag) ? "primary" : "outline"}
                      size="sm"
                      className={`text-xs h-7 px-3 ${
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
              </div>
            ) : filteredEmails.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-[#64748B]">
                <Mail className="h-12 w-12 mb-4 opacity-50" />
                <p className="text-lg font-medium">No emails found</p>
                {emails.length === 0 ? (
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
                ) : (
                  <p className="text-sm">Try adjusting your search or filters</p>
                )}
              </div>
            ) : (
              filteredEmails.map((email) => (
                <EmailListItem
                  key={email.id}
                  email={email}
                  isSelected={selectedEmail?.id === email.id}
                  onSelect={() => handleEmailSelect(email)}
                  dimmed={email.is_handled || false}
                />
              ))
            )}
          </div>
        </div>

        {/* Email Detail Panel */}
        <div className="w-1/2 flex flex-col">
          {selectedEmail ? (
            <EmailDetailPanel
              email={selectedEmail}
              onEmailDeleted={() => {
                setEmails(prev => prev.filter(e => e.id !== selectedEmail.id))
                setSelectedEmail(null)
              }}
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
          building_id: null
        }}
        onActionComplete={handleEmailProcessed}
      />
    </div>
  )
} 