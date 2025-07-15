'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { MessageCircle, Calendar, ExternalLink, Send, Loader2, Plus, Mail, FileText, Pin } from 'lucide-react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

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

interface HomePageClientProps {
  userData: UserData
}

export default function HomePageClient({ userData }: HomePageClientProps) {
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
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
  const supabase = createClientComponentClient()

  // Dynamic welcome messages
  const welcomeMessages = [
    'Let\'s chase some contractors and close some budgets 💼',
    'The lifts are stuck again — but not your motivation 🚀',
    'Time to inspect fire doors like legends 🚪🔥',
    'Let\'s make leaseholders smile (or at least not shout) 😅',
    'Your property empire awaits 👑'
  ]

  // Get random welcome message based on day
  const getWelcomeMessage = () => {
    const today = new Date().getDate()
    const messageIndex = today % welcomeMessages.length
    return welcomeMessages[messageIndex]
  }

  // Hardcoded property events
  const upcomingEvents: PropertyEvent[] = [
    {
      building: "Tower A",
      date: "2025-01-15T09:00:00Z",
      title: "Annual Building Inspection",
      category: "🏢 Building Maintenance"
    },
    {
      building: "Tower B",
      date: "2025-01-20T14:00:00Z",
      title: "Insurance Renewal Meeting",
      category: "📄 Insurance Renewal"
    },
    {
      building: "Tower A",
      date: "2025-01-25T10:00:00Z",
      title: "Fire Safety System Test",
      category: "🔥 Safety Compliance"
    },
    {
      building: "Tower C",
      date: "2025-02-01T16:00:00Z",
      title: "Lease Renewal Deadline",
      category: "📋 Legal & Compliance"
    },
    {
      building: "Tower B",
      date: "2025-02-05T11:00:00Z",
      title: "HVAC Maintenance",
      category: "🔧 Equipment Maintenance"
    }
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim()) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: inputValue,
      isUser: true,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)
    setError(null)

    try {
      console.log("🧠 HomePageClient: Starting AI request");
      console.log("📝 Input value:", inputValue);
      
      // Get current user ID
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.error("❌ User not authenticated");
        throw new Error('User not authenticated')
      }

      console.log("✅ User authenticated:", user.id);

      // For now, use a default building ID since this is the home page
      // In a real app, you might want to get the user's primary building or let them select one
      const defaultBuildingId = "1"; // You can change this to a real building ID

      const requestBody = { 
        question: inputValue, // Changed from 'prompt' to 'question'
        buildingId: defaultBuildingId, // Added buildingId
        userId: user.id
      };

      console.log("📤 Sending request to /api/ask");
      console.log("📦 Request body:", requestBody);

      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
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
          <div className="flex items-center gap-3 mb-6">
            <MessageCircle className="h-6 w-6 text-teal-600" />
            <h2 className="text-2xl font-semibold text-gray-900">BlocIQ Assistant</h2>
          </div>
          
          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  message.isUser 
                    ? 'bg-teal-600 text-white' 
                    : 'bg-gray-100 text-gray-900'
                }`}>
                  <div className="text-sm whitespace-pre-line">{message.content}</div>
                  <div className={`text-xs mt-1 ${
                    message.isUser ? 'text-teal-100' : 'text-gray-500'
                  }`}>
                    {formatMessageTime(message.timestamp)}
                  </div>
                </div>
              </div>
            ))}
            
            {/* Loading indicator */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-2xl px-4 py-3">
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
              <button className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm">
                <Mail className="h-4 w-4" />
                📧 Turn into email
              </button>
              <button className="flex items-center gap-2 px-3 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors text-sm">
                <FileText className="h-4 w-4" />
                📝 Save as advice note
              </button>
              <button className="flex items-center gap-2 px-3 py-2 bg-orange-50 text-orange-700 rounded-lg hover:bg-orange-100 transition-colors text-sm">
                <Pin className="h-4 w-4" />
                📌 Attach to building diary
              </button>
            </div>
          )}

          {/* Input form */}
          <form onSubmit={handleSubmit} className="flex gap-3">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask about your buildings, compliance, or recent emails…"
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white"
              disabled={isLoading}
            />
            <button 
              type="submit"
              disabled={isLoading || !inputValue.trim()}
              className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition-colors font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="h-5 w-5" />
              Send
            </button>
          </form>
        </div>

        {/* Upcoming Property Events Section */}
        <div className="bg-white rounded-xl shadow-lg p-6 border">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Calendar className="h-6 w-6 text-teal-600" />
              <h2 className="text-2xl font-semibold text-gray-900">Upcoming Property Events</h2>
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
            {upcomingEvents.map((event, index) => {
              const { date, time } = formatEventDate(event.date)
              return (
                <div key={index} className="bg-white shadow rounded-xl p-4 hover:shadow-lg text-sm">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-bold text-gray-900 mb-1">
                        {event.category}
                      </div>
                      <div className="text-gray-800 mb-1">
                        {event.title}
                      </div>
                      <div className="text-gray-600 mb-1">
                        {event.building}
                      </div>
                      <div className="text-gray-500">
                        {date} at {time}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Add Property Event Form */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center justify-center w-10 h-10 bg-yellow-500 rounded-lg">
                  <span className="text-white text-lg">⚙️</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    Add Property Event
                  </h3>
                  <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded">Coming Soon</span>
                </div>
              </div>
              
              <div className="text-gray-600 text-sm mb-4">
                <p className="mb-2">🎯 <strong>What's coming:</strong></p>
                <ul className="space-y-1 text-sm">
                  <li>• Calendar integration with Outlook</li>
                  <li>• Automated event reminders</li>
                  <li>• Building-specific event management</li>
                  <li>• Team collaboration features</li>
                </ul>
              </div>
              
              <div className="bg-white rounded-lg p-4 border border-yellow-200">
                <div className="text-center py-8">
                  <div className="text-4xl mb-3">🚧</div>
                  <h4 className="font-medium text-gray-900 mb-2">Event Management System</h4>
                  <p className="text-gray-600 text-sm">
                    This feature is currently under development. 
                    You'll be able to create, schedule, and manage property events with full calendar integration.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link href="/inbox" className="bg-white shadow-lg rounded-xl p-6 hover:shadow-xl transition-all border hover:border-teal-200 group">
          <div className="text-center">
            <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:bg-teal-200 transition-colors">
              <MessageCircle className="h-6 w-6 text-teal-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Inbox</h3>
            <p className="text-sm text-gray-600">Manage your communications</p>
          </div>
        </Link>
        
        <Link href="/buildings" className="bg-white shadow-lg rounded-xl p-6 hover:shadow-xl transition-all border hover:border-teal-200 group">
          <div className="text-center">
            <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:bg-teal-200 transition-colors">
              <div className="w-6 h-6 border-2 border-teal-600 rounded"></div>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Buildings</h3>
            <p className="text-sm text-gray-600">View property details</p>
          </div>
        </Link>
        
        <Link href="/compliance" className="bg-white shadow-lg rounded-xl p-6 hover:shadow-xl transition-all border hover:border-teal-200 group">
          <div className="text-center">
            <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:bg-teal-200 transition-colors">
              <div className="w-6 h-6 border-2 border-teal-600 rounded-sm"></div>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Compliance</h3>
            <p className="text-sm text-gray-600">Track requirements</p>
          </div>
        </Link>
      </div>
    </div>
  )
} 