'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { 
  Mail, Clock, User, RefreshCw, ExternalLink, ChevronDown, ChevronUp, History, 
  MessageSquare, Loader2, Send, Edit3, Check, Tag, Flag, Search, Filter, 
  Archive, Trash2, Star, MoreHorizontal, Reply, Forward, Delete, Pin, 
  Eye, EyeOff, Calendar, Building, AlertCircle, CheckCircle, Clock as ClockIcon,
  Wrench, Construction, Home, Save, X, Plus, Bell, TestTube, Brain, Sparkles,
  FolderOpen, Inbox, CheckSquare, AlertTriangle, Info, Zap
} from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { BlocIQButton } from '@/components/ui/blociq-button'
import EmailAssignmentDropdowns from './components/EmailAssignmentDropdowns'
import EmailDetailView from './components/EmailDetailView'
import LiveInboxStatus from '@/components/LiveInboxStatus'
import FolderSidebar from './components/FolderSidebar'
import AIActionBar from './components/AIActionBar'
import { toast } from 'sonner'

// Define the Email type based on the database schema
type Email = {
  id: string
  from_email: string | null
  from_name: string | null
  subject: string | null
  body_preview: string | null
  body_full: string | null
  received_at: string | null
  unread: boolean | null
  is_read: boolean | null
  handled: boolean | null
  is_handled: boolean | null
  pinned: boolean | null
  flag_status: string | null
  categories: string[] | null
  tags: string[] | null
  building_id: number | null
  unit_id: number | null
  leaseholder_id: string | null
  outlook_id: string | null
  buildings?: { name: string } | null
  units?: { unit_number: string } | null
  leaseholders?: { name: string; email: string } | null
}

interface InboxClientProps {
  emails: Email[]
  userEmail?: string
}

