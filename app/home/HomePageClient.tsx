'use client'

import { useState } from 'react'
import Link from 'next/link'
import { MessageCircle, Calendar, ExternalLink, Send, Loader2 } from 'lucide-react'

export default function HomePageClient() {
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [response, setResponse] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

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
        body: JSON.stringify({ prompt: inputValue }),
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

  // Dummy upcoming events data
  const upcomingEvents = [
    {
      id: 1,
      title: "Building Inspection - Tower A",
      date: "Tomorrow, 10:00 AM",
      type: "Maintenance"
    },
    {
      id: 2,
      title: "Lease Renewal Meeting",
      date: "Thursday, 2:00 PM",
      type: "Legal"
    },
    {
      id: 3,
      title: "Monthly Property Review",
      date: "Friday, 9:00 AM",
      type: "Administrative"
    }
  ]

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-teal-600 to-teal-700 rounded-xl p-8 text-white">
        <h1 className="text-4xl font-bold mb-4">Welcome to BlocIQ</h1>
        <p className="text-xl opacity-90">
          Your intelligent property management assistant. Streamline operations, 
          automate communications, and stay on top of everything.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Ask BlocAI Section */}
        <div className="bg-white rounded-xl shadow-lg p-6 border">
          <div className="flex items-center gap-3 mb-6">
            <MessageCircle className="h-6 w-6 text-teal-600" />
            <h2 className="text-2xl font-semibold text-gray-900">Ask BlocAI</h2>
          </div>
          
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4 border">
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                <div className="w-2 h-2 bg-teal-500 rounded-full"></div>
                BlocAI is ready to help
              </div>
              <p className="text-gray-700">
                "How can I help you with your property management today?"
              </p>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Ask me anything about your properties..."
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
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

            {/* Response Card */}
            {response && (
              <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-sm text-teal-700 mb-2">
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

        {/* Upcoming Events Section */}
        <div className="bg-white rounded-xl shadow-lg p-6 border">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Calendar className="h-6 w-6 text-teal-600" />
              <h2 className="text-2xl font-semibold text-gray-900">Upcoming Events</h2>
            </div>
          </div>
          
          <div className="space-y-4">
            {upcomingEvents.map((event) => (
              <div key={event.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
                <div>
                  <h3 className="font-medium text-gray-900">{event.title}</h3>
                  <p className="text-sm text-gray-600">{event.date}</p>
                </div>
                <span className="px-3 py-1 text-xs font-medium bg-teal-100 text-teal-800 rounded-full">
                  {event.type}
                </span>
              </div>
            ))}
            
            <div className="pt-4 border-t">
              <a
                href="https://outlook.office.com/calendar/view/month"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-teal-600 hover:text-teal-700 font-medium transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
                Open Outlook Calendar
              </a>
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