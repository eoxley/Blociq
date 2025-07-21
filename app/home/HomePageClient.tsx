'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { MessageCircle, Calendar, ExternalLink, Send, Loader2, Plus, Mail, FileText, Pin, RefreshCw, Paperclip, Home, X, Building, Brain, Clock, AlertCircle, CheckCircle } from 'lucide-react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import DailySummary from '@/components/DailySummary'
import BreadcrumbNavigation from '@/components/BreadcrumbNavigation'
import { BlocIQButton } from '@/components/ui/blociq-button'
import { BlocIQCard, BlocIQCardContent, BlocIQCardHeader } from '@/components/ui/blociq-card'
import { BlocIQBadge } from '@/components/ui/blociq-badge'
import BlocIQLogo from '@/components/BlocIQLogo'
import { toast } from 'sonner'

type PropertyEvent = {
  building: string
  date: string
  title: string
  category: string
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

type ChatMessage = {
  id: string
  content: string
  isUser: boolean
  timestamp: Date
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
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [attachments, setAttachments] = useState<File[]>([])
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      content: "Hello! I'm your BlocIQ assistant. I can help you with property management questions, compliance guidance, and more. What would you like to know?",
      isUser: false,
      timestamp: new Date()
    }
  ])
  const [error, setError] = useState<string | null>(null)
  const [isAddingEvent, setIsAddingEvent] = useState(false)
  const [context, setContext] = useState<any>(null)
  const [recentEmails, setRecentEmails] = useState<Email[]>([])
  const [loadingEmails, setLoadingEmails] = useState(true)
  const [syncingEmails, setSyncingEmails] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClientComponentClient()

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
    "Yes, you still remember the gate code from six buildings ago. 🧠",
    "You've explained 'communal areas' three times this week. That's law now.",
    "Someone's going to mention 'right to manage' today — take a breath.",
    "Your service charge breakdowns are more accurate than the Met Office.",
    "If someone says 'I pay your salary' — congrats, you're in mid-season form.",

    // 🤓 "Did You Know?" Facts
    "Did you know? The world's tallest residential building is over 1,500 feet high.",
    "Did you know? UK property law dates back over 800 years — and still confuses everyone.",
    "Did you know? Pigeons can identify themselves in mirrors. Some residents can't.",
    "Did you know? London has over 70 fire stations — and you've probably emailed half of them.",
    "Did you know? The first lease ever recorded in England was in 1066. Still no communal cleaning.",
    "Did you know? The average person spends 87% of their time indoors — that includes your inbox.",
    "Did you know? Ancient Romans had property managers. They were called *curatores domus*.",
    "Did you know? More than 20% of UK homes are flats — and every single one comes with questions.",

    // 🧠 Bonus inspiration
    "Order, calm, and coffee. You're 2 out of 3 already.",
    "Excellence is quiet. So is successful block management.",
    "You don't need to chase perfection — just service charge reconciliation.",
    "Trust the process. And the fire alarm service provider (mostly).",
    "One task at a time. One leaseholder at a time. BlocIQ's got your back."
  ]

  // Get random welcome message once on component mount
  const [currentWelcomeMessage] = useState(() => {
    const randomIndex = Math.floor(Math.random() * welcomeMessages.length)
    return welcomeMessages[randomIndex]
  })

  // Real upcoming events from database
  const [upcomingEvents, setUpcomingEvents] = useState<PropertyEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [buildings, setBuildings] = useState<Building[]>([]);

  // Fetch buildings for event form
  useEffect(() => {
    const fetchBuildings = async () => {
      try {
        const { data: buildingsData, error } = await supabase
          .from('buildings')
          .select('id, name')
          .order('name');

        if (error) {
          console.error('Error fetching buildings:', error);
        } else {
          setBuildings(buildingsData || []);
        }
      } catch (error) {
        console.error('Error fetching buildings:', error);
      }
    };

    fetchBuildings();
  }, [supabase]);

  // Fetch real property events from database
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const { data: events, error } = await supabase
          .from('property_events')
          .select('*')
          .gte('start_time', new Date().toISOString())
          .order('start_time', { ascending: true })
          .limit(10);

        if (error) {
          console.error('Error fetching events:', error);
          setUpcomingEvents([]);
        } else {
          // Transform database events to match PropertyEvent type
          const transformedEvents: PropertyEvent[] = (events || []).map(event => ({
            building: event.building_id ? `Building ${event.building_id}` : 'General',
            date: event.start_time,
            title: event.title,
            category: event.category || event.event_type || '📅 Event'
          }));
          setUpcomingEvents(transformedEvents);
        }
      } catch (error) {
        console.error('Error fetching events:', error);
        setUpcomingEvents([]);
      } finally {
        setLoadingEvents(false);
      }
    };

    fetchEvents();
  }, [supabase]);

  // Fetch recent emails
  useEffect(() => {
    const fetchEmails = async () => {
      try {
        const { data: emails, error } = await supabase
          .from('incoming_emails')
          .select('*')
          .eq('is_deleted', false)
          .order('received_at', { ascending: false })
          .limit(5);

        if (error) {
          console.error('Error fetching emails:', error);
          setRecentEmails([]);
        } else {
          const transformedEmails: Email[] = (emails || []).map(email => ({
            id: email.id,
            subject: email.subject,
            from_email: email.from_email,
            body_preview: email.body_preview,
            received_at: email.received_at,
            handled: email.is_handled,
            unread: !email.is_read,
            flag_status: email.flag_status || 'none',
            categories: email.categories || []
          }));
          setRecentEmails(transformedEmails);
        }
      } catch (error) {
        console.error('Error fetching emails:', error);
        setRecentEmails([]);
      } finally {
        setLoadingEmails(false);
      }
    };

    fetchEmails();
  }, [supabase]);

  // Sync emails function
  const syncEmails = async () => {
    setSyncingEmails(true)
    try {
      const response = await fetch('/api/sync-emails', {
        method: 'POST',
      })

      if (response.ok) {
        toast.success('Emails synced successfully!')
        // Refresh emails list
        const { data: emails, error } = await supabase
          .from('incoming_emails')
          .select('*')
          .eq('is_deleted', false)
          .order('received_at', { ascending: false })
          .limit(5);

        if (!error && emails) {
          const transformedEmails: Email[] = emails.map(email => ({
            id: email.id,
            subject: email.subject,
            from_email: email.from_email,
            body_preview: email.body_preview,
            received_at: email.received_at,
            handled: email.is_handled,
            unread: !email.is_read,
            flag_status: email.flag_status || 'none',
            categories: email.categories || []
          }));
          setRecentEmails(transformedEmails);
        }
      } else {
        toast.error('Failed to sync emails')
      }
    } catch (error) {
      console.error('Error syncing emails:', error)
      toast.error('Failed to sync emails')
    } finally {
      setSyncingEmails(false)
    }
  }

  const handleFileAttachment = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    if (files.length > 0) {
      setAttachments(prev => [...prev, ...files])
    }
  }

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim() && attachments.length === 0) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: inputValue + (attachments.length > 0 ? `\n\n📎 Attachments: ${attachments.map(f => f.name).join(', ')}` : ''),
      isUser: true,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setAttachments([])
    setIsLoading(true)
    setError(null)

    try {
      console.log("🧠 HomePageClient: Starting AI request");
      console.log("📝 Input value:", inputValue);
      console.log("📎 Attachments:", attachments.length);

      const formData = new FormData()
      formData.append('message', inputValue)
      
      // Add attachments to form data
      attachments.forEach((file, index) => {
        formData.append(`attachment_${index}`, file)
      })

      console.log("📤 Sending request to /api/ask-assistant");
      console.log("📦 Request body:", formData);

      const res = await fetch('/api/ask-assistant', {
        method: 'POST',
        body: formData,
      })

      console.log("📥 Response status:", res.status);
      console.log("📥 Response headers:", Object.fromEntries(res.headers.entries()));

      if (!res.ok) {
        console.error("❌ Response not ok:", res.status, res.statusText);
        throw new Error('Failed to get AI answer')
      }

      const data = await res.json()
      console.log("📦 Response data:", data);

      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: data.answer || data.content || 'No answer received',
        isUser: false,
        timestamp: new Date()
      }

      console.log("✅ AI message created:", aiMessage.content.substring(0, 100) + "...");
      setMessages(prev => [...prev, aiMessage])
    } catch (err) {
      console.error('❌ Error in handleSubmit:', err);
      setError(err instanceof Error ? err.message : 'An error occurred')
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: 'Sorry, I encountered an error. Please try again.',
        isUser: false,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
      console.log("🏁 AI request completed");
    }
  }

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsAddingEvent(true)
    
    try {
      const formData = new FormData(e.target as HTMLFormElement)
      const eventData = {
        title: formData.get('title') as string,
        date: formData.get('date') as string,
        building: formData.get('building') as string,
        description: formData.get('description') as string,
      }

      console.log('Adding event:', eventData)

      const response = await fetch('/api/create-event', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventData),
      })

      const result = await response.json()

      if (response.ok && result.success) {
        toast.success('Event created successfully!')
        // Reset form
        ;(e.target as HTMLFormElement).reset()
        // Refresh events list
        const { data: events, error } = await supabase
          .from('property_events')
          .select('*')
          .gte('start_time', new Date().toISOString())
          .order('start_time', { ascending: true })
          .limit(10);

        if (!error && events) {
          const transformedEvents: PropertyEvent[] = events.map(event => ({
            building: event.building_id ? `Building ${event.building_id}` : 'General',
            date: event.start_time,
            title: event.title,
            category: event.category || event.event_type || '📅 Event'
          }));
          setUpcomingEvents(transformedEvents);
        }
      } else {
        toast.error(result.error || 'Failed to create event')
      }
    } catch (error) {
      console.error('Error creating event:', error)
      toast.error('Failed to create event')
    } finally {
      setIsAddingEvent(false)
    }
  }

  const formatEventDate = (dateString: string) => {
    const date = new Date(dateString)
    return {
      date: date.toLocaleDateString('en-GB', { 
        weekday: 'short', 
        day: 'numeric', 
        month: 'short' 
      }),
      time: date.toLocaleTimeString('en-GB', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    }
  }

  const formatMessageTime = (timestamp: Date) => {
    return timestamp.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  return (
    <div className="space-y-8">
      {/* Enhanced Header with BlocIQ Gradient Background */}
      <div className="bg-gradient-to-r from-[#008C8F] to-[#7645ED] rounded-2xl p-8 text-white shadow-xl">
        <div className="flex items-center justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                <BlocIQLogo className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Welcome back, {userData.name}!</h1>
                <p className="text-white/90 text-lg">{currentWelcomeMessage}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <BlocIQButton 
              onClick={syncEmails}
              disabled={syncingEmails}
              variant="outline"
              size="sm"
              className="bg-white/20 hover:bg-white/30 text-white border-white/30 backdrop-blur-sm"
            >
              {syncingEmails ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              {syncingEmails ? 'Syncing...' : 'Sync Emails'}
            </BlocIQButton>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* BlocIQ Chat Assistant Section */}
        <BlocIQCard variant="elevated" className="flex flex-col h-[600px]">
          <BlocIQCardHeader className="bg-gradient-to-r from-[#008C8F] to-[#007BDB] text-white rounded-t-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                <Brain className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-white">BlocIQ Assistant</h2>
                <p className="text-white/80 text-sm">Your AI property management companion</p>
              </div>
            </div>
          </BlocIQCardHeader>
          
          <BlocIQCardContent className="flex-1 flex flex-col p-6">
            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
              {messages.map((message) => (
                <div key={message.id} className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-xl px-4 py-3 ${
                    message.isUser 
                      ? 'bg-gradient-to-r from-[#008C8F] to-[#007BDB] text-white shadow-lg' 
                      : 'bg-[#FAFAFA] text-[#333333] border border-[#E2E8F0]'
                  }`}>
                    <div className="text-sm whitespace-pre-line">{message.content}</div>
                    <div className={`text-xs mt-1 ${
                      message.isUser ? 'text-white/70' : 'text-[#64748B]'
                    }`}>
                      {formatMessageTime(message.timestamp)}
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Loading indicator */}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-[#FAFAFA] border border-[#E2E8F0] rounded-xl px-4 py-3">
                    <div className="flex items-center gap-2 text-[#64748B]">
                      <Loader2 className="animate-spin h-4 w-4" />
                      <span className="text-sm">Thinking...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Action buttons for last AI message */}
            {messages.length > 1 && !messages[messages.length - 1].isUser && !isLoading && (
              <div className="flex gap-2 mb-4">
                <BlocIQButton variant="outline" size="sm" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  📧 Turn into email
                </BlocIQButton>
                <BlocIQButton variant="outline" size="sm" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  📝 Save as advice note
                </BlocIQButton>
                <BlocIQButton variant="outline" size="sm" className="flex items-center gap-2">
                  <Pin className="h-4 w-4" />
                  📌 Attach to building diary
                </BlocIQButton>
              </div>
            )}

            {/* Input form */}
            <div className="space-y-3 bg-[#FAFAFA] p-4 rounded-xl border border-[#E2E8F0]">
              {/* Attachments Display */}
              {attachments.length > 0 && (
                <div className="p-2 bg-white rounded-xl border border-[#E2E8F0]">
                  <div className="text-xs text-[#64748B] mb-2">📎 Attachments:</div>
                  <div className="space-y-1">
                    {attachments.map((file, index) => (
                      <div key={index} className="flex items-center justify-between text-xs bg-[#F3F4F6] p-2 rounded border">
                        <span className="truncate flex-1">{file.name}</span>
                        <button
                          type="button"
                          onClick={() => removeAttachment(index)}
                          className="text-[#EF4444] hover:text-red-700 ml-2"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="flex gap-3">
                <BlocIQButton
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                  size="sm"
                  className="px-4 py-3"
                  disabled={isLoading}
                >
                  <Paperclip className="h-5 w-5" />
                </BlocIQButton>
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Ask about your buildings, compliance, or recent emails…"
                  className="flex-1 px-4 py-3 border border-[#E2E8F0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#008C8F] focus:border-transparent bg-white text-[#333333]"
                  disabled={isLoading}
                />
                <BlocIQButton 
                  type="submit"
                  disabled={isLoading || (!inputValue.trim() && attachments.length === 0)}
                  size="sm"
                  className="px-6 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handleSubmit}
                >
                  <Send className="h-5 w-5" />
                  Send
                </BlocIQButton>
              </div>
              
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileAttachment}
                className="hidden"
                accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif"
              />
            </div>
          </BlocIQCardContent>
        </BlocIQCard>

        {/* Upcoming Events Section */}
        <BlocIQCard variant="elevated">
          <BlocIQCardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-[#008C8F] to-[#7645ED] rounded-xl flex items-center justify-center">
                <Calendar className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-[#333333]">Property Events</h2>
                <p className="text-sm text-[#64748B]">Manage your property events</p>
              </div>
            </div>
          </BlocIQCardHeader>
          
          <BlocIQCardContent>
            <div className="space-y-4">
              {/* Manual Event Input Form */}
              <div className="bg-gradient-to-r from-[#F0FDFA] to-emerald-50 rounded-xl p-4 border border-[#2BBEB4]/20">
                <h3 className="font-semibold text-[#0F5D5D] mb-3">Add New Event</h3>
                <form onSubmit={handleAddEvent} className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-[#333333] mb-1">Event Title</label>
                      <input
                        type="text"
                        name="title"
                        required
                        className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#008C8F] focus:border-transparent"
                        placeholder="Enter event title"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#333333] mb-1">Date & Time</label>
                      <input
                        type="datetime-local"
                        name="date"
                        required
                        className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#008C8F] focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#333333] mb-1">Building (Optional)</label>
                    <select
                      name="building"
                      className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#008C8F] focus:border-transparent"
                    >
                      <option value="">Select a building</option>
                      {/* Assuming 'buildings' is defined elsewhere or passed as a prop */}
                      {/* For now, a placeholder or a dummy list */}
                      {buildings.map(building => (
                        <option key={building.id} value={building.name}>{building.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#333333] mb-1">Description (Optional)</label>
                    <textarea
                      name="description"
                      rows={3}
                      className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#008C8F] focus:border-transparent"
                      placeholder="Enter event description"
                    />
                  </div>
                  <div className="flex justify-end">
                    <BlocIQButton
                      type="submit"
                      disabled={isAddingEvent}
                      size="sm"
                      className="bg-gradient-to-r from-[#008C8F] to-[#2BBEB4] hover:from-[#007B8A] hover:to-[#2BBEB4] text-white"
                    >
                      {isAddingEvent ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Adding...
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-2" />
                          Add Event
                        </>
                      )}
                    </BlocIQButton>
                  </div>
                </form>
              </div>

              {/* Events List */}
              {loadingEvents ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#008C8F] mx-auto mb-2"></div>
                  <p className="text-[#64748B] text-sm">Loading events...</p>
                </div>
              ) : upcomingEvents.length > 0 ? (
                <div className="space-y-3">
                  {upcomingEvents.map((event, index) => {
                    const { date, time } = formatEventDate(event.date)
                    const eventDate = new Date(event.date)
                    const isToday = eventDate.toDateString() === new Date().toDateString()
                    const isTomorrow = eventDate.toDateString() === new Date(Date.now() + 24 * 60 * 60 * 1000).toDateString()
                    
                    return (
                      <div key={`property-${index}`} className="bg-gradient-to-r from-[#F0FDFA] to-emerald-50 rounded-xl p-4 hover:shadow-lg text-sm border-l-4 border-[#2BBEB4] transition-all duration-200">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="font-bold text-[#333333]">
                                {event.title}
                              </div>
                              {(isToday || isTomorrow) && (
                                <BlocIQBadge variant={isToday ? "destructive" : "warning"} size="sm">
                                  {isToday ? 'Today' : 'Tomorrow'}
                                </BlocIQBadge>
                              )}
                            </div>
                            {event.category && (
                              <div className="text-[#64748B] mb-1">
                                📋 {event.category}
                              </div>
                            )}
                            <div className="text-[#64748B] mb-1">
                              📍 {event.building}
                            </div>
                            <div className="text-[#64748B]">
                              🕒 {date} at {time}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-[#64748B] mx-auto mb-3" />
                  <p className="text-[#64748B] text-sm">No events yet</p>
                  <p className="text-[#64748B] text-xs mt-1">Add your first property event above</p>
                </div>
              )}
            </div>
          </BlocIQCardContent>
        </BlocIQCard>
      </div>

      {/* Daily Summary Section */}
      <DailySummary />
    </div>
  )
} 