export default function InboxClient({ emails: initialEmails, userEmail }: InboxClientProps) {
  console.log('🎨 InboxClient: Rendering enhanced component...')
  console.log('📧 Initial emails data:', initialEmails)
  console.log('👤 User email:', userEmail)
  
  // ✅ Enhanced state management
  const [emails, setEmails] = useState<Email[]>(initialEmails)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null)
  const [emailHistory, setEmailHistory] = useState<Record<string, Email[]>>({})
  const [loadingHistory, setLoadingHistory] = useState<Set<string>>(new Set())
  const [generatingReplies, setGeneratingReplies] = useState<Set<string>>(new Set())
  const [replyResponses, setReplyResponses] = useState<Record<string, string>>({})
  const [replyErrors, setReplyErrors] = useState<Record<string, string>>({})
  const [editingReplies, setEditingReplies] = useState<Set<string>>(new Set())
  const [editedReplies, setEditedReplies] = useState<Record<string, string>>({})
  const [sendingEmails, setSendingEmails] = useState<Set<string>>(new Set())
  const [sendResults, setSendResults] = useState<Record<string, { success: boolean; message: string }>>({})
  
  // Enhanced functionality state
  const [showTagTools, setShowTagTools] = useState<Set<string>>(new Set())
  const [newTags, setNewTags] = useState<Record<string, string>>({})
  const [savingTags, setSavingTags] = useState<Set<string>>(new Set())
  const [aiClassifying, setAiClassifying] = useState<Set<string>>(new Set())
  const [aiSummarizing, setAiSummarizing] = useState<Set<string>>(new Set())
  const [summaries, setSummaries] = useState<Record<string, string>>({})
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'unread' | 'flagged' | 'handled'>('all')
  const [sortBy, setSortBy] = useState<'date' | 'sender' | 'subject'>('date')
  const [viewMode, setViewMode] = useState<'list' | 'compact'>('list')
  const [currentFolder, setCurrentFolder] = useState<string>('inbox')
  const [showToolsMenu, setShowToolsMenu] = useState(false)
  const [syncStatus, setSyncStatus] = useState<'live' | 'partial' | 'offline'>('live')

  // Email assignment state
  const [showAssignmentDropdowns, setShowAssignmentDropdowns] = useState<Set<string>>(new Set())
  const [emailAssignments, setEmailAssignments] = useState<Record<string, {
    buildingId: number | null;
    unitId: number | null;
    leaseholderId: string | null;
    assignmentLabel: string;
  }>>({})

  // Real-time subscription management
  const subscriptionRef = useRef<any>(null)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [newEmailCount, setNewEmailCount] = useState(0)
  const [isReloading, setIsReloading] = useState(false)

  // Calculate email statistics
  const unreadCount = emails.filter(email => email.unread).length
  const flaggedCount = emails.filter(email => email.flag_status === 'flagged').length
  const handledCount = emails.filter(email => email.handled).length

  // ✅ Enhanced Supabase Realtime for Inbox Page
  useEffect(() => {
    if (!userEmail) {
      return
    }

    console.log('🔌 Starting enhanced real-time inbox subscription for user ID:', userEmail)
    
    const setupSubscription = async () => {
      try {
        // Clean up existing subscription
        if (subscriptionRef.current) {
          await supabase.removeChannel(subscriptionRef.current)
        }

        // Create new subscription
        const channel = supabase
          .channel('inbox-realtime')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'incoming_emails',
              filter: `user_id=eq.${userEmail}`
            },
            (payload) => {
              console.log('📨 Real-time email update:', payload)
              
              if (payload.eventType === 'INSERT') {
                const newEmail = payload.new as Email
                setEmails(prev => [newEmail, ...prev])
                setNewEmailCount(prev => prev + 1)
                toast.success(`New email from ${newEmail.from_email}`)
              } else if (payload.eventType === 'UPDATE') {
                const updatedEmail = payload.new as Email
                setEmails(prev => prev.map(email => 
                  email.id === updatedEmail.id ? updatedEmail : email
                ))
              } else if (payload.eventType === 'DELETE') {
                const deletedEmailId = payload.old.id
                setEmails(prev => prev.filter(email => email.id !== deletedEmailId))
              }
            }
          )
          .subscribe((status) => {
            console.log('📡 Subscription status:', status)
            setIsSubscribed(status === 'SUBSCRIBED')
            setSyncStatus(status === 'SUBSCRIBED' ? 'live' : 'offline')
          })

        subscriptionRef.current = channel
      } catch (error) {
        console.error('❌ Error setting up real-time subscription:', error)
        setSyncStatus('offline')
      }
    }

    setupSubscription()

    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current)
      }
    }
  }, [userEmail])

  // ✅ Enhanced refresh functionality
  const handleRefresh = async () => {
    setIsRefreshing(true)
    setSyncStatus('partial')
    
    try {
      console.log('🔄 Refreshing emails...')
      
      const { data, error } = await supabase
        .from('incoming_emails')
        .select(`
          id, 
          subject, 
          from_email, 
          from_name, 
          body_preview, 
          received_at, 
          is_read, 
          is_handled, 
          user_id, 
          created_at,
          building_id,
          related_unit_id
        `)
        .eq('user_id', userEmail)
        .order('received_at', { ascending: false })

      if (error) {
        console.error('❌ Error refreshing emails:', error)
        toast.error('Failed to refresh emails')
        setSyncStatus('offline')
      } else {
        const refreshedEmails = (data || []).map(email => ({
          id: email.id,
          subject: email.subject,
          from_email: email.from_email,
          from_name: email.from_name,
          body_preview: email.body_preview,
          body_full: email.body_preview, // Map to body_preview for now
          received_at: email.received_at,
          unread: !email.is_read,
          is_read: email.is_read,
          handled: email.is_handled,
          is_handled: email.is_handled,
          pinned: false,
          flag_status: null,
          categories: null,
          tags: null,
          building_id: email.building_id,
          unit_id: email.related_unit_id,
          leaseholder_id: null,
          outlook_id: null,
          buildings: null,
          units: null,
          leaseholders: null
        }))

        setEmails(refreshedEmails)
        setNewEmailCount(0)
        toast.success(`Refreshed ${refreshedEmails.length} emails`)
        setSyncStatus('live')
      }
    } catch (error) {
      console.error('❌ Error in handleRefresh:', error)
      toast.error('Failed to refresh emails')
      setSyncStatus('offline')
    } finally {
      setIsRefreshing(false)
    }
  }

  // ✅ Enhanced test real-time functionality
  const testRealTime = async () => {
    try {
      console.log('🧪 Testing real-time functionality...')
      
      // Test subscription status
      const status = subscriptionRef.current?.subscription?.state
      console.log('📡 Current subscription status:', status)
      
      if (status === 'SUBSCRIBED') {
        toast.success('Real-time is working!')
        setSyncStatus('live')
      } else {
        toast.error('Real-time connection failed')
        setSyncStatus('offline')
      }
    } catch (error) {
      console.error('❌ Error testing real-time:', error)
      toast.error('Failed to test real-time')
    }
  }

  // ✅ Enhanced cleanup functionality with confirmation
  const handleCleanup = async () => {
    if (!confirm('This will remove test emails and sync all emails. Continue?')) {
      return
    }

    setIsReloading(true)
    
    try {
      console.log('🧹 Starting cleanup and sync...')
      
      // Remove test emails
      const { error: deleteError } = await supabase
        .from('incoming_emails')
        .delete()
        .eq('user_id', userEmail)
        .like('subject', '%test%')

      if (deleteError) {
        console.error('❌ Error deleting test emails:', deleteError)
      }

      // Sync all emails
      await handleRefresh()
      
      toast.success('Cleanup completed successfully')
    } catch (error) {
      console.error('❌ Error in cleanup:', error)
      toast.error('Cleanup failed')
    } finally {
      setIsReloading(false)
    }
  }

  // ✅ Enhanced email selection with folder filtering
  const toggleEmailSelection = async (emailId: string, fromEmail: string | null) => {
    console.log('📧 Selecting email:', emailId)
    
    if (selectedEmail === emailId) {
      setSelectedEmail(null)
      return
    }

    setSelectedEmail(emailId)

    // Load email history if not already loaded
    if (!emailHistory[emailId]) {
      setLoadingHistory(prev => new Set([...prev, emailId]))
      
      try {
        const { data: historyData, error } = await supabase
          .from('email_history')
          .select('*')
          .eq('email_id', emailId)
          .order('created_at', { ascending: false })

        if (!error && historyData) {
          setEmailHistory(prev => ({
            ...prev,
            [emailId]: historyData
          }))
        }
      } catch (error) {
        console.error('❌ Error loading email history:', error)
      } finally {
        setLoadingHistory(prev => {
          const newSet = new Set(prev)
          newSet.delete(emailId)
          return newSet
        })
      }
    }
  }

  // ✅ Enhanced AI reply generation
  const handleGenerateReply = async (emailId: string, subject: string | null, bodyPreview: string | null) => {
    setGeneratingReplies(prev => new Set([...prev, emailId]))
    setReplyErrors(prev => ({ ...prev, [emailId]: '' }))
    
    try {
      console.log('🤖 Generating AI reply for email:', emailId)
      
      const response = await fetch('/api/generate-draft', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          emailId,
          subject,
          body: bodyPreview,
          type: 'reply'
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.error) {
        throw new Error(data.error)
      }

      setReplyResponses(prev => ({
        ...prev,
        [emailId]: data.draft || 'No reply generated'
      }))
      
      toast.success('AI reply generated successfully')
    } catch (error) {
      console.error('❌ Error generating reply:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate reply'
      setReplyErrors(prev => ({
        ...prev,
        [emailId]: errorMessage
      }))
      toast.error('Failed to generate reply')
    } finally {
      setGeneratingReplies(prev => {
        const newSet = new Set(prev)
        newSet.delete(emailId)
        return newSet
      })
    }
  }

  // ✅ Enhanced AI summarization
  const handleSummarizeEmail = async (emailId: string, subject: string | null, bodyPreview: string | null) => {
    setAiSummarizing(prev => new Set([...prev, emailId]))
    
    try {
      console.log('📝 Summarizing email:', emailId)
      
      const response = await fetch('/api/summarise-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          emailId,
          subject,
          body: bodyPreview
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.error) {
        throw new Error(data.error)
      }

      setSummaries(prev => ({
        ...prev,
        [emailId]: data.summary || 'No summary generated'
      }))
      
      toast.success('Email summarized successfully')
    } catch (error) {
      console.error('❌ Error summarizing email:', error)
      toast.error('Failed to summarize email')
    } finally {
      setAiSummarizing(prev => {
        const newSet = new Set(prev)
        newSet.delete(emailId)
        return newSet
      })
    }
  }

  // ✅ Enhanced AI classification
  const handleAiClassify = async (emailId: string, subject: string | null, bodyPreview: string | null) => {
    setAiClassifying(prev => new Set([...prev, emailId]))
    
    try {
      console.log('🏷️ Classifying email:', emailId)
      
      const response = await fetch('/api/ai-classify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          emailId,
          subject,
          body: bodyPreview
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.error) {
        throw new Error(data.error)
      }

      // Update email with classification
      setEmails(prev => prev.map(email => 
        email.id === emailId 
          ? { ...email, categories: data.categories || [] }
          : email
      ))
      
      toast.success(`Email classified as: ${data.categories?.join(', ')}`)
    } catch (error) {
      console.error('❌ Error classifying email:', error)
      toast.error('Failed to classify email')
    } finally {
      setAiClassifying(prev => {
        const newSet = new Set(prev)
        newSet.delete(emailId)
        return newSet
      })
    }
  }

  // ✅ Enhanced reply editing
  const handleEditReply = (emailId: string) => {
    setEditingReplies(prev => new Set([...prev, emailId]))
    setEditedReplies(prev => ({
      ...prev,
      [emailId]: replyResponses[emailId] || ''
    }))
  }

  const handleSaveEdit = (emailId: string) => {
    setReplyResponses(prev => ({
      ...prev,
      [emailId]: editedReplies[emailId] || ''
    }))
    setEditingReplies(prev => {
      const newSet = new Set(prev)
      newSet.delete(emailId)
      return newSet
    })
    toast.success('Reply saved')
  }

  // ✅ Enhanced email sending
  const handleSendEmail = async (emailId: string, toEmail: string | null, subject: string | null) => {
    setSendingEmails(prev => new Set([...prev, emailId]))
    
    try {
      console.log('📤 Sending email:', emailId)
      
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          emailId,
          toEmail,
          subject,
          content: editedReplies[emailId] || replyResponses[emailId]
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.error) {
        throw new Error(data.error)
      }

      setSendResults(prev => ({
        ...prev,
        [emailId]: { success: true, message: 'Email sent successfully' }
      }))
      
      // Mark as handled
      setEmails(prev => prev.map(email => 
        email.id === emailId ? { ...email, handled: true } : email
      ))
      
      toast.success('Email sent successfully')
    } catch (error) {
      console.error('❌ Error sending email:', error)
      setSendResults(prev => ({
        ...prev,
        [emailId]: { 
          success: false, 
          message: error instanceof Error ? error.message : 'Failed to send email' 
        }
      }))
      toast.error('Failed to send email')
    } finally {
      setSendingEmails(prev => {
        const newSet = new Set(prev)
        newSet.delete(emailId)
        return newSet
      })
    }
  }

  // ✅ Enhanced flag functionality
  const toggleFlag = async (emailId: string, currentFlagStatus: string | null) => {
    try {
      const newFlagStatus = currentFlagStatus === 'flagged' ? null : 'flagged'
      
      const { error } = await supabase
        .from('incoming_emails')
        .update({ flag_status: newFlagStatus })
        .eq('id', emailId)

      if (error) {
        console.error('❌ Error updating flag status:', error)
        toast.error('Failed to update flag status')
        return
      }

      setEmails(prev => prev.map(email => 
        email.id === emailId ? { ...email, flag_status: newFlagStatus } : email
      ))
      
      toast.success(newFlagStatus ? 'Email flagged' : 'Flag removed')
    } catch (error) {
      console.error('❌ Error in toggleFlag:', error)
      toast.error('Failed to update flag status')
    }
  }

  // ✅ Enhanced category management
  const addCategory = async (emailId: string) => {
    const category = newTags[emailId]?.trim()
    if (!category) return

    try {
      const email = emails.find(e => e.id === emailId)
      const currentCategories = email?.categories || []
      const updatedCategories = [...currentCategories, category]

      const { error } = await supabase
        .from('incoming_emails')
        .update({ categories: updatedCategories })
        .eq('id', emailId)

      if (error) {
        console.error('❌ Error adding category:', error)
        toast.error('Failed to add category')
        return
      }

      setEmails(prev => prev.map(email => 
        email.id === emailId ? { ...email, categories: updatedCategories } : email
      ))
      
      setNewTags(prev => ({ ...prev, [emailId]: '' }))
      toast.success('Category added')
    } catch (error) {
      console.error('❌ Error in addCategory:', error)
      toast.error('Failed to add category')
    }
  }

  const removeCategory = async (emailId: string, categoryToRemove: string) => {
    try {
      const email = emails.find(e => e.id === emailId)
      const currentCategories = email?.categories || []
      const updatedCategories = currentCategories.filter(cat => cat !== categoryToRemove)

      const { error } = await supabase
        .from('incoming_emails')
        .update({ categories: updatedCategories })
        .eq('id', emailId)

      if (error) {
        console.error('❌ Error removing category:', error)
        toast.error('Failed to remove category')
        return
      }

      setEmails(prev => prev.map(email => 
        email.id === emailId ? { ...email, categories: updatedCategories } : email
      ))
      
      toast.success('Category removed')
    } catch (error) {
      console.error('❌ Error in removeCategory:', error)
      toast.error('Failed to remove category')
    }
  }

  const toggleTagTools = (emailId: string) => {
    setShowTagTools(prev => {
      const newSet = new Set(prev)
      if (newSet.has(emailId)) {
        newSet.delete(emailId)
      } else {
        newSet.add(emailId)
      }
      return newSet
    })
  }

  // ✅ Enhanced assignment management
  const handleAssignmentChange = (emailId: string, assignment: {
    buildingId: number | null;
    unitId: number | null;
    leaseholderId: string | null;
    assignmentLabel: string;
  }) => {
    setEmailAssignments(prev => ({
      ...prev,
      [emailId]: assignment
    }))
    
    setShowAssignmentDropdowns(prev => {
      const newSet = new Set(prev)
      newSet.delete(emailId)
      return newSet
    })
  }

  const toggleAssignmentDropdowns = (emailId: string) => {
    setShowAssignmentDropdowns(prev => {
      const newSet = new Set(prev)
      if (newSet.has(emailId)) {
        newSet.delete(emailId)
      } else {
        newSet.add(emailId)
      }
      return newSet
    })
  }

  // ✅ Enhanced utility functions
  const getAssignmentLabel = (email: Email) => {
    const assignment = emailAssignments[email.id]
    if (assignment?.assignmentLabel) {
      return assignment.assignmentLabel
    }
    
    if (email.buildings?.name) {
      return email.buildings.name
    }
    
    if (email.units?.unit_number) {
      return `Unit ${email.units.unit_number}`
    }
    
    return 'Unassigned'
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Unknown date'
    
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString('en-GB', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    } else if (diffInHours < 168) {
      return date.toLocaleDateString('en-GB', { 
        weekday: 'short' 
      })
    } else {
      return date.toLocaleDateString('en-GB', { 
        day: '2-digit', 
        month: 'short' 
      })
    }
  }

  const getSenderInitials = (email: string | null) => {
    if (!email) return '?'
    const name = email.split('@')[0]
    return name.substring(0, 2).toUpperCase()
  }

  const getSenderName = (email: string | null) => {
    if (!email) return 'Unknown Sender'
    return email.split('@')[0]
  }

  // ✅ Enhanced filtered emails with folder support
  const filteredEmails = useMemo(() => {
    return emails
      .filter(email => {
        // Search filter
        const matchesSearch = !searchTerm || 
          (email.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
           email.from_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
           email.body_preview?.toLowerCase().includes(searchTerm.toLowerCase()))
        
        // Status filter
        const matchesFilter = 
          filterStatus === 'all' ||
          (filterStatus === 'unread' && email.unread) ||
          (filterStatus === 'flagged' && email.flag_status === 'flagged') ||
          (filterStatus === 'handled' && email.handled)
        
        // Folder filter
        const matchesFolder = 
          currentFolder === 'inbox' ||
          (currentFolder === 'archived' && email.flag_status === 'archived') ||
          (currentFolder === 'complaints' && email.categories?.includes('complaint')) ||
          (currentFolder === 'leaseholder-queries' && email.categories?.includes('query')) ||
          (currentFolder === 'action-required' && !email.handled)
        
        return matchesSearch && matchesFilter && matchesFolder
      })
      .sort((a, b) => {
        switch (sortBy) {
          case 'sender':
            return (a.from_email || '').localeCompare(b.from_email || '')
          case 'subject':
            return (a.subject || '').localeCompare(b.subject || '')
          case 'date':
          default:
            return new Date(b.received_at || '').getTime() - new Date(a.received_at || '').getTime()
        }
      })
  }, [emails, searchTerm, filterStatus, sortBy, currentFolder])

  // ✅ Enhanced empty state
  if (emails.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="text-center">
            <div className="w-24 h-24 bg-gradient-to-r from-teal-600 via-blue-600 to-purple-600 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-2xl">
              <Mail className="h-12 w-12 text-white" />
            </div>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-teal-600 via-blue-600 to-purple-600 bg-clip-text text-transparent mb-6">
              No emails found
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto leading-relaxed">
              Your inbox is empty. Emails will appear here once they are synced from your connected account.
            </p>
            
            <BlocIQButton
              onClick={handleRefresh}
              disabled={isRefreshing}
              size="lg"
              className="inline-flex items-center gap-3 bg-gradient-to-r from-teal-600 via-blue-600 to-purple-600 hover:from-teal-700 hover:via-blue-700 hover:to-purple-700"
            >
              <RefreshCw className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Syncing...' : 'Sync Emails'}
            </BlocIQButton>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Enhanced Header with BlocIQ styling */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-r from-teal-600 via-blue-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Mail className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-teal-600 via-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Email Inbox
                </h1>
                <div className="flex items-center gap-3 mt-1">
                  <LiveInboxStatus 
                    isSubscribed={isSubscribed}
                    onSetupWebhook={() => window.location.reload()}
                  />
                  {newEmailCount > 0 && (
                    <div className="flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-full text-sm font-medium animate-pulse shadow-lg">
                      <Bell className="h-3 w-3" />
                      <span>{newEmailCount} new</span>
                    </div>
                  )}
                  <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                    syncStatus === 'live' ? 'bg-green-100 text-green-700' :
                    syncStatus === 'partial' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {syncStatus === 'live' ? '🟢 Live' : 
                     syncStatus === 'partial' ? '🟡 Partial' : '🔴 Offline'}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <BlocIQButton
                onClick={handleRefresh}
                disabled={isRefreshing || isReloading}
                size="sm"
                variant="outline"
                className="border-gray-300 hover:bg-gray-50"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isReloading ? 'Reloading...' : isRefreshing ? 'Syncing...' : 'Manual Sync'}
              </BlocIQButton>
              
              <BlocIQButton
                onClick={testRealTime}
                size="sm"
                variant="outline"
                className="border-purple-300 text-purple-600 hover:bg-purple-50"
              >
                <TestTube className="h-4 w-4" />
                Test Real-time
              </BlocIQButton>

              <div className="relative">
                <BlocIQButton
                  onClick={() => setShowToolsMenu(!showToolsMenu)}
                  size="sm"
                  variant="outline"
                  className="border-red-300 text-red-600 hover:bg-red-50"
                >
                  <Wrench className="h-4 w-4" />
                  Tools
                </BlocIQButton>
                
                {showToolsMenu && (
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-200 z-50">
                    <div className="p-2">
                      <button
                        onClick={handleCleanup}
                        className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-2"
                      >
                        <Trash2 className="h-4 w-4" />
                        Cleanup & Sync All
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Search and Filters */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search emails by subject, sender, or content..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-4 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-gray-900 shadow-sm"
            />
          </div>
          
          <div className="flex gap-3">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="px-4 py-4 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white shadow-sm"
            >
              <option value="all">All ({emails.length})</option>
              <option value="unread">Unread ({unreadCount})</option>
              <option value="flagged">Flagged ({flaggedCount})</option>
              <option value="handled">Handled ({handledCount})</option>
            </select>
            
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-4 py-4 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white shadow-sm"
            >
              <option value="date">Date</option>
              <option value="sender">Sender</option>
              <option value="subject">Subject</option>
            </select>
          </div>
        </div>
      </div>

      {/* Enhanced Main Content with Folder Sidebar */}
      <div className="max-w-7xl mx-auto px-6 pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Enhanced Folder Sidebar */}
          <div className="lg:col-span-1">
            <FolderSidebar
              currentFilter={currentFolder}
              onFilterChange={setCurrentFolder}
              onSync={handleRefresh}
              isSyncing={isRefreshing}
              lastSync={new Date().toISOString()}
            />
          </div>

          {/* Enhanced Email List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
                <h2 className="text-xl font-bold text-gray-900">Recent Emails</h2>
                <p className="text-sm text-gray-600 mt-1">{filteredEmails.length} emails</p>
              </div>
              
              <div className="max-h-[calc(100vh-400px)] overflow-y-auto">
                {filteredEmails.map((email) => {
                  const isSelected = selectedEmail === email.id
                  
                  return (
                    <div
                      key={email.id}
                      onClick={() => toggleEmailSelection(email.id, email.from_email)}
                      className={`p-6 border-b border-gray-100 cursor-pointer transition-all duration-200 hover:bg-gray-50 ${
                        isSelected ? 'bg-gradient-to-r from-teal-50 to-blue-50 border-l-4 border-l-teal-500' : ''
                      } ${email.unread ? 'bg-blue-50' : ''}`}
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-gradient-to-r from-teal-600 via-blue-600 to-purple-600 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg">
                          <span className="text-white font-semibold text-sm">
                            {getSenderInitials(email.from_email)}
                          </span>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-3">
                            <span className={`font-semibold truncate ${
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
                          
                          <h3 className={`font-medium mb-3 line-clamp-2 ${
                            email.unread ? 'text-gray-900' : 'text-gray-700'
                          }`}>
                            {email.subject || 'No subject'}
                          </h3>
                          
                          <p className="text-sm text-gray-600 line-clamp-2 mb-4">
                            {email.body_preview || 'No preview available'}
                          </p>
                          
                          <div className="flex items-center gap-3">
                            {email.unread && (
                              <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"></div>
                            )}
                            {email.handled && (
                              <CheckCircle className="h-5 w-5 text-green-500" />
                            )}
                            <span className="text-xs px-3 py-1 bg-gray-100 text-gray-700 rounded-full font-medium">
                              {getAssignmentLabel(email)}
                            </span>
                            {email.categories?.map(category => (
                              <span key={category} className="text-xs px-2 py-1 bg-gradient-to-r from-teal-100 to-blue-100 text-teal-700 rounded-full">
                                {category}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Enhanced Email Content */}
          <div className="lg:col-span-2">
            {selectedEmail ? (
              <div className="space-y-6">
                <EmailDetailView 
                  email={emails.find(e => e.id === selectedEmail)! as any}
                  emailHistory={emailHistory[selectedEmail] || []}
                  isLoadingHistory={loadingHistory.has(selectedEmail)}
                  isGeneratingReply={generatingReplies.has(selectedEmail)}
                  replyResponse={replyResponses[selectedEmail]}
                  replyError={replyErrors[selectedEmail]}
                  isEditingReply={editingReplies.has(selectedEmail)}
                  editedReply={editedReplies[selectedEmail]}
                  isSendingEmail={sendingEmails.has(selectedEmail)}
                  sendResult={sendResults[selectedEmail]}
                  onToggleFlag={toggleFlag}
                  onGenerateReply={handleGenerateReply}
                  onEditReply={handleEditReply}
                  onSaveEdit={handleSaveEdit}
                  onSendEmail={handleSendEmail}
                  onCancelReply={() => {
                    setReplyResponses(prev => {
                      const newResponses = { ...prev }
                      delete newResponses[selectedEmail]
                      return newResponses
                    })
                    setEditedReplies(prev => {
                      const newReplies = { ...prev }
                      delete newReplies[selectedEmail]
                      return newReplies
                    })
                  }}
                  onUpdateEditedReply={(value) => setEditedReplies(prev => ({
                    ...prev,
                    [selectedEmail]: value
                  }))}
                  getSenderInitials={getSenderInitials}
                  formatDate={formatDate}
                  getAssignmentLabel={getAssignmentLabel as any}
                />
                
                {/* Enhanced AI Action Bar */}
                <AIActionBar
                  email={emails.find(e => e.id === selectedEmail)! as any}
                  onMarkHandled={() => {
                    setEmails(prev => prev.map(email => 
                      email.id === selectedEmail ? { ...email, handled: true } : email
                    ))
                    toast.success('Email marked as handled')
                  }}
                  onGenerateReply={handleGenerateReply}
                  onSummarizeEmail={handleSummarizeEmail}
                  onClassifyEmail={handleAiClassify}
                  isGeneratingReply={generatingReplies.has(selectedEmail)}
                  isSummarizing={aiSummarizing.has(selectedEmail)}
                  isClassifying={aiClassifying.has(selectedEmail)}
                  replyResponse={replyResponses[selectedEmail]}
                  summary={summaries[selectedEmail]}
                  replyError={replyErrors[selectedEmail]}
                />
              </div>
            ) : (
              /* Enhanced Empty State */
              <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-12">
                <div className="text-center">
                  <div className="w-24 h-24 bg-gradient-to-r from-teal-600 via-blue-600 to-purple-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl">
                    <Mail className="h-12 w-12 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold bg-gradient-to-r from-teal-600 via-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
                    Select an email
                  </h3>
                  <p className="text-gray-600 max-w-md mx-auto leading-relaxed">
                    Choose an email from the list to view its details and generate AI-powered replies
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 