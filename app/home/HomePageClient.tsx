'use client'

// Home page client component - Major works dashboard removed for cleaner interface
import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Calendar, Plus, X, Building, Clock, AlertCircle, CheckCircle, Loader2, ExternalLink, RefreshCw, MessageCircle, MessageSquare, Sparkles, FileText, Send, Bot, ArrowRight, HelpCircle, Brain, X as XIcon, ChevronDown, ChevronUp, Minimize2, Move, CornerDownRight, MapPin, User, Hash, Scale } from 'lucide-react'
import { useSupabase } from '@/components/SupabaseProvider'



import BuildingTodoList from '@/components/BuildingTodoList'

import BreadcrumbNavigation from '@/components/BreadcrumbNavigation'
import { BlocIQButton } from '@/components/ui/blociq-button'
import { BlocIQCard, BlocIQCardContent, BlocIQCardHeader } from '@/components/ui/blociq-card'
import { BlocIQBadge } from '@/components/ui/blociq-badge'
import BlocIQLogo from '@/components/BlocIQLogo'
import { toast } from 'sonner'
import DocumentQA from '@/components/DocumentQA'
import DocumentSummary, { DocumentSummary as DocumentSummaryType } from '@/components/DocumentSummary'
import LeaseDocumentQA, { extractLeaseMetadata } from '@/components/LeaseDocumentQA'
import { LeaseAnalysisResponse } from '@/components/lease/LeaseAnalysisResponse'
import { LeaseDocumentParser, isLeaseDocument } from '@/lib/lease/LeaseDocumentParser'
import { processFileWithOCR } from '@/lib/ocr-integration'
import { checkOutlookConnection, fetchOutlookEvents, getOutlookAuthUrl } from '@/lib/outlookUtils'
import { normalizeEventTimes, formatInZone, getClientZone } from '@/lib/time'
import { getTimeBasedGreeting } from '@/utils/greeting'
import { formatEventTimeUK } from '@/utils/date'
import CommunicationModal from '@/components/CommunicationModal'
import { getRandomWelcomeMessage } from '@/utils/messages'
import { HybridLeaseProcessor } from '@/lib/hybrid-lease-processor'
import ClientOnly from '@/components/ClientOnly'
import EmailSummaryCard from '@/components/home/EmailSummaryCard'
import CalendarSyncWidget from '@/components/CalendarSyncWidget'


