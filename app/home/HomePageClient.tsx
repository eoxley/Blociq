'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { MessageCircle, Calendar, ExternalLink, Send, Loader2, Plus } from 'lucide-react'

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

interface HomePageClientProps {
  userData: UserData
}

export default function HomePageClient({ userData }: HomePageClientProps) {
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [response, setResponse] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isAddingEvent, setIsAddingEvent] = useState(false)

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

    setIsLoading(true)
    setError(null)
    setResponse(null)

    try {
      const res = await fetch('/api/generate-draft', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          prompt: inputValue
        }),
      })

      if (!res.ok) {
        throw new Error('Failed to generate response')
      }

      const data = await res.json()
      setResponse(data.response || data.content || 'No response received')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
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
        {/* Ask BlocAI Section */}
        <div className="bg-white rounded-xl shadow-lg p-6 border">
          <div className="flex items-center gap-3 mb-6">
            <MessageCircle className="h-6 w-6 text-teal-600" />
            <h2 className="text-2xl font-semibold text-gray-900">How can I help you with your property management today?</h2>
          </div>
          
          <div className="space-y-4">
            {/* BlocAI Tag */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-600">🧠 BlocAI</span>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Ask me anything about your properties..."
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white"
                  disabled={isLoading}
                />
                <button 
                  type="submit"
                  disabled={isLoading || !inputValue.trim()}
                  className="px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  {isLoading ? 'Generating...' : 'Send'}
                </button>
              </div>
            </form>

            {/* Loading State */}
            {isLoading && (
              <div className="bg-gray-50 rounded-lg p-4 border">
                <div className="flex items-center gap-3">
                  <Loader2 className="h-5 w-5 animate-spin text-teal-600" />
                  <span className="text-gray-700">BlocAI is thinking...</span>
                </div>
              </div>
            )}

            {/* Response Card */}
            {response && (
              <div className="bg-gray-50 rounded-lg p-4 border">
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                  <div className="w-2 h-2 bg-teal-500 rounded-full"></div>
                  BlocAI Response
                </div>
                <div className="text-gray-800 whitespace-pre-wrap">{response}</div>
              </div>
            )}

            {/* Error Card */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-sm text-red-700 mb-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  Error
                </div>
                <div className="text-red-800">{error}</div>
              </div>
            )}
          </div>
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
            <div className="flex items-center gap-2 mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Plus className="h-5 w-5 text-teal-600" />
                Add Property Event
              </h3>
              <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded">Coming Soon</span>
            </div>
            
            <div className="text-gray-400 italic text-sm mb-4">
              Event management and calendar integration will be available in the next update.
            </div>
            
            <form onSubmit={handleAddEvent} className="space-y-4 opacity-50 pointer-events-none">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Event Title
                  </label>
                  <input
                    type="text"
                    name="title"
                    required
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    placeholder="Enter event title"
                    disabled
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <input
                    type="text"
                    name="category"
                    required
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    placeholder="e.g., 🏢 Building Maintenance"
                    disabled
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    name="date"
                    required
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    disabled
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Building
                  </label>
                  <input
                    type="text"
                    name="building"
                    required
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    placeholder="Enter building name"
                    disabled
                  />
                </div>
              </div>
              
              <button
                type="submit"
                disabled
                className="w-full bg-gray-400 text-white px-4 py-2 rounded-lg font-medium cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Event (Coming Soon)
              </button>
            </form>
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