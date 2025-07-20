'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, Clock, Building, User } from 'lucide-react'
import CreateEventForm from '@/components/CreateEventForm'

interface Event {
  id: string
  title: string
  date: string
  building: string | null
  user_id: string
  created_at: string
  updated_at: string
}

export default function CreateEventTestPage() {
  const [recentEvents, setRecentEvents] = useState<Event[]>([])

  const handleEventCreated = (event: Event) => {
    setRecentEvents(prev => [event, ...prev.slice(0, 4)]) // Keep only 5 most recent
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Create Event API Test</h1>
        <p className="text-gray-600">
          Test the create-event API endpoint with this form. Events will be stored in the database and optionally added to Outlook calendar.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Create Event Form */}
        <div>
          <CreateEventForm onEventCreated={handleEventCreated} />
        </div>

        {/* Recent Events */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Recent Events
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentEvents.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No events created yet</p>
                  <p className="text-sm">Create an event to see it here</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentEvents.map((event) => (
                    <Card key={event.id} className="border-l-4 border-l-blue-500">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-semibold text-gray-900">{event.title}</h3>
                          <Badge variant="outline" className="text-xs">
                            New
                          </Badge>
                        </div>
                        
                        <div className="space-y-1 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <Clock className="h-3 w-3" />
                            <span>{formatDate(event.date)}</span>
                          </div>
                          
                          {event.building && (
                            <div className="flex items-center gap-2">
                              <Building className="h-3 w-3" />
                              <span>{event.building}</span>
                            </div>
                          )}
                          
                          <div className="flex items-center gap-2">
                            <User className="h-3 w-3" />
                            <span>Created: {formatDate(event.created_at)}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* API Documentation */}
      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>API Documentation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Endpoint</h3>
                <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                  POST /api/create-event
                </code>
              </div>
              
              <div>
                <h3 className="font-semibold mb-2">Request Body</h3>
                <pre className="bg-gray-100 p-4 rounded text-sm overflow-x-auto">
{`{
  "title": "string",     // Required
  "date": "2025-07-24",  // Required (YYYY-MM-DD)
  "building": "string"   // Optional
}`}
                </pre>
              </div>
              
              <div>
                <h3 className="font-semibold mb-2">Response</h3>
                <pre className="bg-gray-100 p-4 rounded text-sm overflow-x-auto">
{`{
  "success": true,
  "event": {
    "id": "uuid",
    "title": "string",
    "date": "2025-07-24T10:00:00.000Z",
    "building": "string",
    "user_id": "uuid",
    "created_at": "2025-01-15T10:00:00.000Z",
    "updated_at": "2025-01-15T10:00:00.000Z"
  },
  "outlook": {
    "success": true,
    "eventId": "outlook-event-id",
    "message": "Event also added to Outlook calendar"
  },
  "message": "Event created successfully"
}`}
                </pre>
              </div>
              
              <div>
                <h3 className="font-semibold mb-2">Features</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                  <li>✅ Validates required fields (title, date)</li>
                  <li>✅ Validates date format (YYYY-MM-DD)</li>
                  <li>✅ Associates events with authenticated user</li>
                  <li>✅ Optional building context</li>
                  <li>✅ Automatic Outlook calendar integration (if connected)</li>
                  <li>✅ Row Level Security (RLS) for data protection</li>
                  <li>✅ Comprehensive error handling</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 