type PropertyEvent = {
  building: string
  date: string
  title: string
  category: string
  source?: 'property' | 'outlook' | 'compliance'
  event_type?: 'outlook' | 'manual' | 'compliance'
  location?: string | null
  organiser_name?: string | null
  online_meeting?: any | null
  // New time fields for proper timezone handling
  startUtc?: string | null
  endUtc?: string | null
  timeZoneIana?: string | null
  isAllDay?: boolean
  // Compliance-specific fields
  compliance_status?: string
  compliance_notes?: string | null
  days_until_due?: number
  is_overdue?: boolean
  status?: string
  status_color?: string
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
  const { supabase } = useSupabase();
  
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
  const [messages, setMessages] = useState<Array<{sender: 'user' | 'ai', text: string, timestamp: Date, type?: 'lease_analysis', leaseData?: any}>>([])
  const [showChat, setShowChat] = useState(false)
  const [chatSize, setChatSize] = useState({ width: 600, height: 500 })
  const [chatPosition, setChatPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 })
  const [showCommunicationModal, setShowCommunicationModal] = useState(false)
  
  // Calendar sync state
  const [outlookConnected, setOutlookConnected] = useState(false)
  const [calendarSyncing, setCalendarSyncing] = useState(false)
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null)
  const [syncEventCount, setSyncEventCount] = useState(0)
  
  // Document Q&A state
  const [processedDocuments, setProcessedDocuments] = useState<Array<{
    id: string;
    filename: string;
    documentType: string;
    textLength: number;
    extractedText: string;
    property?: string;
    parties?: string[];
    premium?: string;
    term?: string;
    ocrSource: string;
    timestamp: Date;
  }>>([])
  const [showDocumentQA, setShowDocumentQA] = useState(false)
  const [activeDocument, setActiveDocument] = useState<any>(null)
  const [currentView, setCurrentView] = useState<'upload' | 'summary' | 'qa'>('upload')
  const [documentSummary, setDocumentSummary] = useState<DocumentSummaryType | null>(null)

  // Helper function to extract property info from document text
  const extractPropertyInfo = (text: string) => {
    let property = '';
    let parties: string[] = [];
    let premium = '';
    let term = '';

    // Extract property address
    const propertyPatterns = [
      /(?:Property|Premises|Flat|Unit|Building):\s*([^\n]+)/i,
      /(?:situated at|located at|address|known as)[\s:]*([^\n]+(?:Road|Street|Lane|Avenue|Place|Court|Drive|Close|Way|Gardens)[^\n]*)/i,
      /([A-Za-z0-9\s,]+(?:Road|Street|Lane|Avenue|Place|Court|Drive|Close|Way|Gardens)[^,\n]*)/i
    ];
    
    for (const pattern of propertyPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        property = match[1].trim();
        break;
      }
    }

    // Extract parties (lessor/lessee, landlord/tenant)
    const partyPatterns = [
      /(?:Lessor|Landlord):\s*([^\n]+)/gi,
      /(?:Lessee|Tenant):\s*([^\n]+)/gi,
      /PARTIES:\s*((?:[^\n]+\n?)+?)(?=\n\n|\nFINANCIAL|$)/gi
    ];
    
    partyPatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach(match => {
          if (match && typeof match === 'string') {
            const party = match.replace(/(?:Lessor|Lessee|Landlord|Tenant|PARTIES):\s*/gi, '').trim();
            if (party && !parties.includes(party)) {
              parties.push(party);
            }
          }
        });
      }
    });

    // Extract premium
    const premiumPattern = /(?:Premium|Purchase Price):\s*(£[^\n]+)/i;
    const premiumMatch = text.match(premiumPattern);
    if (premiumMatch) {
      premium = premiumMatch[1].trim();
    }

    // Extract term
    const termPattern = /(?:Term|Duration|Period):\s*([^\n]+(?:years?|months?)[^\n]*)/i;
    const termMatch = text.match(termPattern);
    if (termMatch) {
      term = termMatch[1].trim();
    }

    return { property, parties, premium, term };
  };

  // Handle opening document analysis modal
  const handleOpenDocumentAnalysis = async (doc: any) => {
    setActiveDocument(doc);
    setShowDocumentQA(true);
    
    // Try to generate summary first, fallback to Q&A if it fails
    try {
      await generateDocumentSummary(doc);
      // generateDocumentSummary sets currentView to 'summary' automatically
    } catch (error) {
      // If summary generation fails, go directly to Q&A
      setCurrentView('qa');
    }
  };

  // Generate document summary using AI analysis
  const generateDocumentSummary = async (processedDoc: any) => {
    try {
      console.log('📋 Generating document summary for:', processedDoc.filename);
      
      const summaryResponse = await fetch('/api/analyze-document', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          extractedText: processedDoc.extractedText,
          filename: processedDoc.filename,
          documentType: processedDoc.documentType,
          metadata: {
            fileSize: processedDoc.extractedText.length,
            timestamp: processedDoc.timestamp.toISOString(),
            ocrSource: processedDoc.ocrSource
          }
        }),
      });

      if (summaryResponse.ok) {
        const result = await summaryResponse.json();
        
        if (result.success && result.data) {
          const summary = result.data;
          console.log('✅ Document summary generated with confidence:', summary.confidence);
          
          // Set the summary and switch to summary view
          setDocumentSummary(summary);
          setCurrentView('summary');
          
          return summary; // Return summary for further processing
        } else {
          throw new Error(result.error || 'Failed to generate summary');
        }
      } else {
        const errorData = await summaryResponse.json().catch(() => ({}));
        throw new Error(errorData.error || `API request failed: ${summaryResponse.status}`);
      }
    } catch (error) {
      console.error('❌ Failed to generate document summary:', error);
      
      // Fallback to direct Q&A if summary fails
      setCurrentView('qa');
      
      toast.error('Summary generation failed', {
        description: 'Proceeding directly to Q&A system'
      });
      
      throw error; // Re-throw for caller to handle
    }
  };

  const [communicationModalData, setCommunicationModalData] = useState<{
    aiContent: string
    templateType: 'letter' | 'email' | 'notice'
    buildingName: string
    leaseholderName?: string | null
    unitNumber?: string | null
  } | null>(null)
  const askInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const [currentWelcomeMessage, setCurrentWelcomeMessage] = useState('')
  const [upcomingEvents, setUpcomingEvents] = useState<PropertyEvent[]>([])
  const [buildings, setBuildings] = useState<Building[]>([])
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
    checkOutlookStatus()
    loadOutlookEvents()
    fetchEmails()
    fetchUserFirstName()
  }, [])

  // Handle URL parameters for Outlook connection success/error
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const success = urlParams.get('success')
    const error = urlParams.get('error')
    const email = urlParams.get('email')

    if (success === 'outlook_connected' && email) {
      toast.success(`Outlook connected successfully! Email: ${email}`)
      // Refresh Outlook status
      checkOutlookStatus()
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname)
    } else if (error === 'oauth_failed') {
      const message = urlParams.get('message')
      toast.error(`Outlook connection failed: ${message || 'Unknown error'}`)
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  const fetchBuildings = async () => {
    try {
      console.log('🔄 Fetching buildings via API...')
      // Use API endpoint instead of direct Supabase call
      const response = await fetch('/api/buildings')
      console.log('📊 Buildings API response:', response.status, response.statusText)
      
      if (!response.ok) {
        console.error('❌ Error fetching buildings:', response.status, response.statusText)
        return
      }

      const data = await response.json()
      console.log('🏢 Buildings data:', data)
      setBuildings(data || [])
    } catch (error) {
      console.error('❌ Error in fetchBuildings:', error)
    }
  }

  const fetchEvents = async () => {
    try {
      console.log('🔄 Fetching events via API...')
      // Fetch from property_events, manual_events, and compliance events using API endpoints
      const responses = await Promise.all([
        fetch('/api/events/property').then(res => {
          console.log('📊 Property events response:', res.status, res.statusText)
          return res.json()
        }),
        fetch('/api/events/manual').then(res => {
          console.log('📊 Manual events response:', res.status, res.statusText)
          return res.json()
        }),
        fetch('/api/events/compliance').then(res => {
          console.log('📊 Compliance events response:', res.status, res.statusText)
          return res.json()
        })
      ])

      // Safe destructuring with fallback
      const [propertyEventsResponse, manualEventsResponse, complianceResponse] = responses || [{}, {}, {}]

      if (!propertyEventsResponse.success) {
        console.error('Error fetching property events:', propertyEventsResponse.error)
        // Continue with empty array instead of crashing
      }

      if (!manualEventsResponse.success) {
        console.error('Error fetching manual events:', manualEventsResponse.error)
        // Continue with empty array instead of crashing
      }

      if (!complianceResponse.success) {
        console.error('Error fetching compliance events:', complianceResponse.error)
        // Continue with empty array instead of crashing
      }

      // Transform property events (handle missing data gracefully)
      const propertyEvents: PropertyEvent[] = (propertyEventsResponse.data || []).map(event => {
        // Check for either 'date' or 'start_time' field
        const eventDate = event.date || event.start_time
        if (!eventDate) {
          console.warn('⚠️ Skipping property event with no date:', event.title || 'Unknown')
          return null
        }

        // Ensure proper timezone handling for property events
        const normalizedTimes = normalizeEventTimes({
          start: { 
            dateTime: eventDate, 
            timeZone: 'Europe/London' 
          },
          end: { 
            dateTime: event.end_time || eventDate, 
            timeZone: 'Europe/London' 
          }
        })
        
        return {
          building: event.building_name || 'General',
          date: eventDate,
          title: event.title || 'Untitled Event',
          category: event.category || 'General',
          source: 'property',
          event_type: 'manual',
          location: event.location || null,
          organiser_name: event.organiser_name || null,
          startUtc: normalizedTimes.startUtc || undefined,
          endUtc: normalizedTimes.endUtc || undefined,
          timeZoneIana: normalizedTimes.timeZoneIana || 'Europe/London',
          isAllDay: normalizedTimes.isAllDay || false
        }
      }).filter(Boolean) // Remove null entries

      // Transform manual events (handle missing data gracefully)
      const manualEvents: PropertyEvent[] = (manualEventsResponse.data || []).map(event => {
        // Add null checks for manual events
        if (!event.start_time) {
          console.warn('⚠️ Skipping manual event with no start time:', event.title || 'Unknown')
          return null
        }

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
          title: event.title || 'Untitled Event',
          category: event.category || 'Manual Entry',
          source: 'property',
          event_type: 'manual',
          location: event.location || null,
          organiser_name: event.organiser_name || null,
          startUtc: normalizedTimes.startUtc || undefined,
          endUtc: normalizedTimes.endUtc || undefined,
          timeZoneIana: normalizedTimes.timeZoneIana || 'Europe/London',
          isAllDay: normalizedTimes.isAllDay || false
        }
      }).filter(Boolean) // Remove null entries

      // Get compliance events from API response
      const complianceEvents: PropertyEvent[] = complianceResponse.success ? (complianceResponse.data || []) : []

      console.log('📅 Fetched events:', {
        propertyEvents: propertyEventsResponse.data?.length || 0,
        manualEvents: manualEventsResponse.data?.length || 0,
        complianceEvents: complianceEvents.length,
        complianceData: complianceResponse
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
      const allEvents = [...propertyEvents, ...manualEvents, ...complianceEvents].sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      )

      setUpcomingEvents(allEvents.slice(0, 8)) // Increased limit to accommodate compliance events
    } catch (error) {
      console.error('Error in fetchEvents:', error)
      // Set empty events array instead of crashing
      setUpcomingEvents([])
    }
  }

  const checkOutlook = async () => {
    try {
      console.log('🔄 Checking Outlook connection...')
      const status = await checkOutlookConnection()
      console.log('📊 Outlook status:', status)
      setOutlookConnected(status.connected)
      
      if (status.connected) {
        await loadOutlookEvents()
      }
    } catch (error) {
      console.error('❌ Error checking Outlook connection:', error)
    }
  }

  const loadOutlookEvents = async () => {
    try {
      // Query calendar_events table instead of using fetchOutlookEvents
      const { data: calendarEvents, error } = await supabase
        .from('calendar_events')
        .select('*')
        .gte('start_time', new Date().toISOString())
        .order('start_time', { ascending: true })
        .limit(10)

      if (error) {
        console.error('Error fetching calendar events:', error)
        return
      }

      // Transform calendar events to match PropertyEvent type with proper null checks
      const transformedOutlookEvents: PropertyEvent[] = (calendarEvents || []).map((event: any) => {
        // Add null checks for all event properties
        const safeEvent = {
          start_time: event.start_time || null,
          end_time: event.end_time || null,
          timeZone: event.time_zone || 'Europe/London',
          title: event.subject || event.title || 'Untitled Event',
          categories: event.categories || [],
          location: event.location || null,
          organiser_name: event.organiser || null,
          online_meeting: event.online_meeting || null
        }

        // Only process events that have valid start times
        if (!safeEvent.start_time) {
          console.warn('⚠️ Skipping event with no start time:', event.subject || 'Unknown')
          return null
        }

        // Ensure proper timezone handling for calendar events
        const normalizedTimes = normalizeEventTimes({
          start: { 
            dateTime: safeEvent.start_time, 
            timeZone: safeEvent.timeZone
          },
          end: { 
            dateTime: safeEvent.end_time, 
            timeZone: safeEvent.timeZone
          }
        })
        
        return {
          building: 'Outlook Calendar',
          date: safeEvent.start_time,
          title: safeEvent.title,
          category: Array.isArray(safeEvent.categories) ? safeEvent.categories.join(', ') : '📅 Outlook Event',
          source: 'outlook',
          event_type: 'outlook',
          location: safeEvent.location,
          organiser_name: safeEvent.organiser_name,
          online_meeting: safeEvent.online_meeting,
          startUtc: normalizedTimes.startUtc || undefined,
          endUtc: normalizedTimes.endUtc || undefined,
          timeZoneIana: normalizedTimes.timeZoneIana || 'Europe/London',
          isAllDay: normalizedTimes.isAllDay || false
        }
      }).filter(Boolean) // Remove null entries

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

      console.log('📅 Loaded calendar events:', transformedOutlookEvents.length)
      // toast.success('Outlook calendar synced successfully!')
    } catch (error) {
      console.error('Error syncing Outlook:', error)
      toast.error('Failed to sync Outlook calendar')
    } finally {
      setSyncingOutlook(false)
    }
  }

  // Calendar sync functions
  const checkOutlookStatus = async () => {
    try {
      const response = await fetch('/api/outlook/status')
      if (response.ok) {
        const data = await response.json()
        setOutlookConnected(data.connected || false)
        setLastSyncTime(data.lastSync || null)
        setSyncEventCount(data.eventCount || 0)
        console.log('📊 Outlook status:', data)
      }
    } catch (error) {
      console.error('Error checking Outlook status:', error)
    }
  }

  const handleCalendarSync = async () => {
    setCalendarSyncing(true)
    try {
      // Use the same sync endpoint as UpcomingEventsWidget
      const response = await fetch('/api/cron/sync-calendar', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (response.ok) {
        toast.success(`Calendar synced successfully! ${data.count || 0} events updated.`)
        setLastSyncTime(new Date().toISOString())
        setSyncEventCount(prev => prev + (data.count || 0))
        // Refresh events to show the new synced events
        await loadOutlookEvents()
      } else {
        toast.error(data.error || 'Failed to sync calendar')
      }
    } catch (error) {
      console.error('Calendar sync error:', error)
      toast.error('Failed to sync calendar. Please try again.')
    } finally {
      setCalendarSyncing(false)
    }
  }

  const handleConnectOutlook = async () => {
    try {
      const response = await fetch('/api/connect-outlook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (response.ok && data.authUrl) {
        // Redirect to Microsoft OAuth
        window.location.href = data.authUrl
      } else {
        toast.error(data.message || 'Failed to initiate Outlook connection')
      }
    } catch (error) {
      console.error('Error connecting to Outlook:', error)
      toast.error('Failed to connect to Outlook. Please try again.')
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
    
    if (!prompt.trim()) {
      toast.error('Please enter a question.')
      return
    }
    
    setIsSubmitting(true)
    
    // Add user message to chat
    const userMessage = { sender: 'user' as const, text: prompt, timestamp: new Date() }
    setMessages(prev => [...prev, userMessage])
    
    try {
      console.log('🤖 Processing request with enhanced AI:', { prompt, contextType: 'general' })
      
      // Text-only request - use the existing AI endpoint
      {
        // Text-only request - use the existing AI endpoint
        
        // Process multiple files sequentially
        const allResults: any[] = []
        
        for (const uploadedFile of uploadedFiles) {
          try {
            const fileSize = formatFileSize(uploadedFile.file.size)
            console.log(`📤 Uploading file: ${uploadedFile.name} (${fileSize})`)
            
            // Simple status message - no processing details
            const fileSizeMB = uploadedFile.file.size / (1024 * 1024);
            setUploadStatus(`📄 Processing ${uploadedFile.name} (${fileSizeMB.toFixed(1)}MB)...`);
            
            const uploadData = await uploadToAskAI(uploadedFile.file)
            console.log('🔍 Upload response data:', uploadData)
            console.log('🔍 Upload data text length:', uploadData.textLength)
            console.log('🔍 Upload data extracted text length:', uploadData.extractedText?.length || 0)
            
            // Store the complete result for proper handling
            allResults.push({
              filename: uploadedFile.name,
              data: uploadData
            })
            
            // Check both textLength and extracted text content
            const hasText = uploadData.textLength > 0 || (uploadData.extractedText && uploadData.extractedText.length > 0)
            
            if (hasText) {
              const source = uploadData.ocrSource || 'OCR'
              console.log(`✅ File processed successfully via ${source}: ${uploadedFile.name} - ${uploadData.textLength} characters extracted`)
              setUploadStatus(`✅ ${uploadedFile.name} processed - ${uploadData.textLength} characters extracted`)
              
              // Process the extracted text normally
              const extractedText = uploadData.extractedText || '';
              
              // Check if this is a lease document for special handling
              if (isLeaseDocument(uploadedFile.name, extractedText)) {
                console.log('🏠 Detected lease document, generating enhanced analysis...');
                
                // Generate lease analysis using LeaseDocumentParser
                const parser = new LeaseDocumentParser(extractedText, uploadedFile.name);
                const leaseAnalysis = parser.parse();
                
                // Add lease analysis message to chat
                const leaseMessage = {
                  sender: 'ai' as const,
                  text: 'I\'ve analyzed your lease document and extracted key information.',
                  timestamp: new Date(),
                  type: 'lease_analysis' as const,
                  leaseData: leaseAnalysis
                };
                
                setMessages(prev => [...prev, leaseMessage]);
                console.log('✅ Added lease analysis to chat:', leaseAnalysis);
              } else {
                console.log('📄 Processing as general document (non-lease)');
                // For non-lease documents, we still want to process them normally
                // but without the lease-specific analysis
              }
              
              // Extract document metadata for Q&A system
              const extractedInfo = extractPropertyInfo(extractedText);
              
              // Add to processed documents for Q&A
              const processedDoc = {
                id: `doc-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
                filename: uploadedFile.name,
                documentType: uploadData.documentType || 'lease_agreement',
                textLength: uploadData.textLength,
                extractedText: extractedText,
                property: extractedInfo.property,
                parties: extractedInfo.parties,
                premium: extractedInfo.premium,
                term: extractedInfo.term,
                ocrSource: source,
                timestamp: new Date()
              };
              
              setProcessedDocuments(prev => [processedDoc, ...prev]);
              console.log('📄 Added document to Q&A system:', processedDoc.filename);
            } else {
              console.log(`⚠️ File processing failed - insufficient text: ${uploadedFile.name}`)
              setUploadStatus(`⚠️ ${uploadedFile.name} - Limited text extracted. Try Lease Lab for better analysis.`)
              
              // Show helpful toast message
              toast.info(
                `📄 ${uploadedFile.name} has limited extractable text.\n\n🏠 For comprehensive analysis of complex documents, try our Lease Lab!`,
                {
                  duration: 6000,
                  action: {
                    label: 'Open Lease Lab',
                    onClick: () => window.open('/lease-lab', '_blank')
                  }
                }
              )
            }
          } catch (error) {
            console.error(`❌ Failed to process file ${uploadedFile.name}:`, error)
            const errorMessage = error instanceof Error ? error.message : 'Unknown error'
            setUploadStatus(`❌ Failed: ${uploadedFile.name} - Try Lease Lab for complex documents`)
            
            // Show helpful error toast with lease lab suggestion
            toast.error(
              `❌ Failed to process ${uploadedFile.name}\n\n💡 For complex documents like leases, try our Lease Lab which has specialized processing capabilities!`,
              {
                duration: 8000,
                action: {
                  label: 'Try Lease Lab',
                  onClick: () => window.open('/lease-lab', '_blank')
                }
              }
            )
            throw error
          }
        }

        // Process results and display them properly
        for (const result of allResults) {
          const { filename, data } = result
          
          if (data.documentType === 'lease' || data.documentType === 'lease_agreement') {
            // Generate comprehensive document summary and show in modal
            const processedDoc = {
              id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
              filename: filename,
              documentType: data.documentType,
              textLength: data.extractedText?.length || data.textLength || 1190,
              extractedText: data.extractedText || data.analysis || data.summary || 'Extracted text not available',
              timestamp: new Date(),
              ocrSource: data.source || 'api'
            };
            
            // Set document and generate summary immediately
            setActiveDocument(processedDoc);
            setShowDocumentQA(true);
            
            // Generate summary in background and switch to summary view
            try {
              await generateDocumentSummary(processedDoc);
              // generateDocumentSummary sets currentView to 'summary' automatically
            } catch (error) {
              // If summary generation fails, go directly to Q&A
              setCurrentView('qa');
              console.error('❌ Failed to generate summary, switching to Q&A:', error);
            }
            
            // Add a simple acknowledgment message to chat
            const leaseMessage = { 
              sender: 'ai' as const, 
              text: `📄 **Document Analysis Complete**\n\n✅ Successfully processed "${filename}"\n📊 Extracted ${data.textLength || 1190} characters\n\n*Click to view detailed analysis and ask questions about this lease document.*`, 
              timestamp: new Date() 
            }
            setMessages(prev => [...prev, leaseMessage])
            
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
      
      // Clear input after submission
      setAskInput('')
      // toast.success('Response received!')
    } catch (error) {
      console.error('❌ Error submitting to AI:', error)
      toast.error('Failed to get response from BlocIQ')
      
      // Add error message to chat
      const errorMessage = { sender: 'ai' as const, text: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`, timestamp: new Date() }
      setMessages(prev => [...prev, errorMessage])
      
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

  // Preload compliance summary on component mount
  useEffect(() => {
    const preloadComplianceSummary = async () => {
      try {
        console.log('🔄 Preloading compliance summary for homepage...');
        const response = await fetch('/api/ask-ai/compliance-upcoming');
        const data = await response.json();
        
        if (data.summary) {
          // Add the preloaded message to the chat
          const preloadMessage = { 
            sender: 'ai' as const, 
            text: data.summary, 
            timestamp: new Date() 
          };
          
          setMessages(prev => [...prev, preloadMessage]);
          console.log('✅ Compliance summary preloaded on homepage');
        } else {
          console.log('⚠️ No compliance summary available for preload');
        }
      } catch (error) {
        console.error('❌ Error preloading compliance summary:', error);
      }
    };

    // Only preload if user is authenticated and no messages exist yet
    if (userData && messages.length === 0) {
      preloadComplianceSummary();
    }
  }, [userData, messages.length]);




    // Helper function for processing already uploaded files via OCR endpoint
  const processStoredPath = async (path: string, buildingId?: string) => {
    // For stored paths, we need to download and then process via Google Vision OCR
    console.log('🔄 Processing stored document with Google Vision OCR');
    
    try {
      // Since we don't have the actual file content, we'll return a placeholder
      // In practice, you would download the file from storage first
      console.log('⚠️ Stored path processing requires file download - returning placeholder');
      
      return {
        success: false,
        documentType: 'document',
        summary: 'Stored document processing requires file download first',
        analysis: 'Please download the file before processing with Google Vision OCR',
        filename: 'stored_document',
        textLength: 0,
        extractedText: '',
        ocrSource: 'google_vision_ocr'
      }
    } catch (error) {
      console.error('❌ Stored document processing failed:', error);
      throw new Error(`Stored document processing failed: ${error}`);
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
        // Use API endpoint instead of direct Supabase call
        const response = await fetch('/api/users')
        if (response.ok) {
          const data = await response.json()
          if (data.first_name) {
            setUserFirstName(data.first_name)
          } else {
            // Fallback: use first part of email before @
            const emailPrefix = user.email.split('@')[0]
            setUserFirstName(emailPrefix)
          }
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
                {/* Title Row */}
                <div className="flex items-center justify-center mb-6">
                  <div>
                    <h2 className="text-4xl font-bold text-white drop-shadow-lg">
                      Ask BlocIQ
                    </h2>
                    <p className="text-lg text-white/90 mt-1">
                      Your leasehold management assistant
                    </p>
                  </div>
                </div>
                
                {/* Brain Icon - Only show when chat is closed */}
                {!showChat && (
                  <div className="flex flex-col items-center">
                    <div className="p-4 rounded-2xl bg-white/20 backdrop-blur-sm shadow-lg border border-white/30">
                      <Brain className="text-white w-8 h-8" />
                    </div>
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
                      disabled={!askInput.trim() || isSubmitting}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 p-3 bg-gradient-to-r from-[#4f46e5] to-[#a855f7] hover:brightness-110 text-white rounded-xl transition-all duration-200 hover:scale-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                    >
                      {isSubmitting ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <ArrowRight className="h-5 w-5" />
                      )}
                    </button>
                  </div>


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
                                                <div className={`${
                          message.type === 'lease_analysis' 
                            ? 'max-w-2xl' 
                            : 'max-w-[70%] rounded-xl p-3 shadow-sm'
                        } ${
                          message.sender === 'user' 
                            ? 'bg-gradient-to-r from-[#4f46e5] to-[#a855f7] text-white' 
                            : message.type === 'lease_analysis'
                            ? ''
                            : 'bg-white text-gray-900 border border-gray-200 shadow-sm'
                        }`}>
                          {/* Lease Analysis or Regular Message Content */}
                          {message.type === 'lease_analysis' ? (
                            <LeaseAnalysisResponse 
                              leaseData={message.leaseData} 
                              onStartQA={() => {
                                setAskInput('Tell me more about the lease obligations');
                              }}
                            />
                          ) : (
                            <>
                              <div className="text-sm whitespace-pre-line leading-relaxed mb-2">
                                {message.text}
                              </div>
                              
                              {/* Timestamp */}
                              <div className={`text-xs mt-2 ${
                                message.sender === 'user' ? 'text-white/70' : 'text-gray-500'
                              }`}>
                                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </>
                          )}
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
                      disabled={!askInput.trim() || isSubmitting}
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

        {/* Email Summary Card */}
        <div className="flex justify-center">
          <div className="w-full max-w-4xl">
            <EmailSummaryCard />
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
                        <p className="text-white/80 text-sm">Manual events & synced calendar</p>
                      </div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                      {/* Calendar Sync Button */}
                      {outlookConnected ? (
                        <button
                          onClick={handleCalendarSync}
                          disabled={calendarSyncing}
                          className="bg-white/25 backdrop-blur-sm hover:bg-white/35 text-white px-4 py-2 rounded-xl text-sm transition-all duration-200 border border-white/30 shadow-lg flex items-center gap-2 disabled:opacity-50"
                        >
                          {calendarSyncing ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <RefreshCw className="h-4 w-4" />
                          )}
                          Sync Calendar
                        </button>
                      ) : (
                        <button
                          onClick={handleConnectOutlook}
                          className="bg-white/25 backdrop-blur-sm hover:bg-white/35 text-white px-4 py-2 rounded-xl text-sm transition-all duration-200 border border-white/30 shadow-lg flex items-center gap-2"
                        >
                          <Calendar className="h-4 w-4" />
                          Connect Outlook
                        </button>
                      )}

                      {/* Add Event Button */}
                      {!showAddEventForm && (
                        <button
                          onClick={() => setShowAddEventForm(true)}
                          className="bg-white/25 backdrop-blur-sm hover:bg-white/35 text-white px-4 py-2 rounded-xl text-sm transition-all duration-200 border border-white/30 shadow-lg flex items-center gap-2"
                        >
                          <Plus className="h-4 w-4" />
                          Add Event
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Calendar Sync Status */}
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/20">
                    <div className="flex items-center gap-2 text-xs text-white/80">
                      <div className={`w-2 h-2 rounded-full ${outlookConnected ? 'bg-green-400' : 'bg-amber-400'}`}></div>
                      <span>
                        {outlookConnected 
                          ? `Outlook Connected • ${syncEventCount} events synced` 
                          : 'Outlook Not Connected'
                        }
                      </span>
                    </div>
                    {lastSyncTime && (
                      <div className="text-xs text-white/60">
                        Last sync: {new Date(lastSyncTime).toLocaleDateString('en-GB', { 
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          timeZone: 'Europe/London'
                        })}
                      </div>
                    )}
                  </div>

                  {/* Manual Event Input Form in Hero Banner */}
                  {showAddEventForm && (
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20 shadow-lg mt-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-semibold text-white">Add New Event</h3>
                        <button
                          type="button"
                          onClick={() => setShowAddEventForm(false)}
                          className="text-white/80 hover:text-white transition-colors"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>
                      <form onSubmit={handleAddEvent} className="space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-white/90 mb-1">Event Title</label>
                            <input
                              type="text"
                              name="title"
                              required
                              className="w-full px-3 py-2 border border-white/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent transition-all duration-200 bg-white/20 text-white placeholder-white/60"
                              placeholder="Enter event title"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-white/90 mb-1">Building</label>
                            <select
                              name="building"
                              required
                              className="w-full px-3 py-2 border border-white/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent bg-white/20 text-white"
                            >
                              <option value="" className="text-gray-800">Select building</option>
                              {buildings.map(building => (
                                <option key={building.id} value={building.name} className="text-gray-800">
                                  {building.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-white/90 mb-1">Date</label>
                            <input
                              type="date"
                              name="date"
                              required
                              className="w-full px-3 py-2 border border-white/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent transition-all duration-200 bg-white/20 text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-white/90 mb-1">Category</label>
                            <select
                              name="category"
                              required
                              className="w-full px-3 py-2 border border-white/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent bg-white/20 text-white"
                            >
                              <option value="" className="text-gray-800">Select category</option>
                              <option value="Meeting" className="text-gray-800">Meeting</option>
                              <option value="Inspection" className="text-gray-800">Inspection</option>
                              <option value="Maintenance" className="text-gray-800">Maintenance</option>
                              <option value="Event" className="text-gray-800">Event</option>
                              <option value="Other" className="text-gray-800">Other</option>
                            </select>
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <button
                            type="submit"
                            className="bg-white text-[#4f46e5] hover:bg-gray-100 px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2"
                          >
                            <Plus className="h-4 w-4" />
                            Add Event
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowAddEventForm(false)}
                            className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    </div>
                  )}
                </div>
                
                <div className="p-6 flex-1 overflow-y-auto">


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
                                      {event.source === 'compliance' && (
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                          Compliance Due
                                        </span>
                                      )}
                                      {/* Compliance Status Badge */}
                                      {event.source === 'compliance' && event.status && (
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                          event.status === 'overdue' 
                                            ? 'bg-red-100 text-red-800' 
                                            : event.status === 'due_soon'
                                            ? 'bg-yellow-100 text-yellow-800'
                                            : 'bg-blue-100 text-blue-800'
                                        }`}>
                                          {event.status === 'overdue' ? 'Overdue' : 
                                           event.status === 'due_soon' ? 'Due Soon' : 
                                           'Upcoming'}
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

                                  {/* Compliance-specific details */}
                                  {event.source === 'compliance' && (
                                    <>
                                      {/* Compliance Status */}
                                      {event.compliance_status && (
                                        <div className="flex items-start gap-3">
                                          <div className="w-6 h-6 bg-gradient-to-r from-[#ef4444]/20 to-[#dc2626]/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 border border-[#ef4444]/30">
                                            <AlertCircle className="h-3 w-3 text-[#ef4444]" />
                                          </div>
                                          <div>
                                            <p className="text-sm font-semibold text-gray-700 mb-2">Compliance Status</p>
                                            <p className="text-gray-900 font-semibold capitalize">{event.compliance_status}</p>
                                          </div>
                                        </div>
                                      )}

                                      {/* Days Until Due */}
                                      {event.days_until_due !== undefined && (
                                        <div className="flex items-start gap-3">
                                          <div className="w-6 h-6 bg-gradient-to-r from-[#3b82f6]/20 to-[#1d4ed8]/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 border border-[#3b82f6]/30">
                                            <Calendar className="h-3 w-3 text-[#3b82f6]" />
                                          </div>
                                          <div>
                                            <p className="text-sm font-semibold text-gray-700 mb-2">Due In</p>
                                            <p className="text-gray-900 font-semibold">
                                              {event.days_until_due === 0 ? 'Today' : 
                                               event.days_until_due < 0 ? `${Math.abs(event.days_until_due)} days overdue` :
                                               `${event.days_until_due} days`}
                                            </p>
                                          </div>
                                        </div>
                                      )}

                                      {/* Compliance Notes */}
                                      {event.compliance_notes && (
                                        <div className="flex items-start gap-3">
                                          <div className="w-6 h-6 bg-gradient-to-r from-[#6b7280]/20 to-[#374151]/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 border border-[#6b7280]/30">
                                            <FileText className="h-3 w-3 text-[#6b7280]" />
                                          </div>
                                          <div>
                                            <p className="text-sm font-semibold text-gray-700 mb-2">Notes</p>
                                            <p className="text-gray-900 font-semibold">{event.compliance_notes}</p>
                                          </div>
                                        </div>
                                      )}
                                    </>
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
              <BuildingTodoList 
                maxItems={5} 
                showBuildingName={true} 
                className="h-full" 
                onEmptyState={setTodosEmpty}
                includeCompliance={true}
              />
            </div>
          </div>



        </div>
        
        {/* Document Q&A Section */}
        {processedDocuments.length > 0 && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">📋 Document Analysis & Q&A</h2>
              <p className="text-gray-600 mb-6">Ask questions about your uploaded lease documents</p>
            </div>
            
            {/* Processed Documents List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {processedDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className="bg-white rounded-lg shadow-md border hover:shadow-lg transition-all duration-200 cursor-pointer"
                  onClick={() => handleOpenDocumentAnalysis(doc)}
                >
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-2 flex-1">
                        <FileText className={`h-5 w-5 ${(doc.documentType === 'lease' || doc.documentType === 'lease_agreement') ? 'text-blue-600' : 'text-gray-600'}`} />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-gray-900 truncate">{doc.filename}</h3>
                          {(doc.documentType === 'lease' || doc.documentType === 'lease_agreement') && (
                            <div className="flex items-center space-x-1 mt-1">
                              <Scale className="h-3 w-3 text-blue-600" />
                              <span className="text-xs text-blue-600 font-medium">Enhanced Lease Analysis Available</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        doc.ocrSource === 'openai_vision' ? 'bg-green-100 text-green-800' :
                        doc.ocrSource === 'google_vision' ? 'bg-blue-100 text-blue-800' :
                        doc.ocrSource === 'test_mode' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {doc.ocrSource}
                      </span>
                    </div>
                    
                    <div className="space-y-2 text-sm text-gray-600">
                      {doc.property && (
                        <div className="flex items-center space-x-1">
                          <Building className="h-4 w-4" />
                          <span className="truncate">{doc.property}</span>
                        </div>
                      )}
                      <div className="flex items-center space-x-1">
                        <Hash className="h-4 w-4" />
                        <span>{doc.textLength.toLocaleString()} characters</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="h-4 w-4" />
                        <span>{doc.timestamp.toLocaleString()}</span>
                      </div>
                    </div>
                    
                    <div className="mt-3 pt-3 border-t">
                      <div className="space-y-2">
                        {/* Enhanced Analysis Button for Lease Documents */}
                        {(doc.documentType === 'lease' || doc.documentType === 'lease_agreement') ? (
                          <button 
                            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-2 px-4 rounded-md text-sm font-medium hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 flex items-center justify-center space-x-2 shadow-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenDocumentAnalysis(doc);
                            }}
                          >
                            <Brain className="h-4 w-4" />
                            <span>View detailed analysis and ask questions about this lease document</span>
                          </button>
                        ) : (
                          <button 
                            className="w-full bg-gradient-to-r from-gray-600 to-gray-700 text-white py-2 px-4 rounded-md text-sm font-medium hover:from-gray-700 hover:to-gray-800 transition-all duration-200 flex items-center justify-center space-x-2 shadow-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenDocumentAnalysis(doc);
                            }}
                          >
                            <MessageCircle className="h-4 w-4" />
                            <span>Analyze document and ask questions</span>
                            <ArrowRight className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Document Analysis Modal */}
      {showDocumentQA && activeDocument && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden border border-white/20">
            <div className="p-6 border-b border-gray-200/50 bg-white/50 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">
                  {activeDocument.filename}
                </h2>
                <button
                  onClick={() => {
                    setShowDocumentQA(false);
                    setActiveDocument(null);
                    setDocumentSummary(null);
                    setCurrentView('upload');
                  }}
                  className="p-2 hover:bg-white/80 bg-white/50 rounded-full transition-all duration-200 backdrop-blur-sm border border-gray-200/50"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>
              
              {/* Navigation Tabs */}
              <div className="flex space-x-2">
                <button
                  onClick={() => setCurrentView('summary')}
                  className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                    currentView === 'summary'
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'bg-white/70 text-gray-600 hover:bg-white/90 backdrop-blur-sm border border-gray-200/50'
                  }`}
                  disabled={!documentSummary}
                >
                  <FileText className="h-4 w-4 mr-2 inline" />
                  Summary
                </button>
                <button
                  onClick={() => setCurrentView('qa')}
                  className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                    currentView === 'qa'
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'bg-white/70 text-gray-600 hover:bg-white/90 backdrop-blur-sm border border-gray-200/50'
                  }`}
                >
                  <MessageSquare className="h-4 w-4 mr-2 inline" />
                  Q&A
                </button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
              {/* Document Summary View */}
              {currentView === 'summary' && documentSummary && (
                <DocumentSummary 
                  summary={documentSummary}
                  onStartQA={() => setCurrentView('qa')}
                />
              )}
              
              {/* Q&A View */}
              {currentView === 'qa' && (
                <>
                  {(activeDocument.documentType === 'lease' || activeDocument.documentType === 'lease_agreement') ? (
                    <LeaseDocumentQA
                      extractedText={activeDocument.extractedText}
                      documentMetadata={extractLeaseMetadata(activeDocument.extractedText, activeDocument.filename)}
                    />
                  ) : (
                    <DocumentQA
                      documentText={activeDocument.extractedText}
                      documentMetadata={{
                        filename: activeDocument.filename,
                        documentType: activeDocument.documentType,
                        textLength: activeDocument.textLength,
                        property: activeDocument.property,
                        parties: activeDocument.parties,
                        premium: activeDocument.premium,
                        term: activeDocument.term
                      }}
                      onQuestionSubmit={(question) => {
                        console.log('🤔 Q&A Question asked:', question);
                      }}
                    />
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

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