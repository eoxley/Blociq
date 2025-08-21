'use client'

// Home page client component - Major works dashboard removed for cleaner interface
import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Calendar, Plus, X, Building, Clock, AlertCircle, CheckCircle, Loader2, ExternalLink, RefreshCw, MessageCircle, Sparkles, Upload, FileText, Send, Bot, ArrowRight, HelpCircle, Brain, X as XIcon, ChevronDown, ChevronUp, Minimize2, Move, CornerDownRight, FileText as FileTextIcon, Mail, Bell, MapPin, User } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'



import BuildingTodoList from '@/components/BuildingTodoList'

import BreadcrumbNavigation from '@/components/BreadcrumbNavigation'
import { BlocIQButton } from '@/components/ui/blociq-button'
import { BlocIQCard, BlocIQCardContent, BlocIQCardHeader } from '@/components/ui/blociq-card'
import { BlocIQBadge } from '@/components/ui/blociq-badge'
import BlocIQLogo from '@/components/BlocIQLogo'
import { toast } from 'sonner'
import { checkOutlookConnection, fetchOutlookEvents, getOutlookAuthUrl } from '@/lib/outlookUtils'
import { normalizeEventTimes, formatInZone, getClientZone } from '@/lib/time'
import { getTimeBasedGreeting } from '@/utils/greeting'
import CommunicationModal from '@/components/CommunicationModal'
import { getRandomWelcomeMessage } from '@/utils/messages'


type PropertyEvent = {
  building: string
  date: string
  title: string
  category: string
  source?: 'property' | 'outlook'
  event_type?: 'outlook' | 'manual'
  location?: string | null
  organiser_name?: string | null
  online_meeting?: any | null
  // New time fields for proper timezone handling
  startUtc?: string | null
  endUtc?: string | null
  timeZoneIana?: string | null
  isAllDay?: boolean
}

type Building = {
  id: number
  name: string
}

type CalendarEvent = {
  id: string
  outlook_id: string
  subject: string
  description: string
  location: string | null
  start_time: string
  end_time: string
  is_all_day: boolean
  organiser: string | null
  organiser_name: string | null
  attendees: any[]
  importance: string
  show_as: string
  categories: string[]
  web_link: string | null
  online_meeting: any | null
}

type UserData = {
  name: string
  email: string
}

type Email = {
  id: string
  subject: string
  from_email: string
  body_preview: string
  received_at: string
  handled: boolean
  unread: boolean
  flag_status: string
  categories: string[]
}

interface HomePageClientProps {
  userData: UserData
}

