'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { MessageCircle, Calendar, ExternalLink, Send, Loader2, Plus, Mail, FileText, Pin, RefreshCw, Paperclip, Home, X } from 'lucide-react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import DailySummary from '@/components/DailySummary'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import BlocIQLogo from '@/components/BlocIQLogo'

type PropertyEvent = {
  building: string
  date: string
  title: string
  category: string
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

  // Dynamic welcome messages
  const welcomeMessages = [
    'Let\'s chase some contractors and close some budgets 💼',
    'The lifts are stuck again — but not your motivation 🚀',
    'Time to inspect fire doors like legends 🚪🔥',
    'Let\'s make leaseholders smile (or at least not shout) 😅',
    'Your property empire awaits 👑',
    'Another day, another service charge query 📊',
    'Ready to tackle those compliance deadlines? ⚡',
    'Property management: where every day is an adventure 🏢',
    'Let\'s make today\'s to-do list yesterday\'s problem ✅',
    'Channeling your inner property superhero today 🦸‍♂️',
    'Time to turn chaos into organized chaos 🎯',
    'Your buildings are lucky to have you managing them 🍀',
    'Let\'s make some magic happen in the property world ✨',
    'Ready to be the hero your buildings deserve 🦸‍♀️',
    'Another opportunity to excel in property management 🌟'
  ]

  // Get random welcome message on every render
  const getWelcomeMessage = () => {
    const randomIndex = Math.floor(Math.random() * welcomeMessages.length)
    return welcomeMessages[randomIndex]
  }

  // Real upcoming events from database
  const [upcomingEvents, setUpcomingEvents] = useState<PropertyEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);

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
          .order('received_at', { ascending: false })
          .limit(5);

        if (error) {
          console.error('Error fetching emails:', error);
        } else {
          setRecentEmails(emails || []);
        }
      } catch (error) {
        console.error('Error fetching emails:', error);
      } finally {
        setLoadingEmails(false);
      }
    };

    fetchEmails();
  }, [supabase]);

  // Sync emails function
  const syncEmails = async () => {
    setSyncingEmails(true);
    try {
      const response = await fetch('/api/sync-emails');
      if (response.ok) {
        // Refresh the emails list
        const { data: emails, error } = await supabase
          .from('incoming_emails')
          .select('*')
          .order('received_at', { ascending: false })
          .limit(5);

        if (!error) {
          setRecentEmails(emails || []);
        }
      }
    } catch (error) {
      console.error('Error syncing emails:', error);
    } finally {
      setSyncingEmails(false);
    }
  };

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
    const formData = new FormData(e.target as HTMLFormElement)
    const eventData = {
      title: formData.get('title') as string,
      category: formData.get('category') as string,
      date: formData.get('date') as string,
      building: formData.get('building') as string,
    }

    // Here you would typically save to database
    console.log('Adding event:', eventData)
    setIsAddingEvent(false)
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
      {/* Enhanced Header with Gradient Background */}
      <div className="relative overflow-hidden bg-gradient-to-r from-teal-600 via-blue-600 to-purple-600 rounded-2xl p-8 text-white shadow-2xl">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <h1 className="text-4xl font-bold">Welcome back, {userData.name}!</h1>
              <p className="text-teal-100 text-lg">{getWelcomeMessage()}</p>
            </div>
            <div className="flex items-center gap-4">
              <Button className="bg-white/20 hover:bg-white/30 text-white border-white/30 backdrop-blur-sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Event
              </Button>
              <Button variant="outline" className="border-white/30 text-white hover:bg-white/10">
                <RefreshCw className="h-4 w-4 mr-2" />
                Sync Emails
              </Button>
            </div>
          </div>
        </div>
        {/* Decorative elements */}
        <div className="absolute top-4 right-4 w-20 h-20 bg-white/10 rounded-full"></div>
        <div className="absolute bottom-4 left-4 w-16 h-16 bg-white/5 rounded-full"></div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="group hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border-0 bg-gradient-to-br from-teal-50 to-teal-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-teal-700 group-hover:scale-110 transition-transform duration-300">
                  {recentEmails.filter(email => email.unread).length}
                </div>
                <div className="text-sm text-teal-600 font-medium">Unread Emails</div>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <Mail className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="group hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border-0 bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-blue-700 group-hover:scale-110 transition-transform duration-300">
                  {upcomingEvents.length}
                </div>
                <div className="text-sm text-blue-600 font-medium">Upcoming Events</div>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <Calendar className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="group hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border-0 bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-green-700 group-hover:scale-110 transition-transform duration-300">
                  {messages.length - 1}
                </div>
                <div className="text-sm text-green-600 font-medium">AI Conversations</div>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <MessageCircle className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="group hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border-0 bg-gradient-to-br from-purple-50 to-purple-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-purple-700 group-hover:scale-110 transition-transform duration-300">
                  {attachments.length}
                </div>
                <div className="text-sm text-purple-600 font-medium">Attachments</div>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <Paperclip className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* BlocIQ Chat Assistant Section */}
        <div className="bg-white rounded-xl shadow-lg p-6 border flex flex-col h-[600px]">
          <div className="flex items-center gap-3 mb-6 bg-gradient-to-r from-primary to-primary/80 text-white p-4 rounded-lg -m-6 mb-6">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <MessageCircle className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-white">BlocIQ Assistant</h2>
              <p className="text-white/80 text-sm">Your AI property management companion</p>
            </div>
          </div>
          
          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  message.isUser 
                    ? 'bg-primary text-white shadow-lg' 
                    : 'bg-gray-50 text-gray-900 border border-gray-200'
                }`}>
                  <div className="text-sm whitespace-pre-line">{message.content}</div>
                  <div className={`text-xs mt-1 ${
                    message.isUser ? 'text-white/70' : 'text-gray-500'
                  }`}>
                    {formatMessageTime(message.timestamp)}
                  </div>
                </div>
              </div>
            ))}
            
            {/* Loading indicator */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3">
                  <div className="flex items-center gap-2 text-gray-600">
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
              <button className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm border border-blue-200">
                <Mail className="h-4 w-4" />
                📧 Turn into email
              </button>
              <button className="flex items-center gap-2 px-3 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors text-sm border border-green-200">
                <FileText className="h-4 w-4" />
                📝 Save as advice note
              </button>
              <button className="flex items-center gap-2 px-3 py-2 bg-orange-50 text-orange-700 rounded-lg hover:bg-orange-100 transition-colors text-sm border border-orange-200">
                <Pin className="h-4 w-4" />
                📌 Attach to building diary
              </button>
            </div>
          )}

          {/* Input form */}
          <form onSubmit={handleSubmit} className="space-y-3 bg-gray-50 p-4 rounded-lg border border-gray-200">
            {/* Attachments Display */}
            {attachments.length > 0 && (
              <div className="p-2 bg-white rounded-lg border border-gray-200">
                <div className="text-xs text-gray-600 mb-2">📎 Attachments:</div>
                <div className="space-y-1">
                  {attachments.map((file, index) => (
                    <div key={index} className="flex items-center justify-between text-xs bg-gray-50 p-2 rounded border">
                      <span className="truncate flex-1">{file.name}</span>
                      <button
                        type="button"
                        onClick={() => removeAttachment(index)}
                        className="text-red-500 hover:text-red-700 ml-2"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors text-gray-600 bg-white"
                disabled={isLoading}
              >
                <Paperclip className="h-5 w-5" />
              </button>
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask about your buildings, compliance, or recent emails…"
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white"
                disabled={isLoading}
              />
              <button 
                type="submit"
                disabled={isLoading || (!inputValue.trim() && attachments.length === 0)}
                className="bg-primary text-white px-6 py-3 rounded-lg hover:bg-primary/90 transition-colors font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              >
                <Home className="h-5 w-5" />
                Send
              </button>
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
          </form>
        </div>

        {/* Upcoming Property Events Section */}
        <div className="bg-white rounded-xl shadow-lg p-6 border">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Calendar className="h-6 w-6 text-teal-600" />
              <div>
                <h2 className="text-2xl font-semibold text-gray-900">Upcoming Property Events</h2>
                <p className="text-sm text-gray-500">Real events from your property portfolio</p>
              </div>
            </div>
            <button
              onClick={() => setIsAddingEvent(true)}
              className="inline-flex items-center gap-2 text-teal-600 hover:text-teal-700 font-medium transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add Event
            </button>
          </div>
          
          <div className="space-y-4">
            {loadingEvents ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto mb-2"></div>
                <p className="text-gray-500 text-sm">Loading events...</p>
              </div>
            ) : upcomingEvents.length > 0 ? (
              upcomingEvents.map((event, index) => {
                const { date, time } = formatEventDate(event.date)
                const eventDate = new Date(event.date)
                const isToday = eventDate.toDateString() === new Date().toDateString()
                const isTomorrow = eventDate.toDateString() === new Date(Date.now() + 24 * 60 * 60 * 1000).toDateString()
                
                return (
                  <div key={index} className="bg-white shadow rounded-xl p-4 hover:shadow-lg text-sm border-l-4 border-teal-500">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="font-bold text-gray-900">
                            {event.category}
                          </div>
                          {(isToday || isTomorrow) && (
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              isToday ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                            }`}>
                              {isToday ? 'Today' : 'Tomorrow'}
                            </span>
                          )}
                        </div>
                        <div className="text-gray-800 mb-1 font-medium">
                          {event.title}
                        </div>
                        <div className="text-gray-600 mb-1">
                          📍 {event.building}
                        </div>
                        <div className="text-gray-500">
                          🕒 {date} at {time}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">No upcoming events</p>
                <p className="text-gray-400 text-xs mt-1">Add events to your property calendar to see them here</p>
                <button
                  onClick={() => setIsAddingEvent(true)}
                  className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm"
                >
                  <Plus className="h-4 w-4" />
                  Add Your First Event
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Daily Summary Section */}
      <DailySummary />
    </div>
  )
} 