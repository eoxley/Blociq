'use client'

// Home page client component - Major works dashboard removed for cleaner interface
import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Calendar, Plus, X, Building, Clock, AlertCircle, CheckCircle, Loader2, ExternalLink, RefreshCw, MessageCircle, Sparkles, Upload, FileText, Send, Bot, ArrowRight, HelpCircle, Brain, X as XIcon, ChevronDown, ChevronUp } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'



import BuildingTodoList from '@/components/BuildingTodoList'

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
  
  // Ask BlocIQ state
  const [askInput, setAskInput] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [messages, setMessages] = useState<Array<{sender: 'user' | 'ai', text: string, timestamp: Date}>>([])
  const [showChat, setShowChat] = useState(false)
  const askInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

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

  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Handle Ask BlocIQ submission
  const handleAskSubmit = async (prompt: string) => {
    console.log('🚀 NEW handleAskSubmit called with prompt:', prompt)
    
    if (!prompt.trim()) return
    
    setIsSubmitting(true)
    
    // Add user message to chat
    const userMessage = { sender: 'user' as const, text: prompt, timestamp: new Date() }
    setMessages(prev => [...prev, userMessage])
    
    try {
      console.log('🤖 Sending request to /api/ask-ai:', { prompt, contextType: 'general' })
      
      // Call the actual AI API
      const response = await fetch('/api/ask-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          prompt: prompt,
          contextType: 'general'
        }),
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
      
      // Show chat interface
      setShowChat(true)
      
      // Clear input after submission
      setAskInput('')
      toast.success('Response received!')
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
        {/* 🧠 Enhanced Circular Ask BlocIQ Widget */}
        <div className="flex justify-center">
          <div className={`relative transition-all duration-500 ${showChat ? 'w-[600px] h-[600px] md:w-[700px] md:h-[700px]' : 'w-[400px] h-[400px] md:w-[500px] md:h-[500px]'} rounded-full md:rounded-full rounded-3xl bg-gradient-to-br from-purple-600 via-[#4f46e5] to-indigo-500 shadow-2xl hover:shadow-3xl flex items-center justify-center p-12 group`}>
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
              
              {/* Enhanced Input Field with Clear Button - White Background */}
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
                    disabled={!askInput.trim() || isSubmitting}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2.5 bg-gradient-to-r from-[#4f46e5] to-[#a855f7] hover:brightness-110 text-white rounded-lg transition-all duration-200 hover:scale-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <ArrowRight className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Chat Toggle Button */}
              {messages.length > 0 && (
                <button
                  onClick={() => setShowChat(!showChat)}
                  className="flex items-center gap-2 mx-auto px-4 py-3 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl text-sm font-medium transition-all duration-200 border border-white/30 hover:border-white/50 shadow-lg hover:shadow-xl"
                >
                  {showChat ? (
                    <>
                      <ChevronUp className="h-4 w-4" />
                      Hide Chat
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4" />
                      View Chat ({messages.length} message{messages.length !== 1 ? 's' : ''})
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Chat Interface */}
            {showChat && messages.length > 0 && (
              <div className="absolute inset-0 bg-white/95 backdrop-blur-sm rounded-full flex flex-col">
                {/* Chat Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white/80 backdrop-blur-sm rounded-t-full">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-[#4f46e5] to-[#a855f7] rounded-full flex items-center justify-center">
                      <Brain className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">BlocIQ Assistant</h3>
                      <p className="text-sm text-gray-500">{messages.length} message{messages.length !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowChat(false)}
                    className="text-gray-500 hover:text-gray-700 transition-colors p-2 hover:bg-gray-100 rounded-lg"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                
                {/* Scrollable Messages Area */}
                <div 
                  ref={messagesEndRef}
                  className="flex-1 overflow-y-auto max-h-[60vh] px-4 pb-4 space-y-4"
                >
                  {messages.map((message, index) => (
                    <div key={index} className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] rounded-xl p-3 shadow-sm ${
                        message.sender === 'user' 
                          ? 'bg-gradient-to-r from-[#4f46e5] to-[#a855f7] text-white' 
                          : 'bg-white text-gray-900 border border-gray-200'
                      }`}>
                        {/* Message Content */}
                        <div className="text-sm whitespace-pre-line leading-relaxed mb-2">
                          {message.text}
                        </div>
                        
                        {/* Timestamp */}
                        <div className={`text-xs ${
                          message.sender === 'user' ? 'text-white/70' : 'text-gray-400'
                        }`}>
                          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {/* Loading indicator */}
                  {isSubmitting && (
                    <div className="flex justify-start">
                      <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm max-w-[80%]">
                        <div className="flex items-center gap-3">
                          <div className="w-5 h-5 bg-gradient-to-r from-[#4f46e5] to-[#a855f7] rounded-full flex items-center justify-center">
                            <Brain className="h-3 w-3 text-white" />
                          </div>
                          <div className="flex items-center gap-2 text-gray-600">
                            <Loader2 className="animate-spin h-4 w-4" />
                            <span className="text-sm font-medium">Thinking...</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Sticky Input Bar */}
                <div className="sticky bottom-0 bg-white p-4 shadow-inner border-t border-gray-200">
                  <div className="flex items-center gap-3">
                    <input
                      ref={askInputRef}
                      type="text"
                      value={askInput}
                      onChange={(e) => setAskInput(e.target.value)}
                      placeholder="Ask me anything..."
                      className="flex-1 w-full rounded-full border px-4 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#4f46e5] focus:border-[#4f46e5] transition-all duration-200 text-sm"
                      onKeyPress={handleKeyPress}
                    />
                    
                    {/* Clear Button */}
                    {askInput && (
                      <button 
                        onClick={() => setAskInput('')}
                        className="p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-800 rounded-full transition-all duration-200 hover:scale-110 active:scale-95"
                      >
                        <XIcon className="h-4 w-4" />
                      </button>
                    )}
                    
                    {/* Submit Button */}
                    <button 
                      onClick={() => handleAskSubmit(askInput)}
                      disabled={!askInput.trim() || isSubmitting}
                      className="p-2.5 bg-gradient-to-r from-[#4f46e5] to-[#a855f7] hover:brightness-110 text-white rounded-full transition-all duration-200 hover:scale-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                    >
                      {isSubmitting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ArrowRight className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  
                  {/* Quick Actions */}
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                      <span>AI Assistant Active</span>
                    </div>
                    <button
                      onClick={() => setMessages([])}
                      className="text-xs text-gray-500 hover:text-gray-700 transition-colors px-3 py-1 hover:bg-gray-100 rounded-lg"
                    >
                      Clear Chat
                    </button>
                  </div>
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
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[600px]">
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
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">Upcoming Events</h3>
                      <span className="text-sm text-gray-500">{upcomingEvents.length} event{upcomingEvents.length !== 1 ? 's' : ''}</span>
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
                            <div key={index} className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200 hover:shadow-md transition-all duration-200">
                              <div className="flex items-start justify-between">
                                <div className="flex items-start gap-3 flex-1">
                                  <div className="w-10 h-10 bg-gradient-to-r from-[#4f46e5] to-[#a855f7] rounded-lg flex items-center justify-center text-white flex-shrink-0">
                                    <Calendar className="h-5 w-5" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-2">
                                      <h4 className="font-semibold text-gray-900 truncate">{event.title}</h4>
                                      {(isToday || isTomorrow) && (
                                        <span className={`px-2 py-1 rounded-full text-xs flex-shrink-0 ${
                                          isToday 
                                            ? 'bg-red-100 text-red-700' 
                                            : 'bg-yellow-100 text-yellow-700'
                                        }`}>
                                          {isToday ? 'Today' : 'Tomorrow'}
                                        </span>
                                      )}
                                    </div>
                                    <div className="space-y-1 text-sm text-gray-600">
                                      <div className="flex items-center gap-1">
                                        <span>🕒</span>
                                        <span>{date} at {time}</span>
                                      </div>
                                      {event.category && (
                                        <div className="flex items-center gap-1">
                                          <span>📋</span>
                                          <span>{event.category}</span>
                                        </div>
                                      )}
                                      <div className="flex items-center gap-1">
                                        <span>📍</span>
                                        <span>{event.building || 'General'}</span>
                                      </div>
                                      {event.location && (
                                        <div className="flex items-center gap-1">
                                          <span>🏢</span>
                                          <span>{event.location}</span>
                                        </div>
                                      )}
                                      {event.organiser_name && (
                                        <div className="flex items-center gap-1">
                                          <span>👤</span>
                                          <span>{event.organiser_name}</span>
                                        </div>
                                      )}
                                      {event.online_meeting && (
                                        <div className="flex items-center gap-1 text-blue-600">
                                          <span>🎥</span>
                                          <span>Online meeting available</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                                  {event.category && (
                                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                      {event.category}
                                    </span>
                                  )}
                                  {event.source === 'outlook' && (
                                    <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full">
                                      Outlook
                                    </span>
                                  )}
                                </div>
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

            {/* Building To-Do Widget */}
            <div className="h-full">
              <BuildingTodoList maxItems={5} showBuildingName={true} className="h-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 