export default function HomePageClient({ userData }: HomePageClientProps) {
  // Add CSS animation for message fade-in
  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }
    `
    document.head.appendChild(style)
    return () => {
      if (document.head.contains(style)) {
        document.head.removeChild(style)
      }
    }
  }, [])

  const [isAddingEvent, setIsAddingEvent] = useState(false)
  const [showAddEventForm, setShowAddEventForm] = useState(false)
  const [recentEmails, setRecentEmails] = useState<Email[]>([])
  const [loadingEmails, setLoadingEmails] = useState(true)
  const [userFirstName, setUserFirstName] = useState<string>('')
  
  // Ask BlocIQ state
  const [askInput, setAskInput] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<string>('')
  const [messages, setMessages] = useState<Array<{sender: 'user' | 'ai', text: string, timestamp: Date}>>([])
  const [showChat, setShowChat] = useState(false)
  const [chatSize, setChatSize] = useState({ width: 600, height: 500 })
  const [chatPosition, setChatPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 })
  const [uploadedFiles, setUploadedFiles] = useState<Array<{file: File, id: string, name: string, size: number, type: string}>>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const [showCommunicationModal, setShowCommunicationModal] = useState(false)

  const [communicationModalData, setCommunicationModalData] = useState<{
    aiContent: string
    templateType: 'letter' | 'email' | 'notice'
    buildingName: string
    leaseholderName?: string | null
    unitNumber?: string | null
  } | null>(null)
  const askInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [currentWelcomeMessage, setCurrentWelcomeMessage] = useState('')
  const [upcomingEvents, setUpcomingEvents] = useState<PropertyEvent[]>([])
  const [buildings, setBuildings] = useState<Building[]>([])
  const [outlookConnected, setOutlookConnected] = useState(false)
  const [syncingOutlook, setSyncingOutlook] = useState(false)
  const [todosEmpty, setTodosEmpty] = useState(false)
  const [newEvent, setNewEvent] = useState({
    title: '',
    date: '',
    category: 'General'
  })

  // Set random welcome message on page load
  useEffect(() => {
    setCurrentWelcomeMessage(getRandomWelcomeMessage())
  }, [])

  useEffect(() => {
    fetchBuildings()
    fetchEvents()
    checkOutlook()
    fetchEmails()
    fetchUserFirstName()
  }, [])

  const fetchBuildings = async () => {
    try {
      const { data, error } = await supabase
        .from('buildings')
        .select('id, name')
        .order('name')

      if (error) {
        console.error('Error fetching buildings:', error)
        return
      }

      setBuildings(data || [])
    } catch (error) {
      console.error('Error in fetchBuildings:', error)
    }
  }

  const fetchEvents = async () => {
    try {
      // Fetch from both property_events and manual_events tables
      const [propertyEventsResponse, manualEventsResponse] = await Promise.all([
        supabase
          .from('property_events')
          .select('*')
          .gte('date', new Date().toISOString().split('T')[0])
          .order('date', { ascending: true })
          .limit(5),
        supabase
          .from('manual_events')
          .select('*')
          .gte('start_time', new Date().toISOString().split('T')[0])
          .order('start_time', { ascending: true })
          .limit(5)
      ])

      if (propertyEventsResponse.error) {
        console.error('Error fetching property events:', propertyEventsResponse.error)
        // Continue with empty array instead of crashing
      }

      if (manualEventsResponse.error) {
        console.error('Error fetching manual events:', manualEventsResponse.error)
        // Continue with empty array instead of crashing
      }

      // Transform property events (handle missing data gracefully)
      const propertyEvents: PropertyEvent[] = (propertyEventsResponse.data || []).map(event => {
        // Ensure proper timezone handling for property events
        const normalizedTimes = normalizeEventTimes({
          start: { 
            dateTime: event.date, 
            timeZone: 'Europe/London' 
          },
          end: { 
            dateTime: event.date, 
            timeZone: 'Europe/London' 
          }
        })
        
        return {
          building: event.building_name || 'General',
          date: event.date,
          title: event.title,
          category: event.category || 'General',
          source: 'property',
          event_type: 'manual',
          location: event.location,
          organiser_name: event.organiser_name,
          startUtc: normalizedTimes.startUtc || undefined,
          endUtc: normalizedTimes.endUtc || undefined,
          timeZoneIana: normalizedTimes.timeZoneIana || 'Europe/London',
          isAllDay: normalizedTimes.isAllDay || false
        }
      })

      // Transform manual events (handle missing data gracefully)
      const manualEvents: PropertyEvent[] = (manualEventsResponse.data || []).map(event => {
        // Ensure proper timezone handling for manual events
        const normalizedTimes = normalizeEventTimes({
          start: { 
            dateTime: event.start_time, 
            timeZone: 'Europe/London' 
          },
          end: { 
            dateTime: event.end_time || event.start_time, 
            timeZone: 'Europe/London' 
          }
        })
        
        return {
          building: event.building_id ? `Building ${event.building_id}` : 'General',
          date: event.start_time,
          title: event.title,
          category: event.category || 'Manual Entry',
          source: 'property',
          event_type: 'manual',
          location: event.location,
          organiser_name: event.organiser_name,
          startUtc: normalizedTimes.startUtc || undefined,
          endUtc: normalizedTimes.endUtc || undefined,
          timeZoneIana: normalizedTimes.timeZoneIana || 'Europe/London',
          isAllDay: normalizedTimes.isAllDay || false
        }
      })

      console.log('📅 Fetched events:', {
        propertyEvents: propertyEventsResponse.data?.length || 0,
        manualEvents: manualEventsResponse.data?.length || 0,
        manualEventsData: manualEventsResponse.data
      })

      // Debug timezone conversion
      if (propertyEvents.length > 0) {
        console.log('🕒 Property event timezone debug:', {
          original: propertyEventsResponse.data?.[0]?.date,
          normalized: propertyEvents[0],
          startUtc: propertyEvents[0]?.startUtc,
          timeZoneIana: propertyEvents[0]?.timeZoneIana
        })
      }

      // Combine and sort all events
      const allEvents = [...propertyEvents, ...manualEvents].sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      )

      setUpcomingEvents(allEvents.slice(0, 5)) // Limit to 5 total events
    } catch (error) {
      console.error('Error in fetchEvents:', error)
      // Set empty events array instead of crashing
      setUpcomingEvents([])
    }
  }

  const checkOutlook = async () => {
    try {
      const status = await checkOutlookConnection()
      setOutlookConnected(status.connected)
      
      if (status.connected) {
        await loadOutlookEvents()
      }
    } catch (error) {
      console.error('Error checking Outlook connection:', error)
    }
  }

  const loadOutlookEvents = async () => {
    try {
      const events = await fetchOutlookEvents()
      
      // Transform Outlook events to match PropertyEvent type
      const transformedOutlookEvents: PropertyEvent[] = events.map((event: any) => {
        // Ensure proper timezone handling for Outlook events
        const normalizedTimes = normalizeEventTimes({
          start: { 
            dateTime: event.start_time, 
            timeZone: event.timeZone || 'Europe/London' 
          },
          end: { 
            dateTime: event.end_time || event.start_time, 
            timeZone: event.timeZone || 'Europe/London' 
          }
        })
        
        return {
          building: 'Outlook Calendar',
          date: event.start_time,
          title: event.title || event.subject || 'Untitled Event',
          category: event.categories?.join(', ') || '📅 Outlook Event',
          source: 'outlook',
          event_type: 'outlook',
          location: event.location,
          organiser_name: event.organiser_name,
          online_meeting: event.online_meeting,
          startUtc: normalizedTimes.startUtc || undefined,
          endUtc: normalizedTimes.endUtc || undefined,
          timeZoneIana: normalizedTimes.timeZoneIana || 'Europe/London',
          isAllDay: normalizedTimes.isAllDay || false
        }
      })

      // Replace existing Outlook events with new ones, filter out past events
      setUpcomingEvents(prev => {
        const now = new Date()
        const propertyEvents = prev.filter(event => event.source === 'property')
        const futureOutlookEvents = transformedOutlookEvents.filter(event => {
          const eventDate = new Date(event.date)
          return eventDate >= now // Only include future events
        })
        
        const combined = [...propertyEvents, ...futureOutlookEvents]
        const sorted = combined.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        
        // Limit to 5 items total
        return sorted.slice(0, 5)
      })

      // toast.success('Outlook calendar synced successfully!')
    } catch (error) {
      console.error('Error syncing Outlook:', error)
      toast.error('Failed to sync Outlook calendar')
    } finally {
      setSyncingOutlook(false)
    }
  }

  const fetchEmails = async () => {
    try {
      setLoadingEmails(true)
      const { data, error } = await supabase
        .from('incoming_emails')
        .select('*')
        .eq('is_read', false)
        .order('received_at', { ascending: false })
        .limit(5)

      if (error) {
        console.error('Error fetching emails:', error)
        return
      }

      setRecentEmails(data || [])
    } catch (error) {
      console.error('Error in fetchEmails:', error)
    } finally {
      setLoadingEmails(false)
    }
  }

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsAddingEvent(true)

    try {
      const formData = new FormData(e.currentTarget as HTMLFormElement)
      const title = formData.get('title') as string
      const date = formData.get('date') as string

      // Use the proper API endpoint that inserts into manual_events table
      const response = await fetch('/api/events/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          start_time: date,
          end_time: date,
          category: 'General',
          building_id: null,
          description: '',
          location: '',
          is_all_day: true,
          priority: 'medium',
          notes: ''
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('Error adding event:', errorData)
        toast.error('Failed to add event')
        return
      }

      // toast.success('Event added successfully!')
      setShowAddEventForm(false)
      setNewEvent({ title: '', date: '', category: 'General' })
      fetchEvents() // Refresh events
    } catch (error) {
      console.error('Error in handleAddEvent:', error)
      toast.error('Failed to add event')
    } finally {
      setIsAddingEvent(false)
    }
  }

  const formatEventDate = (dateString: string) => {
    // If the date string doesn't have timezone info, assume it's in UTC
    let dateToParse = dateString
    if (!/[zZ]|[+\-]\d{2}:\d{2}$/.test(dateString)) {
      // Add 'Z' to indicate UTC if no timezone info
      dateToParse = dateString.replace(/\.\d{3}$/, '') + 'Z'
    }
    
    const date = new Date(dateToParse)
    const now = new Date()
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const isToday = date.toDateString() === now.toDateString()
    const isTomorrow = date.toDateString() === tomorrow.toDateString()

    if (isToday) return 'Today'
    if (isTomorrow) return 'Tomorrow'
    
    // Ensure UK timezone for consistent display
    return date.toLocaleDateString('en-GB', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric',
      timeZone: 'Europe/London'
    })
  }

  const handleConnectOutlook = () => {
    const authUrl = getOutlookAuthUrl()
    window.open(authUrl, '_blank')
  }

  const handleSyncOutlook = async () => {
    setSyncingOutlook(true)
    await loadOutlookEvents()
  }

  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Handle Ask BlocIQ submission
  const handleAskSubmit = async (prompt: string) => {
    // Center the chat window when it first opens
    if (!showChat) {
      const centerX = (window.innerWidth - chatSize.width) / 2
      const centerY = (window.innerHeight - chatSize.height) / 2
      setChatPosition({ x: centerX, y: centerY })
    }
    console.log('🚀 NEW handleAskSubmit called with prompt:', prompt)
    
    if (!prompt.trim() && uploadedFiles.length === 0) {
      toast.error('Please enter a question or upload a file.')
      return
    }
    
    setIsSubmitting(true)
    
    // Add user message to chat
    const userMessage = { sender: 'user' as const, text: prompt, timestamp: new Date() }
    setMessages(prev => [...prev, userMessage])
    
    try {
      console.log('🤖 Sending request to /api/ask-ai:', { prompt, contextType: 'general' })
      
      // Handle file uploads separately from text-only requests
      if (uploadedFiles.length > 0) {
        // Process multiple files sequentially
        let allSummaries: string[] = []
        let allSuggestions: string[] = []
        
        for (const uploadedFile of uploadedFiles) {
          try {
            const fileSize = formatFileSize(uploadedFile.file.size)
            console.log(`📤 Uploading file: ${uploadedFile.name} (${fileSize})`)
            
            // Update status for each file
            setUploadStatus(`Processing ${uploadedFile.name}...`)
            
            const uploadData = await uploadToAskAI(uploadedFile.file)
            
            if (uploadData.summary) {
              allSummaries.push(`**${uploadedFile.name}:**\n${uploadData.summary}`)
            }
            
            if (uploadData.suggestedActions) {
              allSuggestions.push(...uploadData.suggestedActions)
            }
            
            console.log(`✅ File processed successfully: ${uploadedFile.name}`)
            setUploadStatus(`✅ ${uploadedFile.name} processed`)
          } catch (error) {
            console.error(`❌ Failed to process file ${uploadedFile.name}:`, error)
            const errorMessage = error instanceof Error ? error.message : 'Unknown error'
            setUploadStatus(`❌ Failed: ${uploadedFile.name} - ${errorMessage}`)
            throw error
          }
        }

        // Combine all summaries and suggestions
        const combinedSummary = allSummaries.join('\n\n')
        const uniqueSuggestions = [...new Set(allSuggestions)] // Remove duplicates

        // Add AI response to chat
        const aiMessage = { 
          sender: 'ai' as const, 
          text: combinedSummary || 'All documents processed successfully', 
          timestamp: new Date() 
        }
        setMessages(prev => [...prev, aiMessage])

        // Add suggested actions if available
        if (uniqueSuggestions.length > 0) {
          const actionsMessage = { 
            sender: 'ai' as const, 
            text: `**Suggested Actions:**\n${uniqueSuggestions.join('\n')}`, 
            timestamp: new Date() 
          }
          setMessages(prev => [...prev, actionsMessage])
        }

        // Show chat interface
        setShowChat(true)
        
        // Clear input and files after submission
        setAskInput('')
        setUploadedFiles([])
        setUploadStatus('')
        return
      }

      // For text-only requests, use the main AI endpoint
      const requestBody = JSON.stringify({ 
        prompt: prompt,
        contextType: 'general'
      })

      // Call the main AI API
      const response = await fetch('/api/ask-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: requestBody,
      })

      console.log('📡 Response status:', response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ API Error:', errorText)
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`)
      }

      const data = await response.json()
      console.log('📄 API Response data:', data)
      
      if (data.error) {
        throw new Error(data.error)
      }

      // The API returns 'result' not 'response'
      const aiResponse = data.result || data.response || 'No response received'
      
      // Add AI response to chat
      const aiMessage = { sender: 'ai' as const, text: aiResponse, timestamp: new Date() }
      setMessages(prev => [...prev, aiMessage])

      // Add context summary if available
      if (data.context) {
        const contextSummary = []
        if (data.context.buildingName) contextSummary.push(`📌 Building: ${data.context.buildingName}`)
        if (data.unit_number) contextSummary.push(`🏠 Unit: ${data.unit_number}`)
        if (data.leaseholder_name) contextSummary.push(`👤 Leaseholder: ${data.leaseholder_name}`)
        if (data.context.todoCount) contextSummary.push(`📋 Open Tasks: ${data.context.todoCount} items`)
        if (data.context.complianceCount) contextSummary.push(`⚠️ Compliance: ${data.context.complianceCount} issues`)
        if (data.context.documentCount) contextSummary.push(`📄 Documents: ${data.context.documentCount} files`)
        if (data.files_uploaded > 0) contextSummary.push(`📎 Attached: ${data.files_uploaded} file(s)`)
        
        if (contextSummary.length > 0) {
          const contextMessage = { 
            sender: 'ai' as const, 
            text: `**Used Context:**\n${contextSummary.join('\n')}\n\n⚖️ *This assistant provides guidance, not legal advice.*`, 
            timestamp: new Date() 
          }
          setMessages(prev => [...prev, contextMessage])
        }
      }

      // Add follow-up action buttons
      const followUpActions = []
      if (data.context?.buildingName) {
        followUpActions.push('✍️ Draft update')
        followUpActions.push('🗓️ Add event')
        followUpActions.push('📩 Email directors')
      }
      if (data.context?.complianceCount > 0) {
        followUpActions.push('📋 Log compliance issue')
      }
      if (data.context?.todoCount > 0) {
        followUpActions.push('✅ Mark task complete')
      }
      
      if (followUpActions.length > 0) {
        const actionsMessage = { 
          sender: 'ai' as const, 
          text: `**Quick Actions:**\n${followUpActions.join('       ')}`, 
          timestamp: new Date() 
        }
        setMessages(prev => [...prev, actionsMessage])
      }
      
      // Show chat interface
      setShowChat(true)
      
      // Clear input and files after submission
      setAskInput('')
      setUploadedFiles([])
      // toast.success('Response received!')
    } catch (error) {
      console.error('❌ Error submitting to AI:', error)
      toast.error('Failed to get response from BlocIQ')
      
      // Add error message to chat
      const errorMessage = { sender: 'ai' as const, text: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`, timestamp: new Date() }
      setMessages(prev => [...prev, errorMessage])
      
      // Clear upload status on error
      setUploadStatus('')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle Enter key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleAskSubmit(askInput)
    }
  }

  // Handle example prompt click
  const handleExampleClick = (prompt: string) => {
    setAskInput(prompt)
    askInputRef.current?.focus()
  }

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  // File handling constants
  const acceptedFileTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']
  const maxFiles = 5
  const MAX_FILE_SIZE = 12 * 1024 * 1024 // 12MB

  const validateFile = (file: File): boolean => {
    if (!acceptedFileTypes.includes(file.type)) {
      toast.error(`File type not supported. Please upload PDF, DOCX, or TXT files.`)
      return false
    }
    
    if (file.size > MAX_FILE_SIZE) {
      toast.error(`File too large. Maximum size is ${(MAX_FILE_SIZE / (1024 * 1024)).toFixed(0)}MB.`)
      return false
    }
    
    if (uploadedFiles.length >= maxFiles) {
      toast.error(`Maximum ${maxFiles} files allowed.`)
      return false
    }
    
    return true
  }

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return
    
    Array.from(files).forEach(file => {
      if (validateFile(file)) {
        const fileId = Math.random().toString(36).substr(2, 9)
        const uploadedFile = {
          file,
          id: fileId,
          name: file.name,
          size: file.size,
          type: file.type
        }
        
        setUploadedFiles(prev => [...prev, uploadedFile])
        // toast.success(`✅ ${file.name} uploaded. You can now ask questions about it.`)
      }
    })
  }

  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId))
    setUploadStatus('')
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    handleFileSelect(e.dataTransfer.files)
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getFileIcon = (fileType: string) => {
    if (fileType.includes('pdf')) return '📄'
    if (fileType.includes('word') || fileType.includes('document')) return '📝'
    if (fileType.includes('text')) return '📄'
    return '📎'
  }

  // Enhanced upload function that handles both small and large files
  const uploadToAskAI = async (file: File, buildingId?: string) => {
    // Small file path - direct upload via multipart
    if (file.size <= MAX_FILE_SIZE) {
      console.log('📁 Processing small file via multipart:', file.name)
      const formData = new FormData()
      formData.append('file', file)
      if (buildingId) formData.append('buildingId', buildingId)

      const res = await fetch('/api/ask-ai/upload', { method: 'POST', body: formData })
      let json: any = null
      try { 
        json = await res.json() 
      } catch (e) {
        console.error('Failed to parse response:', e)
        // Handle non-JSON responses (like 405 HTML)
        throw new Error(`Upload failed for ${file.name}: ${res.status} ${res.statusText}`)
      }
      
      if (!res.ok || !json?.success) {
        const detail = (json && (json.error || json.message)) || `${res.status} ${res.statusText}`
        throw new Error(`Upload failed for ${file.name}: ${detail}`)
      }
      return json
    }

    // Large file path - signed URL upload
    console.log('📁 Processing large file via signed URL:', file.name)
    
    // Step 1: Get signed upload URL
    const signRes = await fetch('/api/ask-ai/upload/sign', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ 
        filename: file.name, 
        contentType: file.type || 'application/octet-stream' 
      }),
    })
    
    const signJson = await signRes.json().catch(() => ({}))
    if (!signRes.ok || !signJson?.success || !signJson?.signedUrl) {
      const detail = signJson?.error || `${signRes.status} ${signRes.statusText}`
      throw new Error(`Could not prepare upload: ${detail}`)
    }

    // Step 2: Upload file directly to storage
    const putRes = await fetch(signJson.signedUrl, {
      method: 'PUT',
      headers: { 'content-type': file.type || 'application/octet-stream' },
      body: file,
    })
    
    if (!putRes.ok) {
      throw new Error(`Storage upload failed (${putRes.status} ${putRes.statusText})`)
    }

    // Step 3: Process the uploaded file
    const procRes = await fetch('/api/ask-ai/upload', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ 
        path: signJson.path, 
        buildingId: buildingId ?? null 
      }),
    })
    
    let procJson: any = null
    try {
      procJson = await procRes.json()
    } catch (e) {
      console.error('Failed to parse processing response:', e)
      throw new Error(`Process failed: ${procRes.status} ${procRes.statusText}`)
    }
    
    if (!procRes.ok || !procJson?.success) {
      const detail = procJson?.error || `${procRes.status} ${procRes.statusText}`
      throw new Error(`Process failed: ${detail}`)
    }

    return procJson
  }

  // Helper function for processing already uploaded files
  const processStoredPath = async (path: string, buildingId?: string) => {
    const res = await fetch('/api/ask-ai/upload', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ path, buildingId: buildingId || null }),
    })
    
    let json: any = null
    try { 
      json = await res.json() 
    } catch (e) {
      console.error('Failed to parse response:', e)
      throw new Error(`Process failed: ${res.status} ${res.statusText}`)
    }
    
    if (!res.ok || !json?.success) {
      const detail = json?.error || `${res.status} ${res.statusText}`
      throw new Error(`Process failed: ${detail}`)
    }
    
    return json
  }

  // Communication action handlers
  const handleCreateLetter = (aiContent: string) => {
    // Extract building and leaseholder context if available
    const contextMessage = messages.find(m => 
      m.sender === 'ai' && m.text.includes('📌 Building:')
    )?.text || ''
    
    const buildingMatch = contextMessage.match(/📌 Building: (.+)/)
    const buildingName = buildingMatch ? buildingMatch[1] : 'General'
    
    const leaseholderMatch = contextMessage.match(/👤 Leaseholder: (.+)/)
    const leaseholderName = leaseholderMatch ? leaseholderMatch[1] : null
    
    const unitMatch = contextMessage.match(/🏠 Unit: (.+)/)
    const unitNumber = unitMatch ? unitMatch[1] : null
    
    setCommunicationModalData({
      aiContent,
      templateType: 'letter',
      buildingName,
      leaseholderName,
      unitNumber
    })
    setShowCommunicationModal(true)
  }

  const handleSendEmail = (aiContent: string) => {
    // Extract building and leaseholder context
    const contextMessage = messages.find(m => 
      m.sender === 'ai' && m.text.includes('📌 Building:')
    )?.text || ''
    
    const buildingMatch = contextMessage.match(/📌 Building: (.+)/)
    const buildingName = buildingMatch ? buildingMatch[1] : 'General'
    
    const leaseholderMatch = contextMessage.match(/👤 Leaseholder: (.+)/)
    const leaseholderName = leaseholderMatch ? leaseholderMatch[1] : null
    
    const unitMatch = contextMessage.match(/🏠 Unit: (.+)/)
    const unitNumber = unitMatch ? unitMatch[1] : null
    
    setCommunicationModalData({
      aiContent,
      templateType: 'email',
      buildingName,
      leaseholderName,
      unitNumber
    })
    setShowCommunicationModal(true)
  }

  const handleSaveAsNotice = (aiContent: string) => {
    // Extract building and leaseholder context
    const contextMessage = messages.find(m => 
      m.sender === 'ai' && m.text.includes('📌 Building:')
    )?.text || ''
    
    const buildingMatch = contextMessage.match(/📌 Building: (.+)/)
    const buildingName = buildingMatch ? buildingMatch[1] : 'General'
    
    const leaseholderMatch = contextMessage.match(/👤 Leaseholder: (.+)/)
    const leaseholderName = leaseholderMatch ? leaseholderMatch[1] : null
    
    const unitMatch = contextMessage.match(/🏠 Unit: (.+)/)
    const unitNumber = unitMatch ? unitMatch[1] : null
    
    setCommunicationModalData({
      aiContent,
      templateType: 'notice',
      buildingName,
      leaseholderName,
      unitNumber
    })
    setShowCommunicationModal(true)
  }

  const handleSaveTemplate = async (template: any) => {
    try {
      // Save to communication templates
      const { data, error } = await supabase
        .from('communication_templates')
        .insert(template)
        .select()
        .single()

      if (error) throw error

      // toast.success(`${template.template_type.charAt(0).toUpperCase() + template.template_type.slice(1)} template saved!`)
      
      // Log the action
      await supabase
        .from('communications_log')
        .insert({
          action_type: `create_${template.template_type}`,
          template_id: data.id,
          building_name: template.building_name,
          created_from_ai: true,
          ai_content: template.content.substring(0, 500)
        })

    } catch (error) {
      console.error('Error saving template:', error)
      toast.error('Failed to save template')
    }
  }

  // Drag and resize handlers for chat interface
  const handleMouseDown = (e: React.MouseEvent, type: 'drag' | 'resize') => {
    e.preventDefault()
    if (type === 'drag') {
      setIsDragging(true)
      setDragStart({ x: e.clientX - chatPosition.x, y: e.clientY - chatPosition.y })
    } else if (type === 'resize') {
      setIsResizing(true)
      setResizeStart({ 
        x: e.clientX, 
        y: e.clientY, 
        width: chatSize.width, 
        height: chatSize.height 
      })
    }
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      const newX = e.clientX - dragStart.x
      const newY = e.clientY - dragStart.y
      
      // Constrain to viewport bounds
      const maxX = window.innerWidth - chatSize.width
      const maxY = window.innerHeight - chatSize.height
      
      setChatPosition({
        x: Math.max(0, Math.min(maxX, newX)),
        y: Math.max(0, Math.min(maxY, newY))
      })
    } else if (isResizing) {
      const deltaX = e.clientX - resizeStart.x
      const deltaY = e.clientY - resizeStart.y
      
      const newWidth = Math.max(400, Math.min(800, resizeStart.width + deltaX))
      const newHeight = Math.max(400, Math.min(600, resizeStart.height + deltaY))
      
      // Adjust position if resizing would push window out of bounds
      let adjustedX = chatPosition.x
      let adjustedY = chatPosition.y
      
      if (chatPosition.x + newWidth > window.innerWidth) {
        adjustedX = window.innerWidth - newWidth
      }
      if (chatPosition.y + newHeight > window.innerHeight) {
        adjustedY = window.innerHeight - newHeight
      }
      
      setChatSize({ width: newWidth, height: newHeight })
      setChatPosition({ x: adjustedX, y: adjustedY })
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
    setIsResizing(false)
  }

  useEffect(() => {
    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, isResizing, dragStart, resizeStart])

  const fetchUserFirstName = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email) {
        const { data: profileData } = await supabase
          .from('users')
          .select('first_name')
          .eq('email', user.email)
          .single()
        
        if (profileData?.first_name) {
          setUserFirstName(profileData.first_name)
        } else {
          // Fallback: use first part of email before @
          const emailPrefix = user.email.split('@')[0]
          setUserFirstName(emailPrefix)
        }
      }
    } catch (error) {
      console.error('Error fetching user first name:', error)
      // Fallback: use first part of email before @
      if (userData.email) {
        const emailPrefix = userData.email.split('@')[0]
        setUserFirstName(emailPrefix)
      }
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Enhanced Hero Banner - BlocIQ Landing Page Style */}
      <section className="relative overflow-hidden bg-gradient-to-r from-[#4f46e5] to-[#a855f7] py-16">
        <div className="max-w-none mx-auto px-6">
          <div className="text-center">
            <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-2xl">
              <BlocIQLogo className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
              {getTimeBasedGreeting(userFirstName || userData.name)}
            </h1>
            <p className="text-xl text-white/90 max-w-3xl mx-auto leading-relaxed">
              {currentWelcomeMessage}
            </p>
          </div>
        </div>
        
        {/* Decorative Elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-10 left-10 w-32 h-32 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-1/4 w-24 h-24 bg-white/5 rounded-full blur-2xl"></div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-6 py-12 space-y-8">
        {/* 🧠 Enhanced Circular Ask BlocIQ Widget */}
        <div className="flex justify-center">
          <div 
            className={`relative transition-all duration-500 ${showChat ? 'w-[600px] h-[600px] md:w-[700px] md:h-[700px]' : 'w-[400px] h-[400px] md:w-[500px] md:h-[500px]'} rounded-full md:rounded-full rounded-3xl bg-gradient-to-br from-purple-600 via-[#4f46e5] to-indigo-500 shadow-2xl hover:shadow-3xl flex items-center justify-center p-12 group`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {/* Enhanced Radial Glow Effect */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-400/20 to-indigo-400/20 blur-xl group-hover:blur-2xl transition-all duration-500"></div>
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-300/10 to-pink-300/10 blur-2xl group-hover:blur-3xl transition-all duration-700"></div>
            
            {/* Content */}
            <div className="text-center text-white max-w-sm relative z-10">
              {/* Brain Icon with Pulse Animation - No Border */}
              <div className="w-20 h-20 flex items-center justify-center mx-auto mb-8 animate-pulse">
                <Brain className={`h-12 w-12 text-white drop-shadow-lg ${isSubmitting ? 'animate-bounce' : ''}`} />
              </div>
              
              {/* Title */}
              <h2 className="text-3xl font-bold mb-4 text-white drop-shadow-lg">
                Ask BlocIQ
              </h2>
              
              {/* Subtitle */}
              <p className="text-base text-white/90 mb-10 leading-relaxed">
                Your leasehold management assistant
              </p>
              
              {/* Single White Upload Icon - Only show when chat is closed */}
              {!showChat && (
                <div className="flex flex-col items-center mb-6">
                  <div 
                    className="cursor-pointer hover:opacity-80 transition-opacity p-2 rounded-full hover:bg-white/10 transition-all duration-200" 
                    title="Upload documents to Ask BlocIQ (PDF, DOCX, TXT)"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="text-white w-7 h-7" />
                  </div>
                  
                  {/* File count indicator */}
                  {uploadedFiles.length > 0 && (
                    <div className="mt-2 text-xs text-white/80 bg-white/20 px-2 py-1 rounded-full">
                      {uploadedFiles.length} file{uploadedFiles.length !== 1 ? 's' : ''} ready
                    </div>
                  )}
                </div>
              )}
              
                             {/* Enhanced Input Field with Clear Button - White Background - Only show when chat is closed */}
               {!showChat && (
               <div className="mb-6">
                 <div className="relative group">
                   <input
                       ref={askInputRef}
                     type="text"
                       value={askInput}
                       onChange={(e) => setAskInput(e.target.value)}
                     placeholder="Ask me anything..."
                       className="w-full px-5 py-4 bg-white text-gray-900 border border-gray-200 rounded-xl placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#4f46e5] focus:border-[#4f46e5] transition-all duration-200 text-base pr-16 shadow-lg"
                       onKeyPress={handleKeyPress}
                     />
                     
                     {/* Hidden file input for upload functionality */}
                     <input
                       ref={fileInputRef}
                       type="file"
                       multiple
                       accept=".pdf,.docx,.txt"
                       onChange={(e) => handleFileSelect(e.target.files)}
                       className="hidden"
                     />
                     
                     {/* Clear Button */}
                     {askInput && (
                       <button 
                         onClick={() => setAskInput('')}
                         className="absolute right-12 top-1/2 transform -translate-y-1/2 p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-800 rounded-lg transition-all duration-200 hover:scale-110 active:scale-95"
                       >
                         <XIcon className="h-4 w-4" />
                       </button>
                     )}
                     
                     {/* Submit Button */}
                     <button 
                       onClick={() => handleAskSubmit(askInput)}
                       disabled={(!askInput.trim() && uploadedFiles.length === 0) || isSubmitting}
                       className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2.5 bg-gradient-to-r from-[#4f46e5] to-[#a855f7] hover:brightness-110 text-white rounded-lg transition-all duration-200 hover:scale-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                     >
                       {isSubmitting ? (
                         <Loader2 className="h-5 w-5 animate-spin" />
                       ) : (
                         <ArrowRight className="h-5 w-5" />
                       )}
                   </button>
                 </div>



                                      {/* Uploaded Files Display */}
                     {uploadedFiles.length > 0 && (
                       <div className="mt-3">
                         <div className="flex items-center gap-2 mb-2">
                           <span className="text-xs font-medium text-gray-600">📄 Included in AI context:</span>
                         </div>
                         <div className="flex flex-wrap gap-2">
                           {uploadedFiles.map((file) => (
                             <div
                               key={file.id}
                               className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700 hover:bg-blue-100 transition-colors cursor-pointer group"
                               title={`${file.name} (${formatFileSize(file.size)})`}
                             >
                               <span>{getFileIcon(file.type)}</span>
                               <span className="font-medium truncate max-w-[120px]">{file.name}</span>
                               <span className={`text-xs ${
                                 file.size > MAX_FILE_SIZE ? 'text-orange-500' : 'text-blue-500'
                               } opacity-70`}>
                                 ({formatFileSize(file.size)})
                                 {file.size > MAX_FILE_SIZE && ' ⚡'}
                               </span>
                               <button
                                 type="button"
                                 onClick={() => removeFile(file.id)}
                                 className="ml-1 text-blue-400 hover:text-blue-600 transition-colors opacity-0 group-hover:opacity-100"
                               >
                                 <XIcon className="h-3 w-3" />
                               </button>
                             </div>
                           ))}
                         </div>
                     
                     {/* Upload Status Display */}
                     {uploadStatus && (
                       <div className="mt-2 p-2 bg-gray-50 border border-gray-200 rounded-lg">
                         <div className="flex items-center gap-2 text-xs">
                           {uploadStatus.includes('Processing') && (
                             <Loader2 className="h-3 w-3 animate-spin text-blue-600" />
                           )}
                           {uploadStatus.includes('✅') && (
                             <span className="text-green-600">✓</span>
                           )}
                           {uploadStatus.includes('❌') && (
                             <span className="text-red-600">✗</span>
                           )}
                           <span className={`text-xs ${
                             uploadStatus.includes('❌') ? 'text-red-600' : 
                             uploadStatus.includes('✅') ? 'text-green-600' : 
                             'text-blue-600'
                           }`}>
                             {uploadStatus}
                           </span>
                         </div>
                       </div>
                     )}
                   </div>
                 )}
               </div>
               )}

              {/* Chat Toggle Button - Only show when chat is closed */}
              {messages.length > 0 && !showChat && (
                <button
                  onClick={() => setShowChat(true)}
                  className="flex items-center gap-2 mx-auto px-4 py-3 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl text-sm font-medium transition-all duration-200 border border-white/30 hover:border-white/50 shadow-lg hover:shadow-xl"
                >
                  <ChevronDown className="h-4 w-4" />
                  View Chat ({messages.length} message{messages.length !== 1 ? 's' : ''})
                </button>
              )}
            </div>

            {/* Chat Interface */}
            {showChat && messages.length > 0 && (
              <div 
                className="fixed bg-white z-50 flex flex-col rounded-lg shadow-2xl border border-gray-200"
                style={{
                  width: `${chatSize.width}px`,
                  height: `${chatSize.height}px`,
                  left: `${chatPosition.x}px`,
                  top: `${chatPosition.y}px`
                }}
              >
                {/* Chat Header - Draggable */}
                <div 
                  className="flex items-center justify-between p-4 border-b border-gray-200 bg-white shadow-sm rounded-t-lg cursor-move hover:bg-gray-50 transition-colors"
                  onMouseDown={(e) => handleMouseDown(e, 'drag')}
                  onDoubleClick={() => {
                    const centerX = (window.innerWidth - 600) / 2
                    const centerY = (window.innerHeight - 500) / 2
                    setChatPosition({ x: centerX, y: centerY })
                    setChatSize({ width: 600, height: 500 })
                  }}
                  title="Drag to move chat window, double-click to reset size and position"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-gradient-to-r from-[#4f46e5] to-[#a855f7] rounded-full flex items-center justify-center">
                      <Brain className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900">BlocIQ Assistant</h3>
                      <p className="text-sm text-gray-500">{messages.length} message{messages.length !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Minimize button */}
                    <button
                      onClick={() => setShowChat(false)}
                      className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-lg"
                      aria-label="Minimize Chat"
                    >
                      <Minimize2 className="h-4 w-4" />
                    </button>
                    {/* Close button */}
                    <button
                      onClick={() => {
                        setShowChat(false)
                        setMessages([])
                        setAskInput('')
                        setUploadedFiles([])
                      }}
                      className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-lg"
                      aria-label="Close Chat"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                
                {/* Scrollable Messages Area */}
                <div 
                  ref={messagesEndRef}
                  className="flex-1 overflow-y-auto p-4 space-y-3 bg-white"
                >
                  {messages.map((message, index) => (
                    <div 
                      key={index} 
                      className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'} transition-opacity duration-300 ease-in-out`}
                      style={{ 
                        opacity: 0,
                        animation: `fadeIn 0.3s ease-in-out ${index * 0.1}s forwards`
                      }}
                    >
                      <div className={`max-w-[70%] rounded-xl p-3 shadow-sm ${
                        message.sender === 'user' 
                          ? 'bg-gradient-to-r from-[#4f46e5] to-[#a855f7] text-white' 
                          : 'bg-white text-gray-900 border border-gray-200 shadow-sm'
                      }`}>
                        {/* Message Content */}
                        <div className="text-sm whitespace-pre-line leading-relaxed mb-2">
                          {message.text}
                        </div>
                        
                        {/* Action Buttons for AI Responses */}
                        {message.sender === 'ai' && (
                          <div className="flex gap-3 mt-3 pt-3 border-t border-gray-100 bg-gradient-to-r from-gray-50/50 to-white/50 rounded-lg p-2 -mx-2">
                            <button
                              onClick={() => handleCreateLetter(message.text)}
                              className="group relative p-2.5 bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white rounded-xl transition-all duration-200 hover:scale-105 hover:shadow-lg active:scale-95"
                              title="Create Letter"
                            >
                              <FileTextIcon className="h-4 w-4" />
                              <div className="absolute -top-2 -right-2 w-2 h-2 bg-pink-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                            </button>
                            <button
                              onClick={() => handleSendEmail(message.text)}
                              className="group relative p-2.5 bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white rounded-xl transition-all duration-200 hover:scale-105 hover:shadow-lg active:scale-95"
                              title="Send Email"
                            >
                              <Mail className="h-4 w-4" />
                              <div className="absolute -top-2 -right-2 w-2 h-2 bg-teal-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                            </button>
                            <button
                              onClick={() => handleSaveAsNotice(message.text)}
                              className="group relative p-2.5 bg-gradient-to-r from-teal-400 to-pink-500 hover:from-teal-500 hover:to-pink-600 text-white rounded-xl transition-all duration-200 hover:scale-105 hover:shadow-lg active:scale-95"
                              title="Save as Notice"
                            >
                              <Bell className="h-4 w-4" />
                              <div className="absolute -top-2 -right-2 w-2 h-2 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                            </button>
                          </div>
                        )}
                        
                        {/* Timestamp */}
                        <div className={`text-xs mt-2 ${
                          message.sender === 'user' ? 'text-white/70' : 'text-gray-500'
                        }`}>
                          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {/* Loading indicator */}
                  {isSubmitting && (
                    <div className="flex justify-start">
                      <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm max-w-[70%]">
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 bg-gradient-to-r from-teal-500 to-pink-500 rounded-full flex items-center justify-center animate-pulse">
                            <Brain className="h-4 w-4 text-white" />
                          </div>
                          <div className="flex items-center gap-2 text-gray-600">
                            <Loader2 className="animate-spin h-4 w-4 text-teal-600" />
                            <span className="text-sm font-medium">Thinking...</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Sticky Input Bar */}
                <div className="sticky bottom-0 bg-white p-4 border-t border-gray-200 shadow-lg">
                  {/* File Upload Zone */}
                  {uploadedFiles.length > 0 && (
                    <div className="mb-3">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-medium text-gray-600">📄 Included in AI context:</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {uploadedFiles.map((file) => (
                          <div
                            key={file.id}
                            className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700 hover:bg-blue-100 transition-colors cursor-pointer group"
                            title={`${file.name} (${formatFileSize(file.size)})`}
                          >
                            <span>{getFileIcon(file.type)}</span>
                            <span className="font-medium truncate max-w-[120px]">{file.name}</span>
                            <span className={`text-xs ${
                              file.size > MAX_FILE_SIZE ? 'text-orange-500' : 'text-blue-500'
                            } opacity-70`}>
                              ({formatFileSize(file.size)})
                              {file.size > MAX_FILE_SIZE && ' ⚡'}
                            </span>
                            <button
                              type="button"
                              onClick={() => removeFile(file.id)}
                              className="ml-1 text-blue-400 hover:text-blue-600 transition-colors opacity-0 group-hover:opacity-100"
                            >
                              <XIcon className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    <input
                      ref={askInputRef}
                      type="text"
                      value={askInput}
                      onChange={(e) => setAskInput(e.target.value)}
                      placeholder="Ask me anything..."
                      className="flex-1 rounded-xl px-3 py-2.5 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#4f46e5] focus:border-[#4f46e5] transition-all duration-200 text-sm"
                      onKeyPress={handleKeyPress}
                    />
                    
                    {/* File Upload Button */}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isSubmitting || uploadedFiles.length >= maxFiles}
                      className="p-2 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
                      title="Attach a document"
                    >
                      <Upload className="h-5 w-5" />
                    </button>
                    
                    {/* Clear Button */}
                    {askInput && (
                      <button 
                        onClick={() => setAskInput('')}
                        className="p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-800 rounded-lg transition-all duration-200 hover:scale-110 active:scale-95"
                      >
                        <XIcon className="h-4 w-4" />
                      </button>
                    )}
                    
                    {/* Submit Button */}
                    <button 
                      onClick={() => handleAskSubmit(askInput)}
                      disabled={(!askInput.trim() && uploadedFiles.length === 0) || isSubmitting}
                      className="p-2.5 bg-gradient-to-r from-[#4f46e5] to-[#a855f7] hover:brightness-110 text-white rounded-xl transition-all duration-200 hover:scale-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                    >
                      {isSubmitting ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <ArrowRight className="h-5 w-5" />
                      )}
                    </button>
                  </div>

                  {/* Quick Actions - Reduced size for better visibility */}
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                      <span>AI Assistant Active</span>
                    </div>
                    <button
                      onClick={() => {
                        setMessages([])
                        setAskInput('')
                        setUploadedFiles([])
                        setUploadStatus('')
                      }}
                      className="text-xs text-gray-500 hover:text-gray-700 transition-colors px-2 py-1 hover:bg-gray-100 rounded-lg"
                    >
                      Clear Chat
                    </button>
                  </div>
                </div>
                
                {/* Resize Handle */}
                <div 
                  className="absolute bottom-0 right-0 w-6 h-6 cursor-se-resize flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors border-l border-t border-gray-200 bg-white rounded-tl hover:bg-gray-50"
                  onMouseDown={(e) => handleMouseDown(e, 'resize')}
                  title="Resize chat window"
                >
                  <CornerDownRight className="h-4 w-4" />
                </div>
              </div>
            )}
          </div>
        </div>



        {/* Today's Tasks Section */}
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Today's Tasks</h2>
            <p className="text-gray-600">Manage your property events and building tasks</p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[600px] mb-8">
            {/* Property Events Widget */}
            <div className="h-full">
              <div className="bg-white rounded-2xl shadow-lg border-0 overflow-hidden h-full flex flex-col">
                <div className="bg-gradient-to-r from-[#4f46e5] to-[#a855f7] p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                        <Calendar className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold">Property Events</h2>
                        <p className="text-sm text-white/80">Manage your property events</p>
                      </div>
                    </div>
                    
                    {/* Outlook Integration Status */}
                    <div className="flex items-center gap-2">
                      {outlookConnected ? (
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1 text-xs bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full">
                            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                            <span>Outlook Connected</span>
                          </div>
                          <button
                            onClick={handleSyncOutlook}
                            disabled={syncingOutlook}
                            className="bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white px-3 py-1 rounded-full text-xs transition-all duration-200"
                          >
                            {syncingOutlook ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <RefreshCw className="h-3 w-3" />
                            )}
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={handleConnectOutlook}
                          className="bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white px-3 py-1 rounded-full text-xs transition-all duration-200"
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          Connect Outlook
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="p-6 flex-1 overflow-y-auto">
                  {/* Add Event Button */}
                  {!showAddEventForm && (
                    <div className="text-center mb-6">
                      <button
                        onClick={() => setShowAddEventForm(true)}
                        className="bg-gradient-to-r from-[#4f46e5] to-[#a855f7] hover:brightness-110 text-white px-6 py-3 rounded-xl font-medium shadow-lg transition-all duration-200"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add New Event
                      </button>
                    </div>
                  )}

                  {/* Manual Event Input Form */}
                  {showAddEventForm && (
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-gray-900">Add New Event</h3>
                        <button
                          type="button"
                          onClick={() => setShowAddEventForm(false)}
                          className="text-gray-500 hover:text-gray-700 transition-colors"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>
                      <form onSubmit={handleAddEvent} className="space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Event Title</label>
                            <input
                              type="text"
                              name="title"
                              required
                              className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4f46e5] focus:border-transparent"
                              placeholder="Enter event title"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Building</label>
                            <select
                              name="building"
                              required
                              className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4f46e5] focus:border-transparent"
                            >
                              <option value="">Select a building</option>
                              {buildings.map((building) => (
                                <option key={building.id} value={building.name}>
                                  {building.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                            <input
                              type="date"
                              name="date"
                              required
                              className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4f46e5] focus:border-transparent"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                            <input
                              type="time"
                              name="time"
                              required
                              className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4f46e5] focus:border-transparent"
                            />
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                          <textarea
                            name="description"
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4f46e5] focus:border-transparent"
                            placeholder="Enter event description"
                          />
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <button
                            type="submit"
                            disabled={isAddingEvent}
                            className="bg-gradient-to-r from-[#4f46e5] to-[#a855f7] hover:brightness-110 text-white px-6 py-2 rounded-xl font-medium shadow-lg transition-all duration-200 disabled:opacity-50"
                          >
                            {isAddingEvent ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                              <Plus className="h-4 w-4 mr-2" />
                            )}
                            {isAddingEvent ? 'Adding...' : 'Add Event'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowAddEventForm(false)}
                            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  {/* Events List */}
                  {upcomingEvents.length > 0 ? (
                    <div className="space-y-3">
                      {upcomingEvents.map((event, index) => {
                        const eventDate = new Date(event.date)
                        const now = new Date()
                        const tomorrow = new Date(now)
                        tomorrow.setDate(tomorrow.getDate() + 1)
                        
                        const isToday = eventDate.toDateString() === now.toDateString()
                        const isTomorrow = eventDate.toDateString() === tomorrow.toDateString()
                        
                        const date = formatEventDate(event.date)
                        
                        // Use new timezone-aware time formatting
                        let timeDisplay: string
                        if (event.isAllDay) {
                          timeDisplay = 'All day'
                        } else if (event.startUtc) {
                          // Always use UK time for display
                          timeDisplay = formatInZone(event.startUtc, 'Europe/London', 'HH:mm')
                        } else if (event.date) {
                          // Fallback: parse the date and ensure UK timezone
                          try {
                            // If the date string doesn't have timezone info, assume it's in UTC
                            let dateString = event.date
                            if (!/[zZ]|[+\-]\d{2}:\d{2}$/.test(dateString)) {
                              // Add 'Z' to indicate UTC if no timezone info
                              dateString = dateString.replace(/\.\d{3}$/, '') + 'Z'
                            }
                            const eventDate = new Date(dateString)
                            timeDisplay = eventDate.toLocaleTimeString('en-GB', { 
                              hour: '2-digit', 
                              minute: '2-digit',
                              timeZone: 'Europe/London'
                            })
                          } catch (e) {
                            timeDisplay = 'Time unavailable'
                          }
                        } else {
                          timeDisplay = 'Time unavailable'
                        }

                        return (
                          <div key={index} className="bg-white rounded-xl p-4 border border-gray-200 hover:shadow-lg transition-all duration-200 hover:scale-[1.02]">
                            <div className="flex items-start gap-4">
                              {/* Event Icon */}
                              <div className="w-10 h-10 bg-gradient-to-r from-[#4f46e5] to-[#a855f7] rounded-xl flex items-center justify-center text-white flex-shrink-0">
                                <Calendar className="h-5 w-5" />
                              </div>
                              
                              {/* Event Content */}
                              <div className="flex-1 min-w-0">
                                {/* Event Header */}
                                <div className="flex items-start justify-between mb-3">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3 mb-2">
                                      <h4 className="text-lg font-semibold text-gray-900 truncate">{event.title}</h4>
                                      {(isToday || isTomorrow) && (
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0 ${
                                          isToday 
                                            ? 'bg-red-100 text-red-700' 
                                            : 'bg-amber-100 text-amber-700'
                                        }`}>
                                          {isToday ? 'Today' : 'Tomorrow'}
                                        </span>
                                      )}
                                    </div>
                                    
                                    {/* Source Badges */}
                                    <div className="flex items-center gap-2 mb-3">
                                      {event.category && (
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                          {event.category}
                                        </span>
                                      )}
                                      {event.source === 'outlook' && (
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                          Outlook Event
                                        </span>
                                      )}
                                      {event.source === 'property' && (
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                          Property Event
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Event Details Grid */}
                                <div className="grid grid-cols-1 gap-3">
                                  {/* Date & Time */}
                                  <div className="flex items-start gap-3">
                                    <div className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                                      <Clock className="h-3 w-3 text-blue-600" />
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium text-gray-700 mb-1">Date & Time</p>
                                      <p className="text-gray-900 font-semibold">
                                        {date} at {timeDisplay}
                                      </p>
                                      <p className="text-xs text-gray-500 mt-1">All times shown in GMT+1</p>
                                    </div>
                                  </div>

                                  {/* Building */}
                                  <div className="flex items-start gap-3">
                                    <div className="w-6 h-6 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                                      <Building className="h-3 w-3 text-green-600" />
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium text-gray-700 mb-1">Building</p>
                                      <p className="text-gray-900 font-semibold">{event.building || 'General'}</p>
                                    </div>
                                  </div>

                                  {/* Location */}
                                  {event.location && (
                                    <div className="flex items-start gap-3">
                                      <div className="w-6 h-6 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <MapPin className="h-3 w-3 text-purple-600" />
                                      </div>
                                      <div>
                                        <p className="text-sm font-medium text-gray-700 mb-1">Location</p>
                                        <p className="text-gray-900 font-semibold">{event.location}</p>
                                      </div>
                                    </div>
                                  )}

                                  {/* Organizer */}
                                  {event.organiser_name && (
                                    <div className="flex items-start gap-3">
                                      <div className="w-6 h-6 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <User className="h-3 w-3 text-orange-600" />
                                      </div>
                                      <div>
                                        <p className="text-sm font-medium text-gray-700 mb-1">Organizer</p>
                                        <p className="text-gray-900 font-semibold">{event.organiser_name}</p>
                                      </div>
                                    </div>
                                  )}

                                  {/* Online Meeting */}
                                  {event.online_meeting && (
                                    <div className="flex items-start gap-3">
                                      <div className="w-6 h-6 bg-[#4f46e5] rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <MessageCircle className="h-3 w-3 text-white" />
                                      </div>
                                      <div>
                                        <p className="text-sm font-medium text-gray-700 mb-1">Meeting Type</p>
                                        <p className="text-[#4f46e5] font-semibold">🎥 Online meeting available</p>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <div className="w-20 h-20 bg-gradient-to-r from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Calendar className="h-10 w-10 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">No events yet</h3>
                      <p className="text-gray-500 mb-4 max-w-sm mx-auto">
                        {outlookConnected 
                          ? 'Add property events or sync your Outlook calendar to get started.'
                          : 'Add property events or connect your Outlook calendar to get started.'
                        }
                      </p>
                      {!outlookConnected && (
                        <button
                          onClick={handleConnectOutlook}
                          className="bg-gradient-to-r from-[#4f46e5] to-[#a855f7] hover:brightness-110 text-white px-4 py-2 rounded-xl font-medium shadow-lg transition-all duration-200"
                        >
                          <ExternalLink className="h-3 w-3 mr-2" />
                          Connect Outlook Calendar
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Building To-Do Widget */}
            <div className="h-full">
              {todosEmpty ? (
                <div className="text-center py-8 flex-1 flex items-center justify-center">
                  <div className="w-16 h-16 bg-gradient-to-r from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">All caught up!</h3>
                </div>
              ) : (
                <BuildingTodoList 
                  maxItems={5} 
                  showBuildingName={true} 
                  className="h-full" 
                  onEmptyState={setTodosEmpty}
                />
              )}
            </div>
          </div>


        </div>
      </div>

      {/* Communication Modal */}
      {showCommunicationModal && communicationModalData && (
        <CommunicationModal
          isOpen={showCommunicationModal}
          onClose={() => {
            setShowCommunicationModal(false)
            setCommunicationModalData(null)
          }}
          aiContent={communicationModalData.aiContent}
          templateType={communicationModalData.templateType}
          buildingName={communicationModalData.buildingName}
          leaseholderName={communicationModalData.leaseholderName}
          unitNumber={communicationModalData.unitNumber}
          onSave={handleSaveTemplate}
        />
      )}
    </div>
  )
} 