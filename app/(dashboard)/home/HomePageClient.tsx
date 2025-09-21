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
import UpcomingEventsWidget from '@/components/UpcomingEventsWidget'


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
  address?: string
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
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [uploadStatus, setUploadStatus] = useState('')
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

  // Convert PropertyEvent to Event type for UpcomingEventsWidget
  const convertPropertyEventsToEvents = (propertyEvents: PropertyEvent[]) => {
    return propertyEvents.map((event, index) => ({
      id: `event-${index}-${Date.now()}`,
      subject: event.title,
      title: event.title,
      location: event.location || null,
      start_time: event.date,
      end_time: event.date, // Use same time for end if not available
      outlook_id: event.source === 'outlook' ? `outlook-${index}` : undefined,
      is_all_day: false,
      organiser_name: event.organiser_name || null,
      description: null,
      online_meeting: event.online_meeting || null,
      category: event.category,
      priority: 'normal',
      notes: undefined,
      user_id: undefined,
      created_at: undefined,
      updated_at: undefined,
      event_type: event.event_type || 'manual'
    }))
  }

  // Convert Building type for UpcomingEventsWidget
  const convertBuildings = (buildings: Building[]) => {
    return buildings.map(building => ({
      id: building.id.toString(),
      name: building.name,
      address: building.address || '' // Handle missing address property
    }))
  }

  // Set random welcome message on page load
  useEffect(() => {
    const loadWelcomeMessage = async () => {
      try {
        const message = await getRandomWelcomeMessage()
        setCurrentWelcomeMessage(message)
      } catch (error) {
        console.warn('Error loading welcome message, using sync fallback:', error)
        // Fallback to sync version if async fails
        const { getRandomWelcomeMessageSync } = await import('@/utils/messages')
        setCurrentWelcomeMessage(getRandomWelcomeMessageSync())
      }
    }
    loadWelcomeMessage()
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
        console.warn('⚠️ Error fetching buildings:', response.status, response.statusText)
        setBuildings([])
        return
      }

      const data = await response.json()
      console.log('🏢 Buildings data:', data)
      // API returns buildings wrapped in an object with buildings property
      setBuildings(data.buildings || [])
    } catch (error) {
      console.warn('⚠️ Error in fetchBuildings:', error)
      setBuildings([])
    }
  }

  const fetchEvents = async () => {
    try {
      console.log('🔄 Fetching events via API...')
      // Fetch from property_events, manual_events, and compliance events using API endpoints
      const responses = await Promise.all([
        fetch('/api/events/property').then(res => {
          console.log('📊 Property events response:', res.status, res.statusText)
          if (!res.ok) {
            console.warn('Property events API failed, using fallback')
            return { events: [] }
          }
          return res.json()
        }).catch(err => {
          console.warn('Property events API error, using fallback:', err)
          return { events: [] }
        }),
        fetch('/api/events/manual').then(res => {
          console.log('📊 Manual events response:', res.status, res.statusText)
          if (!res.ok) {
            console.warn('Manual events API failed, using fallback')
            return { events: [] }
          }
          return res.json()
        }).catch(err => {
          console.warn('Manual events API error, using fallback:', err)
          return { events: [] }
        }),
        fetch('/api/events/compliance').then(res => {
          console.log('📊 Compliance events response:', res.status, res.statusText)
          if (!res.ok) {
            console.warn('Compliance events API failed, using fallback')
            return { events: [] }
          }
          return res.json()
        }).catch(err => {
          console.warn('Compliance events API error, using fallback:', err)
          return { events: [] }
        })
      ])

      // Safe destructuring with fallback
      const [propertyEventsResponse, manualEventsResponse, complianceResponse] = responses || [{}, {}, {}]

      if (!propertyEventsResponse.success) {
        console.warn('⚠️ Property events API failed, using empty array:', propertyEventsResponse.error)
        // Continue with empty array instead of crashing
      }

      if (!manualEventsResponse.success) {
        console.warn('⚠️ Manual events API failed, using empty array:', manualEventsResponse.error)
        // Continue with empty array instead of crashing
      }

      if (!complianceResponse.success) {
        console.warn('⚠️ Compliance events API failed, using empty array:', complianceResponse.error)
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

      // Try to fetch email summary from API
      const response = await fetch('/api/ask-ai/email-summary')

      if (response.ok) {
        const result = await response.json()

        // Extract unread count from the analysis if available
        if (result.analysis && typeof result.analysis.unreadCount === 'number') {
          // Create mock email objects to represent the count
          const mockEmails = Array.from({ length: result.analysis.unreadCount }, (_, i) => ({
            id: `mock-${i}`,
            subject: `Email ${i + 1}`,
            is_read: false,
            received_at: new Date().toISOString()
          }))
          setRecentEmails(mockEmails)
        } else {
          // Fallback: try direct database query
          const { data, error } = await supabase
            .from('incoming_emails')
            .select('*')
            .eq('is_read', false)
            .order('received_at', { ascending: false })
            .limit(5)

          if (!error) {
            setRecentEmails(data || [])
          } else {
            console.log('Email summary not available, showing 0 unread emails')
            setRecentEmails([])
          }
        }
      } else {
        // Fallback to direct database query if API fails
        const { data, error } = await supabase
          .from('incoming_emails')
          .select('*')
          .eq('is_read', false)
          .order('received_at', { ascending: false })
          .limit(5)

        if (!error) {
          setRecentEmails(data || [])
        } else {
          console.log('Email data not available, showing 0 unread emails')
          setRecentEmails([])
        }
      }
    } catch (error) {
      console.error('Error in fetchEmails:', error)
      setRecentEmails([])
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

  // Auto-scroll removed - let users control their own scrolling within chat
  // useEffect(() => {
  //   if (showChat && messagesEndRef.current) {
  //     messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
  //   }
  // }, [messages, showChat])

  console.log('HomePage: Auto-scroll disabled for Ask BlocIQ responses')

  // Handle Ask BlocIQ submission
  const handleAskSubmit = async (prompt: string) => {
    try {
      console.log("🚀 NEW handleAskSubmit called with prompt:", prompt);

      // Center the chat window when it first opens
      if (!showChat) {
        const centerX = (window.innerWidth - chatSize.width) / 2
        const centerY = (window.innerHeight - chatSize.height) / 2
        setChatPosition({ x: centerX, y: centerY })
      }
      if (!prompt.trim()) {
        toast.error('Please enter a question.')
        return
      }

      setIsSubmitting(true)

      // Add user message to chat
      const userMessage = { sender: 'user' as const, text: prompt, timestamp: new Date() }
      setMessages(prev => [...prev, userMessage])

      const files = uploadedFiles || []; // safe fallback

      const payload = {
        prompt,
        contextType: "general",
        documentIds: files.length > 0 ? files.map((f: any) => f.id) : [], // safe for later use
      };

      console.log("🤖 Processing request with enhanced AI:", payload);

      const res = await fetch("/api/ask-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `HTTP error! status: ${res.status}`);
      }

      // Handle AI response
      let aiResponse = '';
      if (data.response) {
        aiResponse = data.response;
      } else if (data.answer) {
        aiResponse = data.answer;
      } else if (data.result) {
        aiResponse = data.result;
      } else {
        aiResponse = 'No response received';
      }

      // Add AI response to chat
      const aiMessage = { sender: 'ai' as const, text: aiResponse, timestamp: new Date() }
      setMessages(prev => [...prev, aiMessage])

      // Show chat interface
      setShowChat(true)

      // Clear input after submission
      setAskInput('')

      // TODO: Handle file uploads here when ready
      // When implementing uploads:
      // 1. Process files in uploadedFiles array
      // 2. Upload to OCR/processing endpoints
      // 3. Extract documentIds from upload responses
      // 4. Pass real documentIds to the payload above
      // For now, we send empty documentIds array which is safe

    } catch (err) {
      console.error("❌ Error submitting to AI:", err);
      toast.error('Failed to get response from BlocIQ')

      // Add error message to chat
      const errorMessage = {
        sender: 'ai' as const,
        text: `Sorry, I encountered an error: ${err instanceof Error ? err.message : 'Unknown error'}. Please try again.`,
        timestamp: new Date()
      }
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


  // Preload compliance summary on component mount
  useEffect(() => {
    const preloadComplianceSummary = async () => {
      try {
        console.log('🔄 Preloading compliance summary for homepage...');
        const response = await fetch('/api/ask-ai/compliance-upcoming');

        if (!response.ok) {
          console.warn('Compliance summary API failed:', response.status, response.statusText);
          return;
        }

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
        console.warn('⚠️ Error preloading compliance summary:', error);
      }
    };

    // Only preload if user is authenticated and no messages exist yet
    if (userData && messages.length === 0) {
      preloadComplianceSummary();
    }
  }, [userData, messages.length]);

  const fetchUserFirstName = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email) {
        // Use API endpoint instead of direct Supabase call
        const response = await fetch('/api/users')
        if (response.ok) {
          const data = await response.json()
          console.log('👤 Users API response:', data)

          // Try multiple paths to get the first name
          let firstName = null
          if (data.user?.profile?.first_name) {
            firstName = data.user.profile.first_name
          } else if (data.profile?.first_name) {
            firstName = data.profile.first_name
          } else if (data.first_name) {
            firstName = data.first_name
          }

          if (firstName) {
            console.log('✅ Found first name:', firstName)
            setUserFirstName(firstName)
          } else {
            console.log('⚠️ No first name found, using email fallback')
            // Fallback: use first part of email before @
            const emailPrefix = user.email.split('@')[0]
            setUserFirstName(emailPrefix)
          }
        } else {
          console.warn('Users API failed, using email fallback')
          // Fallback: use first part of email before @
          const emailPrefix = user.email.split('@')[0]
          setUserFirstName(emailPrefix)
        }
      }
    } catch (error) {
      console.warn('Error fetching user first name, using fallback:', error)
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
        </div>
      </section>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-12 space-y-8">

        {/* Daily Overview - 2x2 Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Properties */}
          <div className="bg-white rounded-2xl shadow-lg border-0 p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-600 mb-1">Total Properties</h3>
                <p className="text-2xl font-bold text-gray-900">{buildings.length}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Building className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

          {/* Upcoming Events */}
          <div className="bg-white rounded-2xl shadow-lg border-0 p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-600 mb-1">Upcoming Events</h3>
                <p className="text-2xl font-bold text-gray-900">{upcomingEvents.length}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <Calendar className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>

          {/* Unread Emails */}
          <div className="bg-white rounded-2xl shadow-lg border-0 p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-600 mb-1">Unread Emails</h3>
                <p className="text-2xl font-bold text-gray-900">{recentEmails.length}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <MessageCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>

          {/* Active Tasks */}
          <div className="bg-white rounded-2xl shadow-lg border-0 p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-600 mb-1">Active Tasks</h3>
                <p className="text-2xl font-bold text-gray-900">-</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                <Clock className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        {/* 🧠 Ask BlocIQ Widget - Full Width */}
        <div className="bg-white rounded-2xl shadow-lg border-0 overflow-hidden">
          <div className={`relative transition-all duration-500 ${showChat ? 'w-full' : 'w-full'}`}>
            {/* Header Section with Brand Gradient */}
            <div className="bg-gradient-to-r from-[#4f46e5] to-[#a855f7] p-8 relative overflow-hidden">
              {/* Decorative Background Elements */}
              <div className="absolute inset-0">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
              </div>

              {/* Header Content */}
              <div className="relative z-10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                      <Brain className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-white mb-1">Ask BlocIQ</h2>
                      <p className="text-white/90">Your AI property management assistant</p>
                    </div>
                  </div>
                  {showChat && (
                    <button
                      onClick={() => setShowChat(false)}
                      className="text-white/80 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/10"
                    >
                      <Minimize2 className="h-5 w-5" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Chat Interface or Input */}
            <div className="p-6">
              {!showChat ? (
                <div>
                  {/* Example Prompts */}
                  <div className="mb-6">
                    <h3 className="text-sm font-medium text-gray-700 mb-3">Try asking:</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {[
                        "What are my upcoming compliance deadlines?",
                        "Show me all properties with recent issues",
                        "What emails need my attention today?",
                        "Generate a summary of this week's events"
                      ].map((prompt, index) => (
                        <button
                          key={index}
                          onClick={() => handleExampleClick(prompt)}
                          className="text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-sm text-gray-700 hover:text-gray-900"
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Input Field */}
                  <div className="relative">
                    <input
                      ref={askInputRef}
                      type="text"
                      value={askInput}
                      onChange={(e) => setAskInput(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Ask BlocIQ anything about your properties, compliance, or tenants..."
                      className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled={isSubmitting}
                    />
                    <button
                      onClick={() => handleAskSubmit(askInput)}
                      disabled={isSubmitting || !askInput.trim()}
                      className="absolute inset-y-0 right-0 flex items-center pr-3"
                    >
                      {isSubmitting ? (
                        <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />
                      ) : (
                        <Send className="h-5 w-5 text-blue-500 hover:text-blue-600 transition-colors" />
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Chat Messages */}
                  <div className="h-96 overflow-y-auto space-y-4 pr-2">
                    {messages.map((message, index) => (
                      <div
                        key={index}
                        className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                            message.sender === 'user'
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-100 text-gray-900'
                          }`}
                        >
                          <p className="text-sm">{message.text}</p>
                          <p className="text-xs opacity-70 mt-1">
                            {message.timestamp.toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Input at bottom of chat */}
                  <div className="relative mt-4 pt-4 border-t">
                    <input
                      ref={askInputRef}
                      type="text"
                      value={askInput}
                      onChange={(e) => setAskInput(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Continue the conversation..."
                      className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled={isSubmitting}
                    />
                    <button
                      onClick={() => handleAskSubmit(askInput)}
                      disabled={isSubmitting || !askInput.trim()}
                      className="absolute inset-y-0 right-0 flex items-center pr-3"
                    >
                      {isSubmitting ? (
                        <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />
                      ) : (
                        <Send className="h-5 w-5 text-blue-500 hover:text-blue-600 transition-colors" />
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Property Events & Building To-Do - 2 Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Upcoming Events Widget */}
          <div className="h-full">
            <UpcomingEventsWidget 
              events={convertPropertyEventsToEvents(upcomingEvents)}
              buildings={convertBuildings(buildings)}
              loading={false}
            />
          </div>

          {/* Building To-Do Widget */}
          <div className="h-full">
            <BuildingTodoList maxItems={5} showBuildingName={true} className="h-full" />
          </div>
        </div>

        {/* Email Summary Card */}
        <EmailSummaryCard />

        {/* Calendar Sync Widget */}
        <CalendarSyncWidget />

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
            leaseholderName={communicationModalData.leaseholderName || undefined}
            unitNumber={communicationModalData.unitNumber || undefined}
          />
        )}

        {/* Document QA Modal */}
        {showDocumentQA && activeDocument && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-[#4f46e5] to-[#a855f7] p-6 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                      <FileText className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold">Document Analysis</h2>
                      <p className="text-white/90 text-sm">{activeDocument.filename}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* View Toggle */}
                    <div className="flex bg-white/20 rounded-lg p-1">
                      <button
                        onClick={() => setCurrentView('summary')}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                          currentView === 'summary'
                            ? 'bg-white text-[#4f46e5]'
                            : 'text-white/80 hover:text-white'
                        }`}
                      >
                        Summary
                      </button>
                      <button
                        onClick={() => setCurrentView('qa')}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                          currentView === 'qa'
                            ? 'bg-white text-[#4f46e5]'
                            : 'text-white/80 hover:text-white'
                        }`}
                      >
                        Q&A
                      </button>
                    </div>

                    <button
                      onClick={() => {
                        setShowDocumentQA(false)
                        setActiveDocument(null)
                        setDocumentSummary(null)
                      }}
                      className="text-white/80 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/10"
                    >
                      <XIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Modal Content */}
              <div className="p-6 max-h-[70vh] overflow-y-auto">
                {currentView === 'summary' && documentSummary ? (
                  <DocumentSummary summary={documentSummary} />
                ) : currentView === 'qa' && isLeaseDocument(activeDocument.extractedText) ? (
                  <LeaseDocumentQA
                    extractedText={activeDocument.extractedText}
                    filename={activeDocument.filename}
                    onAnalysisComplete={(analysis) => {
                      console.log('Lease analysis completed:', analysis)
                    }}
                  />
                ) : currentView === 'qa' ? (
                  <DocumentQA
                    extractedText={activeDocument.extractedText}
                    filename={activeDocument.filename}
                  />
                ) : (
                  <div className="text-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-[#4f46e5]" />
                    <p className="text-gray-600">Generating summary...</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
