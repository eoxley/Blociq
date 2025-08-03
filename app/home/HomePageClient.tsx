'use client'

// Home page client component - Major works dashboard removed for cleaner interface
import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { Calendar, Plus, X, Building, Clock, AlertCircle, CheckCircle, Loader2, ExternalLink, RefreshCw, MessageCircle, Sparkles, Upload, FileText, Send, Bot, Search } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import DailySummary from '@/components/DailySummary'
import AskBlocIQHomepage from '@/components/AskBlocIQHomepage'
import DailyOverview from '@/components/DailyOverview'
import SmartSearch from '@/components/SmartSearch'

import BreadcrumbNavigation from '@/components/BreadcrumbNavigation'
import { BlocIQButton } from '@/components/ui/blociq-button'
import { BlocIQCard, BlocIQCardContent, BlocIQCardHeader } from '@/components/ui/blociq-card'
import { BlocIQBadge } from '@/components/ui/blociq-badge'
import BlocIQLogo from '@/components/BlocIQLogo'
import { toast } from 'sonner'
import { checkOutlookConnection, fetchOutlookEvents, getOutlookAuthUrl } from '@/lib/outlookUtils'
import { getTimeBasedGreeting } from '@/utils/greeting'

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
  const [isAddingEvent, setIsAddingEvent] = useState(false)
  const [showAddEventForm, setShowAddEventForm] = useState(false)
  const [recentEmails, setRecentEmails] = useState<Email[]>([])
  const [loadingEmails, setLoadingEmails] = useState(true)

  // Dynamic welcome messages - rotating pool of positive, motivational, humorous, and informative messages
  const welcomeMessages = [
    // 🔁 Motivational Messages
    "You've already survived worse than a passive-aggressive leaseholder. Keep going.",
    "Coffee in one hand, compliance in the other — classic BlocIQ move.",
    "You're the reason building meetings *almost* run on time.",
    "You've dodged Section 20 bullets all week — gold star ⭐",
    "Risk assessed. Stress suppressed.",
    "Your building doesn't need a hero. It has you.",
    "You know the alarm panel code. You *are* the alarm panel code.",
    "Property managers don't crack under pressure. They schedule it.",
    "There's calm in your chaos. BlocIQ just makes it prettier.",
    "That building doesn't run on vibes — it runs on your last 14 emails.",

    // 😅 Humorous Management Quotes
    "Today's forecast: 80% chance of leaseholder emails before lunch.",
    "Another invoice, another mystery charge to decode. You've trained for this.",
    "Your building's compliance status: 'It's complicated' (but you're handling it).",
    "You've mastered the art of explaining why the lift is 'temporarily' out of service.",
    "Your superpower: Making Section 20 notices sound exciting.",
    "You're the person who knows every resident's preferred complaint format.",
    "Your building runs on coffee, compliance, and your last nerve.",
    "You've learned to smile while reading passive-aggressive emails.",
    "Your building's maintenance schedule: 'When it breaks' (but you're on it).",
    "You're the reason the building hasn't descended into chaos (yet).",

    // 💪 Encouraging Messages
    "You're not just managing properties — you're managing communities.",
    "Every email you answer is one less crisis tomorrow.",
    "Your attention to detail keeps residents safe and compliant.",
    "You're the bridge between residents and regulations.",
    "Your work makes buildings better places to live.",
    "You're the unsung hero of property management.",
    "Your patience with leaseholders is legendary.",
    "You turn building problems into solutions daily.",
    "Your compliance knowledge is your superpower.",
    "You're making property management look easy (it's not)."
  ]

  const [currentWelcomeMessage, setCurrentWelcomeMessage] = useState('')
  const [upcomingEvents, setUpcomingEvents] = useState<PropertyEvent[]>([])
  const [buildings, setBuildings] = useState<Building[]>([])
  const [outlookConnected, setOutlookConnected] = useState(false)
  const [syncingOutlook, setSyncingOutlook] = useState(false)
  const [newEvent, setNewEvent] = useState({
    title: '',
    date: '',
    category: 'General'
  })

  // Rotate welcome messages
  useEffect(() => {
    const interval = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * welcomeMessages.length)
      setCurrentWelcomeMessage(welcomeMessages[randomIndex])
    }, 10000) // Change every 10 seconds

    // Set initial message
    setCurrentWelcomeMessage(welcomeMessages[0])

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    fetchBuildings()
    fetchEvents()
    checkOutlook()
    fetchEmails()
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
      const { data, error } = await supabase
        .from('property_events')
        .select('*')
        .gte('date', new Date().toISOString().split('T')[0])
        .order('date', { ascending: true })
        .limit(5)

      if (error) {
        console.error('Error fetching events:', error)
        return
      }

      const transformedEvents: PropertyEvent[] = (data || []).map(event => ({
        building: event.building_name || 'General',
        date: event.date,
        title: event.title,
        category: event.category || 'General',
        source: 'property',
        event_type: 'manual',
        location: event.location,
        organiser_name: event.organiser_name
      }))

      setUpcomingEvents(transformedEvents)
    } catch (error) {
      console.error('Error in fetchEvents:', error)
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
      const transformedOutlookEvents: PropertyEvent[] = events.map((event: any) => ({
        building: 'Outlook Calendar',
        date: event.start_time,
        title: event.title || event.subject || 'Untitled Event',
        category: event.categories?.join(', ') || '📅 Outlook Event',
        source: 'outlook',
        event_type: 'outlook',
        location: event.location,
        organiser_name: event.organiser_name,
        online_meeting: event.online_meeting
      }))

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

      toast.success('Outlook calendar synced successfully!')
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

      const { error } = await supabase
        .from('property_events')
        .insert({
          title,
          date,
          category: 'General',
          building_name: 'General'
        })

      if (error) {
        console.error('Error adding event:', error)
        toast.error('Failed to add event')
        return
      }

      toast.success('Event added successfully!')
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
    const date = new Date(dateString)
    const now = new Date()
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const isToday = date.toDateString() === now.toDateString()
    const isTomorrow = date.toDateString() === tomorrow.toDateString()

    if (isToday) return 'Today'
    if (isTomorrow) return 'Tomorrow'
    return date.toLocaleDateString('en-GB', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Enhanced Hero Banner - BlocIQ Landing Page Style */}
      <section className="relative overflow-hidden bg-gradient-to-r from-[#4f46e5] to-[#a855f7] py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center">
            <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-2xl">
              <BlocIQLogo className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
              {getTimeBasedGreeting(userData.name)}
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
        {/* Daily Overview Section */}
        <DailyOverview />

        {/* Search and AI Assistant Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Smart Search */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg border-0 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-r from-[#008C8F] to-[#7645ED] rounded-xl flex items-center justify-center text-white">
                  <Search className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Quick Search</h2>
                  <p className="text-sm text-gray-600">Find buildings, leaseholders, or units</p>
                </div>
              </div>
              <SmartSearch />
            </div>
          </div>

          {/* Property Events Widget */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-lg border-0 overflow-hidden">
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
              
              <div className="p-6">
                {/* Add Event Button */}
                {!showAddEventForm && (
                  <div className="text-center">
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
                          <label className="block text-sm font-medium text-gray-700 mb-1">Date & Time</label>
                          <input
                            type="datetime-local"
                            name="date"
                            required
                            min={new Date().toISOString().slice(0, 16)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4f46e5] focus:border-transparent"
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="submit"
                          disabled={isAddingEvent}
                          className="bg-gradient-to-r from-[#4f46e5] to-[#a855f7] hover:brightness-110 text-white px-4 py-2 rounded-lg font-medium shadow-lg transition-all duration-200 disabled:opacity-50"
                        >
                          {isAddingEvent ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <Plus className="h-4 w-4 mr-2" />
                          )}
                          Add Event
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowAddEventForm(false)}
                          className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Events List */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">Upcoming Events</h3>
                    <button
                      onClick={() => setShowAddEventForm(!showAddEventForm)}
                      className="bg-gradient-to-r from-[#4f46e5] to-[#a855f7] hover:brightness-110 text-white px-3 py-2 rounded-lg text-sm font-medium shadow-lg transition-all duration-200"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Event
                    </button>
                  </div>

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
                        const time = eventDate.toLocaleTimeString('en-GB', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })

                        return (
                          <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gradient-to-r from-[#4f46e5] to-[#a855f7] rounded-lg flex items-center justify-center text-white">
                                <Calendar className="h-5 w-5" />
                              </div>
                              <div>
                                <h4 className="font-semibold text-gray-900">{event.title}</h4>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm text-gray-600">
                                    {date} at {time}
                                  </span>
                                  {(isToday || isTomorrow) && (
                                    <span className={`px-2 py-1 rounded-full text-xs ${
                                      isToday 
                                        ? 'bg-red-100 text-red-700' 
                                        : 'bg-yellow-100 text-yellow-700'
                                    }`}>
                                      {isToday ? 'Today' : 'Tomorrow'}
                                    </span>
                                  )}
                                </div>
                                {event.category && (
                                  <div className="text-gray-600 mb-1">
                                    📋 {event.category}
                                  </div>
                                )}
                                <div className="text-gray-600 mb-1">
                                  📍 {event.building || 'General'}
                                </div>
                                {event.location && (
                                  <div className="text-gray-600 mb-1">
                                    🏢 {event.location}
                                  </div>
                                )}
                                {event.organiser_name && (
                                  <div className="text-gray-600 mb-1">
                                    👤 {event.organiser_name}
                                  </div>
                                )}
                                {event.online_meeting && (
                                  <div className="text-blue-600 mb-1">
                                    🎥 Online meeting available
                                  </div>
                                )}
                                <div className="text-gray-600">
                                  🕒 {date} at {time}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                {event.category}
                              </span>
                              {event.source === 'outlook' && (
                                <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full">
                                  Outlook
                                </span>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-gradient-to-r from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Calendar className="h-8 w-8 text-gray-400" />
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
          </div>
        </div>

        {/* AI Assistant Section */}
        <div className="bg-white rounded-2xl shadow-lg border-0 overflow-hidden">
          <div className="bg-gradient-to-r from-[#4f46e5] to-[#a855f7] p-6 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                  <Bot className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Ask BlocIQ</h2>
                  <p className="text-sm text-white/80">AI-powered assistant</p>
                </div>
              </div>
              <div className="flex items-center gap-1 text-xs bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full">
                <Sparkles className="h-3 w-3" />
                <span>AI Assistant</span>
              </div>
            </div>
          </div>
          
          <div className="p-6">
            <AskBlocIQHomepage />
          </div>
        </div>

        {/* Daily Summary Section */}
        <DailySummary />
      </div>
    </div>
  )
} 