'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { MessageCircle, Calendar, ExternalLink, Send, Loader2, Plus, Mail, FileText, Pin, RefreshCw, Paperclip, Home, X } from 'lucide-react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import DailySummary from '@/components/DailySummary'

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

  // Example upcoming events for demonstration
  const [upcomingEvents, setUpcomingEvents] = useState<PropertyEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);

  useEffect(() => {
    // Simulate loading delay
    const timer = setTimeout(() => {
      const exampleEvents: PropertyEvent[] = [
        {
          building: "Test Property",
          date: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours from now
          title: "AGM Meeting",
          category: "🏢 AGM"
        },
        {
          building: "Test Property",
          date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
          title: "Legionella Inspections",
          category: "🔍 Safety Inspection"
        },
        {
          building: "XX Building",
          date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // Day after tomorrow
          title: "Contractor visiting to quote for roof works",
          category: "🔨 Maintenance"
        },
        {
          building: "Client Office",
          date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days from now
          title: "Call to discuss arrears with client",
          category: "💰 Financial"
        },
        {
          building: "TPI Conference Centre",
          date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week from now
          title: "TPI Seminar",
          category: "📚 Training"
        }
      ];
      
      setUpcomingEvents(exampleEvents);
      setLoadingEvents(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

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

    setIsAddingEvent(true)

    try {
      const response = await fetch('/api/add-event', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventData),
      })

      if (response.ok) {
        // Reset form
        ;(e.target as HTMLFormElement).reset()
        alert('Event added successfully!')
      } else {
        throw new Error('Failed to add event')
      }
    } catch (error) {
      console.error('Error adding event:', error)
      alert('Failed to add event. Please try again.')
    } finally {
      setIsAddingEvent(false)
    }
  }

  const formatEventDate = (dateString: string) => {
    const date = new Date(dateString)
    return {
      date: date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      }),
      time: date.toLocaleTimeString('en-US', { 
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
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-teal-600 to-teal-700 rounded-xl p-8 text-white">
        <h1 className="text-4xl font-bold mb-4">Welcome back, {userData.name}!</h1>
        <p className="text-xl opacity-90">
          {getWelcomeMessage()}
        </p>
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
                <p className="text-sm text-gray-500">Example events - would sync with Outlook calendar</p>
              </div>
            </div>
            <a
              href="https://outlook.office.com/calendar/view/month"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-teal-600 hover:text-teal-700 font-medium transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
              Open Outlook
            </a>
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
                <p className="text-gray-400 text-xs mt-1">Events you create will appear here</p>
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