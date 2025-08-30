'use client'

// Home page client component - Major works dashboard removed for cleaner interface
import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Calendar, Plus, X, Building, Clock, AlertCircle, CheckCircle, Loader2, ExternalLink, RefreshCw, MessageCircle, Sparkles, Upload, FileText, Send, Bot, ArrowRight, HelpCircle, Brain, X as XIcon, ChevronDown, ChevronUp, Minimize2, Move, CornerDownRight, MapPin, User } from 'lucide-react'
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
import { formatEventTimeUK } from '@/utils/date'
import CommunicationModal from '@/components/CommunicationModal'
import { getRandomWelcomeMessage } from '@/utils/messages'
import ClientOnly from '@/components/ClientOnly'


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
    
    // Add user message to chat only if there's a prompt
    if (prompt.trim()) {
      const userMessage = { sender: 'user' as const, text: prompt, timestamp: new Date() }
      setMessages(prev => [...prev, userMessage])
    }
    
    try {
      console.log('🤖 Processing request with enhanced AI:', { prompt, contextType: 'general' })
      
      // Handle file uploads separately from text-only requests
      if (uploadedFiles.length > 0) {
        console.log('🔍 Processing files, skipping text-only path')
        
        // Process multiple files sequentially
        const allResults: any[] = []
        
        for (const uploadedFile of uploadedFiles) {
          try {
            const fileSize = formatFileSize(uploadedFile.file.size)
            console.log(`📤 Uploading file: ${uploadedFile.name} (${fileSize})`)
            
            // Update status for each file
            setUploadStatus(`Processing ${uploadedFile.name}...`)
            
            const uploadData = await uploadToAskAI(uploadedFile.file)
            console.log('🔍 Upload response data:', uploadData)
            
            // Store the complete result for proper handling
            allResults.push({
              filename: uploadedFile.name,
              data: uploadData
            })
            
            if (uploadData.textLength > 0) {
              const source = uploadData.ocrSource || 'OCR'
              console.log(`✅ File processed successfully via ${source}: ${uploadedFile.name} - ${uploadData.textLength} characters extracted`)
              setUploadStatus(`✅ ${uploadedFile.name} processed via ${source} - ${uploadData.textLength} characters extracted`)
            } else {
              console.log(`⚠️ File processing failed - insufficient text: ${uploadedFile.name}`)
              setUploadStatus(`⚠️ ${uploadedFile.name} - No meaningful text extracted`)
            }
          } catch (error) {
            console.error(`❌ Failed to process file ${uploadedFile.name}:`, error)
            const errorMessage = error instanceof Error ? error.message : 'Unknown error'
            setUploadStatus(`❌ Failed: ${uploadedFile.name} - ${errorMessage}`)
            throw error
          }
        }

        // Process results and display them properly
        for (const result of allResults) {
          const { filename, data } = result
          
          if (data.documentType === 'lease') {
            // Display comprehensive lease analysis
            const leaseMessage = { 
              sender: 'ai' as const, 
              text: data.analysis || data.summary || 'Lease analysis completed', 
              timestamp: new Date() 
            }
            setMessages(prev => [...prev, leaseMessage])
            
            // Add additional lease details if available
            if (data.leaseDetails && Object.keys(data.leaseDetails).length > 0) {
              const detailsText = `**📋 LEASE DETAILS EXTRACTED:**\n\n` +
                `• **Property Address:** ${data.leaseDetails.propertyAddress || 'Not specified'}\n` +
                `• **Landlord:** ${data.leaseDetails.landlord || 'Not specified'}\n` +
                `• **Tenant:** ${data.leaseDetails.tenant || 'Not specified'}\n` +
                `• **Start Date:** ${data.leaseDetails.leaseStartDate || 'Not specified'}\n` +
                `• **End Date:** ${data.leaseDetails.leaseEndDate || 'Not specified'}\n` +
                `• **Rent:** ${data.leaseDetails.initialRent || 'Not specified'}\n` +
                `• **Service Charge:** ${data.leaseDetails.serviceCharge || 'Not specified'}\n` +
                `• **Deposit:** ${data.leaseDetails.deposit || 'Not specified'}`
              
              const detailsMessage = { 
                sender: 'ai' as const, 
                text: detailsText, 
                timestamp: new Date() 
              }
              setMessages(prev => [...prev, detailsMessage])
            }
            
            // Add compliance checklist if available
            if (data.complianceChecklist && data.complianceChecklist.length > 0) {
              const complianceText = `**🔍 COMPLIANCE CHECKLIST:**\n\n` +
                data.complianceChecklist.map((item: any) => 
                  `• ${item.item}: ${item.status === 'Y' ? '✅' : item.status === 'N' ? '❌' : '❓'} ${item.details || ''}`
                ).join('\n')
              
              const complianceMessage = { 
                sender: 'ai' as const, 
                text: complianceText, 
                timestamp: new Date() 
              }
              setMessages(prev => [...prev, complianceMessage])
            }
            
            // Add financial obligations if available
            if (data.financialObligations && data.financialObligations.length > 0) {
              const financialText = `**💰 FINANCIAL OBLIGATIONS:**\n\n` +
                data.financialObligations.map((obligation: string) => `• ${obligation}`).join('\n')
              
              const financialMessage = { 
                sender: 'ai' as const, 
                text: financialText, 
                timestamp: new Date() 
              }
              setMessages(prev => [...prev, financialMessage])
            }
            
            // Add building context if available
            if (data.buildingContext) {
              const contextText = `**🏢 BUILDING CONTEXT:**\n\n` +
                `• **Status:** ${data.buildingContext.buildingStatus === 'matched' ? '✅ Building Found in Portfolio' : '⚠️ Building Not Found in Portfolio'}\n` +
                `• **Extracted Address:** ${data.buildingContext.extractedAddress || 'Not specified'}\n` +
                `• **Building Type:** ${data.buildingContext.extractedBuildingType || 'Not specified'}`
              
              const contextMessage = { 
                sender: 'ai' as const, 
                text: contextText, 
                timestamp: new Date() 
              }
              setMessages(prev => [...prev, contextMessage])
            }
            
          } else {
            // Display standard document analysis
            const standardMessage = { 
              sender: 'ai' as const, 
              text: data.summary || 'Document analysis completed', 
              timestamp: new Date() 
            }
            setMessages(prev => [...prev, standardMessage])
          }
        }

        // Show chat interface
        setShowChat(true)
        
        // Clear input and files after successful processing
        setAskInput('')
        setUploadedFiles([])
        setUploadStatus('')
        
        console.log('🔍 File processing complete, displaying results')
        // Return early since file processing is complete and results are displayed
        return
      }

      // For text-only requests, use the enhanced AI endpoint
      console.log('🔍 No files uploaded, using enhanced AI path')
      
      // Create FormData for the enhanced endpoint
      const formData = new FormData();
      formData.append('userQuestion', prompt);
      formData.append('useMemory', 'true');
      formData.append('buildingId', 'null'); // Will be determined by context
      
      // Call the enhanced AI API for full chat response with database search
      const response = await fetch('/api/ask-ai', {
        method: 'POST',
        body: formData,
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

      // Handle enhanced endpoint response format
      let aiResponse = '';
      if (data.response) {
        // Enhanced endpoint format
        aiResponse = data.response;
        console.log('✅ Using enhanced AI response format');
        
        // Log additional enhanced endpoint data
        if (data.isDatabaseQuery) {
          console.log('🔍 Database query response detected');
        }
        if (data.isLeaseSummary) {
          console.log('📋 Lease summary response detected');
        }
        if (data.documentAnalyses) {
          console.log('📄 Document analyses available:', data.documentAnalyses.length);
        }
      } else if (data.answer) {
        // Fallback format
        aiResponse = data.answer;
        console.log('✅ Using fallback response format');
      } else if (data.result) {
        // Legacy format
        aiResponse = data.result;
        console.log('✅ Using legacy response format');
      } else {
        aiResponse = 'No response received';
        console.log('⚠️ No response format detected');
      }
      
      // Add AI response to chat
      const aiMessage = { sender: 'ai' as const, text: aiResponse, timestamp: new Date() }
      setMessages(prev => [...prev, aiMessage])

      // Log enhanced endpoint metadata
      if (data.sources) {
        console.log('📚 Sources used:', data.sources);
      }
      if (data.confidence) {
        console.log('🎯 Response confidence:', data.confidence);
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

  // Upload function that handles both small and large files
  const uploadToAskAI = async (file: File, buildingId?: string) => {
    // Small file path - direct upload via OCR endpoint for immediate text extraction
    if (file.size <= MAX_FILE_SIZE) {
      console.log('📁 Processing small file via OCR endpoint:', file.name)
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/ask-ai/upload', { method: 'POST', body: formData })
      let json: any = null
      try { 
        json = await res.json() 
      } catch (e) {
        console.error('Failed to parse response:', e)
        throw new Error(`Upload failed for ${file.name}: ${res.status} ${res.statusText}`)
      }
      
      // Log OCR source for debugging
      console.log("X-OCR-Source:", res.headers.get("X-OCR-Source"))
      
      if (!res.ok) {
        const detail = (json && (json.error || json.message)) || `${res.status} ${res.statusText}`
        throw new Error(`Upload failed for ${file.name}: ${detail}`)
      }
      
      const txt = json.text ?? json.extractedText ?? ""
      if (!json.success || (json.textLength ?? txt.length) < 500) {
        throw new Error(json.summary ?? "Couldn't extract readable text.")
      }
      
      // Convert OCR response to expected format
      return {
        success: json.success,
        documentType: 'document',
        summary: `Document processed successfully via ${json.ocrSource || 'OCR'}. Extracted ${json.textLength} characters.`,
        analysis: `Text extracted successfully using ${json.ocrSource || 'OCR'}. Document contains ${json.textLength} characters.`,
        filename: file.name,
        textLength: json.textLength || 0,
        extractedText: txt, // Include the actual extracted text
        ocrSource: json.ocrSource || 'unknown' // Track OCR source for debugging
      }
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

    // Step 3: Process the uploaded file via OCR endpoint
    const procFormData = new FormData()
    procFormData.append('file', file)
    
    const procRes = await fetch('/api/ask-ai/upload', {
      method: 'POST',
      body: procFormData,
    })
    
    let procJson: any = null
    try {
      procJson = await procRes.json()
    } catch (e) {
      console.error('Failed to parse processing response:', e)
      throw new Error(`Process failed: ${procRes.status} ${procRes.statusText}`)
    }
    
    if (!procRes.ok) {
      const detail = procJson?.error || `${procRes.status} ${procRes.statusText}`
      throw new Error(`Process failed: ${detail}`)
    }

    // Convert OCR response to expected format
    return {
      success: procJson.success,
      documentType: 'document',
      summary: procJson.success ? `Document processed successfully. Extracted ${procJson.textLength} characters via ${procJson.source || 'OCR'}.` : procJson.message || 'Document processing failed.',
      analysis: procJson.success ? `Text extracted successfully using ${procJson.source || 'OCR'}. Document contains ${procJson.textLength} characters.` : 'Document analysis completed',
      filename: file.name,
      textLength: procJson.textLength || 0,
      extractedText: procJson.text || '', // Include the actual extracted text
      ocrSource: procJson.source || 'unknown' // Track OCR source for debugging
    }
  }

    // Helper function for processing already uploaded files via OCR endpoint
  const processStoredPath = async (path: string, buildingId?: string) => {
    // For stored paths, we need to download and then process via OCR
    // This is a simplified version - in practice you might want to store the OCR result
    const formData = new FormData()
    formData.append('file', new File([''], 'stored_document.pdf', { type: 'application/pdf' }))
    
    const res = await fetch('/api/ask-ai/upload', {
      method: 'POST',
      body: formData,
    })
    
    let json: any = null
    try { 
      json = await res.json() 
    } catch (e) {
      console.error('Failed to parse response:', e)
      throw new Error(`Process failed: ${res.status} ${res.statusText}`)
    }
    
    if (!res.ok) {
      const detail = json?.error || `${res.status} ${res.statusText}`
      throw new Error(`Process failed: ${detail}`)
    }

    // Convert OCR response to expected format
    return {
      success: json.success,
      documentType: 'document',
      summary: json.success ? `Document processed successfully. Extracted ${json.textLength} characters via ${json.source || 'OCR'}.` : json.message || 'Document processing failed.',
      analysis: json.success ? `Text extracted successfully using ${json.source || 'OCR'}. Document contains ${json.textLength} characters.` : 'Document analysis completed',
      filename: 'stored_document',
      textLength: json.textLength || 0,
      extractedText: json.text || '',
      ocrSource: json.source || 'unknown' // Track OCR source for debugging
    }
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
    <div className="min-h-screen bg-secondary-bg">
      {/* Enhanced Hero Banner - Communications Hub Style */}
      <section className="relative overflow-hidden bg-gradient-to-r from-[#4f46e5] to-[#a855f7] py-16 mx-6 rounded-3xl">
        <div className="max-w-7xl mx-auto px-6">
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

      <div className="max-w-7xl mx-auto px-6 py-16 space-y-12">
        {/* 🧠 Modern Rectangular Ask BlocIQ Widget */}
        <div className="flex justify-center">
          <div 
            className={`relative transition-all duration-500 ${showChat ? 'w-[800px]' : 'w-full max-w-4xl'} bg-white rounded-3xl shadow-2xl hover:shadow-3xl border border-gray-100 overflow-hidden group`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {/* Header Section with Brand Gradient */}
            <div className="bg-gradient-to-r from-[#4f46e5] to-[#a855f7] p-8 relative overflow-hidden">
              {/* Decorative Background Elements */}
              <div className="absolute inset-0">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 left-0 w-40 h-40 bg-white/5 rounded-full blur-3xl"></div>
              </div>
              
              {/* Header Content */}
              <div className="relative z-10 text-center">
                {/* Icon and Title Row */}
                <div className="flex items-center justify-center gap-4 mb-6">
                  <div className="w-16 h-16 bg-white/25 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-xl border border-white/30">
                    <Brain className={`h-8 w-8 text-white drop-shadow-lg ${isSubmitting ? 'animate-bounce' : ''}`} />
                  </div>
                  <div>
                    <h2 className="text-4xl font-bold text-white drop-shadow-lg">
                      Ask BlocIQ
                    </h2>
                    <p className="text-lg text-white/90 mt-1">
                      Your leasehold management assistant
                    </p>
                  </div>
                </div>
                
                {/* Upload Area - Only show when chat is closed */}
                {!showChat && (
                  <div className="flex flex-col items-center">
                    <div 
                      className="cursor-pointer hover:opacity-80 transition-all duration-200 p-4 rounded-2xl hover:bg-white/20 backdrop-blur-sm shadow-lg border border-white/30" 
                      title="Upload documents to Ask BlocIQ (PDF, DOCX, TXT)"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="text-white w-8 h-8" />
                    </div>
                    
                    {/* File count indicator */}
                    {uploadedFiles.length > 0 && (
                      <div className="mt-4 text-sm text-white/90 bg-white/25 backdrop-blur-sm px-4 py-2 rounded-xl border border-white/30 shadow-lg">
                        {uploadedFiles.length} file{uploadedFiles.length !== 1 ? 's' : ''} ready
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            {/* Main Content Section */}
            <div className="p-8">
              {/* Input Section - Only show when chat is closed */}
              {!showChat && (
                <div className="space-y-6">
                  {/* Enhanced Input Field */}
                  <div className="relative group">
                    <input
                      ref={askInputRef}
                      type="text"
                      value={askInput}
                      onChange={(e) => setAskInput(e.target.value)}
                      placeholder="Ask me anything about your properties, leases, or management tasks..."
                      className="w-full px-6 py-5 bg-gray-50 text-gray-900 border border-gray-200 rounded-2xl placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#4f46e5] focus:border-[#4f46e5] focus:bg-white transition-all duration-300 text-lg pr-24 shadow-sm hover:shadow-md"
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
                        className="absolute right-16 top-1/2 transform -translate-y-1/2 p-2 bg-gray-200 hover:bg-gray-300 text-gray-600 hover:text-gray-800 rounded-xl transition-all duration-200 hover:scale-110 active:scale-95"
                      >
                        <XIcon className="h-4 w-4" />
                      </button>
                    )}
                    
                    {/* Submit Button */}
                    <button 
                      onClick={() => handleAskSubmit(askInput)}
                      disabled={(!askInput.trim() && uploadedFiles.length === 0) || isSubmitting}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 p-3 bg-gradient-to-r from-[#4f46e5] to-[#a855f7] hover:brightness-110 text-white rounded-xl transition-all duration-200 hover:scale-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
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
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-700">📄 Included in AI context:</span>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        {uploadedFiles.map((file) => (
                          <div
                            key={file.id}
                            className="flex items-center gap-3 px-4 py-2 bg-gradient-to-r from-[#4f46e5]/10 to-[#a855f7]/10 border border-[#4f46e5]/20 rounded-xl text-sm text-[#4f46e5] shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer group"
                            title={`${file.name} (${formatFileSize(file.size)})`}
                          >
                            <span className="text-lg">{getFileIcon(file.type)}</span>
                            <span className="font-medium truncate max-w-[150px]">{file.name}</span>
                            <span className={`text-xs ${
                              file.size > MAX_FILE_SIZE ? 'text-orange-600' : 'text-[#4f46e5]'
                            } opacity-80`}>
                              ({formatFileSize(file.size)})
                              {file.size > MAX_FILE_SIZE && ' ⚡'}
                            </span>
                            <button
                              type="button"
                              onClick={() => removeFile(file.id)}
                              className="ml-1 text-[#4f46e5]/70 hover:text-[#4f46e5] transition-colors opacity-0 group-hover:opacity-100 p-1 hover:bg-[#4f46e5]/10 rounded-lg"
                            >
                              <XIcon className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Upload Status Display */}
                  {uploadStatus && (
                    <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl">
                      <div className="flex items-center gap-3 text-sm">
                        {uploadStatus.includes('Processing') && (
                          <Loader2 className="h-4 w-4 animate-spin text-[#4f46e5]" />
                        )}
                        {uploadStatus.includes('✅') && (
                          <span className="text-green-600 text-lg">✓</span>
                        )}
                        {uploadStatus.includes('❌') && (
                          <span className="text-red-600 text-lg">✗</span>
                        )}
                        <span className={`text-sm ${
                          uploadStatus.includes('❌') ? 'text-red-600' : 
                          uploadStatus.includes('✅') ? 'text-green-600' : 
                          'text-[#4f46e5]'
                        }`}>
                          {uploadStatus}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Chat Toggle Button - Only show when chat is closed */}
              {messages.length > 0 && !showChat && (
                <div className="text-center pt-6">
                  <button
                    onClick={() => setShowChat(true)}
                    className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-[#4f46e5] to-[#a855f7] hover:brightness-110 text-white rounded-2xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                  >
                    <ChevronDown className="h-5 w-5" />
                    View Chat ({messages.length} message{messages.length !== 1 ? 's' : ''})
                  </button>
                </div>
              )}
            </div>

            {/* Chat Interface */}
            {showChat && messages.length > 0 && (
              <div 
                className="fixed bg-white z-50 flex flex-col rounded-2xl shadow-2xl border border-gray-200"
                style={{
                  width: `${chatSize.width}px`,
                  height: `${chatSize.height}px`,
                  left: `${chatPosition.x}px`,
                  top: `${chatPosition.y}px`
                }}
              >
                {/* Chat Header - Draggable */}
                <div 
                  className="flex items-center justify-between p-4 border-b border-gray-200 bg-white shadow-sm rounded-t-2xl cursor-move hover:bg-gray-50 transition-colors"
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
                    <div className="w-10 h-10 bg-gradient-to-r from-[#4f46e5] to-[#a855f7] rounded-full flex items-center justify-center shadow-lg">
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
                  className="flex-1 overflow-y-auto p-4 pb-24 space-y-3 bg-white"
                >
                  <ClientOnly>
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
                          
                          
                          
                          {/* Timestamp */}
                          <div className={`text-xs mt-2 ${
                            message.sender === 'user' ? 'text-white/70' : 'text-gray-500'
                          }`}>
                            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                    ))}
                  </ClientOnly>
                  
                  {/* Loading indicator */}
                  <ClientOnly>
                    {isSubmitting && (
                      <div className="flex justify-start">
                        <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm max-w-[70%]">
                          <div className="flex items-center gap-3">
                            <div className="w-6 h-6 bg-gradient-to-r from-[#4f46e5] to-[#a855f7] rounded-full flex items-center justify-center animate-pulse shadow-lg">
                              <Brain className="h-4 w-4 text-white" />
                            </div>
                            <div className="flex items-center gap-2 text-gray-600">
                              <Loader2 className="animate-spin h-4 w-4 text-[#4f46e5]" />
                              <span className="text-sm font-medium">Thinking...</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </ClientOnly>
                </div>
                
                {/* Input Bar - Positioned at bottom of chat widget */}
                <div className="absolute bottom-0 left-0 right-0 bg-white p-4 border-t border-gray-200 shadow-lg">
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
                                                           className="flex items-center gap-2 px-3 py-1.5 bg-white/90 backdrop-blur-sm border border-white/30 rounded-xl text-sm text-white shadow-lg hover:bg-white/95 transition-all duration-200 cursor-pointer group"
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
        <div className="space-y-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Today's Tasks</h2>
            <p className="text-lg text-gray-600 leading-relaxed">Manage your property events and building tasks</p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[600px] mb-8">
            {/* Property Events Widget */}
            <div className="h-full">
              <div className="bg-white rounded-2xl shadow-lg border-0 overflow-hidden h-full flex flex-col">
                {/* Header */}
                <div className="bg-gradient-to-r from-[#4f46e5] to-[#a855f7] p-6 text-white">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                        <Calendar className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold">Property Events</h2>
                        <p className="text-white/80 text-sm">Manage your property events</p>
                      </div>
                    </div>
                    
                    {/* Outlook Integration Status */}
                    <div className="flex items-center gap-2">
                      {outlookConnected ? (
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1 text-xs bg-white/25 backdrop-blur-sm px-3 py-1 rounded-xl border border-white/30 shadow-lg">
                            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                            <span>Outlook Connected</span>
                          </div>
                          <button
                            onClick={handleSyncOutlook}
                            disabled={syncingOutlook}
                            className="bg-white/25 backdrop-blur-sm hover:bg-white/35 text-white px-3 py-1 rounded-xl text-xs transition-all duration-200 border border-white/30 shadow-lg"
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
                          className="bg-white/25 backdrop-blur-sm hover:bg-white/35 text-white px-3 py-1 rounded-xl text-xs transition-all duration-200 border border-white/30 shadow-lg"
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
                        className="bg-gradient-to-r from-[#14b8a6] to-[#3b82f6] hover:brightness-110 text-white px-6 py-2 rounded-xl font-medium shadow-lg transition-all duration-200"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add New Event
                      </button>
                    </div>
                  )}

                  {/* Manual Event Input Form */}
                  {showAddEventForm && (
                    <div className="bg-gradient-to-r from-[#4f46e5]/5 to-[#a855f7]/5 rounded-xl p-6 border border-[#4f46e5]/20 shadow-lg">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-semibold text-gray-900">Add New Event</h3>
                        <button
                          type="button"
                          onClick={() => setShowAddEventForm(false)}
                          className="text-gray-500 hover:text-gray-700 transition-colors"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>
                      <form onSubmit={handleAddEvent} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Event Title</label>
                            <input
                              type="text"
                              name="title"
                              required
                              className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#14b8a6] focus:border-transparent transition-all duration-200"
                              placeholder="Enter event title"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Building</label>
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
                            <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                            <input
                              type="date"
                              name="date"
                              required
                              className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4f46e5] focus:border-transparent"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Time</label>
                            <input
                              type="time"
                              name="time"
                              required
                              className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4f46e5] focus:border-transparent"
                            />
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                          <textarea
                            name="description"
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4f46e5] focus:border-transparent"
                            placeholder="Enter event description"
                          />
                        </div>
                        
                        <div className="flex items-center gap-4 pt-2">
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
                  <ClientOnly>
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
                        
                        // Use formatEventTimeUK which properly applies GMT+1 adjustment
                        let timeDisplay: string
                        if (event.isAllDay) {
                          timeDisplay = 'All day'
                        } else if (event.startUtc) {
                          // Use formatEventTimeUK for proper GMT+1 adjustment
                          timeDisplay = formatEventTimeUK(event.startUtc)
                        } else if (event.date) {
                          // Use formatEventTimeUK for proper GMT+1 adjustment
                          timeDisplay = formatEventTimeUK(event.date)
                        } else {
                          timeDisplay = 'Time unavailable'
                        }

                        return (
                          <div key={index} className="bg-white rounded-xl p-5 border border-gray-200 hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] shadow-lg">
                            <div className="flex items-start gap-4">
                              {/* Event Icon */}
                              <div className="w-10 h-10 bg-gradient-to-r from-[#4f46e5] to-[#a855f7] rounded-xl flex items-center justify-center text-white flex-shrink-0 shadow-xl border border-white/20">
                                <Calendar className="h-5 w-5" />
                              </div>
                              
                              {/* Event Content */}
                              <div className="flex-1 min-w-0">
                                {/* Event Header */}
                                <div className="flex items-start justify-between mb-3">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3 mb-2">
                                      <h4 className="text-xl font-bold text-gray-900 truncate">{event.title}</h4>
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
                                <div className="grid grid-cols-1 gap-4 mt-4">
                                  {/* Date & Time */}
                                  <div className="flex items-start gap-3">
                                    <div className="w-6 h-6 bg-gradient-to-r from-[#4f46e5]/20 to-[#a855f7]/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 border border-[#4f46e5]/30">
                                      <Clock className="h-3 w-3 text-[#4f46e5]" />
                                    </div>
                                    <div>
                                      <p className="text-sm font-semibold text-gray-700 mb-2">Date & Time</p>
                                      <p className="text-gray-900 font-semibold">
                                        {date} at {timeDisplay}
                                      </p>
                                    </div>
                                  </div>

                                  {/* Building */}
                                  <div className="flex items-start gap-3">
                                    <div className="w-6 h-6 bg-gradient-to-r from-[#14b8a6]/20 to-[#3b82f6]/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 border border-[#14b8a6]/30">
                                      <Building className="h-3 w-3 text-[#14b8a6]" />
                                    </div>
                                    <div>
                                      <p className="text-sm font-semibold text-gray-700 mb-2">Building</p>
                                      <p className="text-gray-900 font-semibold">{event.building || 'General'}</p>
                                    </div>
                                  </div>

                                  {/* Location */}
                                  {event.location && (
                                    <div className="flex items-start gap-3">
                                      <div className="w-6 h-6 bg-gradient-to-r from-[#8b5cf6]/20 to-[#ec4899]/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 border border-[#8b5cf6]/30">
                                        <MapPin className="h-3 w-3 text-[#8b5cf6]" />
                                      </div>
                                      <div>
                                        <p className="text-sm font-semibold text-gray-700 mb-2">Location</p>
                                        <p className="text-gray-900 font-semibold">{event.location}</p>
                                      </div>
                                    </div>
                                  )}

                                  {/* Organizer */}
                                  {event.organiser_name && (
                                    <div className="flex items-start gap-3">
                                      <div className="w-6 h-6 bg-gradient-to-r from-[#f59e0b]/20 to-[#f97316]/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 border border-[#f59e0b]/30">
                                        <User className="h-3 w-3 text-[#f59e0b]" />
                                      </div>
                                      <div>
                                        <p className="text-sm font-semibold text-gray-700 mb-2">Organizer</p>
                                        <p className="text-gray-900 font-semibold">{event.organiser_name}</p>
                                      </div>
                                    </div>
                                  )}

                                  {/* Online Meeting */}
                                  {event.online_meeting && (
                                    <div className="flex items-start gap-3">
                                      <div className="w-6 h-6 bg-gradient-to-r from-[#4f46e5] to-[#a855f7] rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 shadow-lg border border-white/20">
                                        <MessageCircle className="h-3 w-3 text-white" />
                                      </div>
                                      <div>
                                        <p className="text-sm font-semibold text-gray-700 mb-2">Meeting Type</p>
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
                      <div className="w-20 h-20 bg-gradient-to-r from-[#4f46e5]/10 to-[#a855f7]/10 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl border border-[#4f46e5]/20">
                        <Calendar className="h-10 w-10 text-[#4f46e5]" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-3">No events yet</h3>
                      <p className="text-gray-600 mb-6 max-w-md mx-auto leading-relaxed">
                        {outlookConnected 
                          ? 'Add property events or sync your Outlook calendar to get started.'
                          : 'Add property events or connect your Outlook calendar to get started.'
                        }
                      </p>
                      {!outlookConnected && (
                        <button
                          onClick={handleConnectOutlook}
                          className="bg-gradient-to-r from-[#4f46e5] to-[#a855f7] hover:brightness-110 text-white px-6 py-3 rounded-xl font-medium shadow-lg transition-all duration-200"
                        >
                          <ExternalLink className="h-3 w-3 mr-2" />
                          Connect Outlook Calendar
                        </button>
                      )}
                    </div>
                  )}
                    </ClientOnly>
                </div>
              </div>
            </div>

            {/* Building To-Do Widget */}
            <div className="h-full">
              {todosEmpty ? (
                <div className="text-center py-8 flex-1 flex items-center justify-center">
                  <div className="w-16 h-16 bg-gradient-to-r from-[#14b8a6]/10 to-[#3b82f6]/10 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl border border-[#14b8a6]/20">
                    <CheckCircle className="h-8 w-8 text-[#14b8a6]" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">All caught up!</h3>
                </div>
              ) : (
                <BuildingTodoList 
                  maxItems={5} 
                  showBuildingName={true} 
                  className="h-full" 
                  onEmptyState={setTodosEmpty}
                  includeCompliance={true}
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