'use client'

import { useState } from 'react'
import { Calendar, Clock, User, ExternalLink, Filter, Search } from 'lucide-react'
import { formatEventDateUK, formatToUKTime, formatDateUK } from '@/utils/date'

interface PropertyEvent {
  id: string
  title: string
  description: string | null
  event_type: string | null
  start_date: string | null
  end_date: string | null
  responsible_party: string | null
  outlook_event_id: string | null
  created_at: string
}

interface ManualEvent {
  id: string
  title: string
  description: string | null
  event_type: string | null
  start_date: string | null
  end_date: string | null
  responsible_party: string | null
  created_at: string
}

interface PropertyEventsProps {
  propertyEvents: PropertyEvent[]
  manualEvents: ManualEvent[]
  buildingId: string
}

export default function PropertyEvents({ propertyEvents, manualEvents, buildingId }: PropertyEventsProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedEventType, setSelectedEventType] = useState<string>('all')
  const [selectedDateRange, setSelectedDateRange] = useState<string>('all')

  // Combine all events
  const allEvents = [
    ...propertyEvents.map(event => ({ ...event, source: 'outlook' as const })),
    ...manualEvents.map(event => ({ ...event, source: 'manual' as const }))
  ]

  // Get unique event types
  const eventTypes = Array.from(new Set(allEvents.map(event => event.event_type).filter(Boolean)))

  // Filter events based on search and filters
  const filteredEvents = allEvents.filter(event => {
    const matchesSearch = !searchTerm || 
      event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.responsible_party?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesEventType = selectedEventType === 'all' || event.event_type === selectedEventType

    const matchesDateRange = (() => {
      if (selectedDateRange === 'all') return true
      if (!event.start_date) return false

      const eventDate = new Date(event.start_date)
      const today = new Date()
      const daysDiff = Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

      switch (selectedDateRange) {
        case 'today':
          return daysDiff === 0
        case 'this_week':
          return daysDiff >= 0 && daysDiff <= 7
        case 'this_month':
          return daysDiff >= 0 && daysDiff <= 30
        case 'upcoming':
          return daysDiff > 0
        case 'past':
          return daysDiff < 0
        default:
          return true
      }
    })()

    return matchesSearch && matchesEventType && matchesDateRange
  })

  // Sort events by date
  const sortedEvents = filteredEvents.sort((a, b) => {
    const dateA = a.start_date ? new Date(a.start_date).getTime() : 0
    const dateB = b.start_date ? new Date(b.start_date).getTime() : 0
    return dateA - dateB
  })

  // Get event type badge
  const getEventTypeBadge = (eventType: string | null) => {
    if (!eventType) return null

    const colors = {
      'inspection': 'bg-blue-100 text-blue-800',
      'meeting': 'bg-green-100 text-green-800',
      'maintenance': 'bg-yellow-100 text-yellow-800',
      'access': 'bg-purple-100 text-purple-800',
      'emergency': 'bg-red-100 text-red-800',
      'default': 'bg-gray-100 text-gray-800'
    }

    const colorClass = colors[eventType as keyof typeof colors] || colors.default

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
        {eventType}
      </span>
    )
  }

  // Get date status
  const getDateStatus = (startDate: string | null) => {
    if (!startDate) return { status: 'no-date', text: 'No date set' }

    const eventDate = new Date(startDate)
    const today = new Date()
    const daysDiff = Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    if (daysDiff < 0) {
      return { status: 'past', text: `${Math.abs(daysDiff)} days ago` }
    } else if (daysDiff === 0) {
      return { status: 'today', text: 'Today' }
    } else if (daysDiff <= 7) {
      return { status: 'soon', text: `In ${daysDiff} days` }
    } else {
      return { status: 'future', text: `In ${daysDiff} days` }
    }
  }

  return (
    <div className="p-6">
      {/* Filters */}
      <div className="mb-6 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search events..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap gap-3">
          <select
            value={selectedEventType}
            onChange={(e) => setSelectedEventType(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          >
            <option value="all">All Event Types</option>
            {eventTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>

          <select
            value={selectedDateRange}
            onChange={(e) => setSelectedDateRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          >
            <option value="all">All Dates</option>
            <option value="today">Today</option>
            <option value="this_week">This Week</option>
            <option value="this_month">This Month</option>
            <option value="upcoming">Upcoming</option>
            <option value="past">Past</option>
          </select>
        </div>
      </div>

      {/* Events List */}
      {sortedEvents.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Calendar className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Events Found</h3>
          <p className="text-gray-600">
            {searchTerm || selectedEventType !== 'all' || selectedDateRange !== 'all'
              ? 'Try adjusting your filters.'
              : 'No property events have been added to this building yet.'
            }
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedEvents.map((event) => {
            const dateStatus = getDateStatus(event.start_date)
            const isOutlookEvent = 'source' in event && event.source === 'outlook'

            return (
              <div 
                key={event.id} 
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow bg-white"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* Event Header */}
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                        <Calendar className="h-5 w-5 text-orange-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-semibold text-gray-900">{event.title}</h3>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-gray-600 mt-1">
                          {getEventTypeBadge(event.event_type)}
                          {event.source === 'outlook' && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              Outlook Event
                            </span>
                          )}
                          {event.source === 'manual' && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Manual
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Event Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                      {event.start_date && (
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="h-4 w-4 text-gray-400" />
                          <div>
                            <p className="text-gray-600">Date & Time</p>
                            <p className="text-gray-900 font-medium">
                              {formatToUKTime(event.start_date)}
                              {event.end_date && event.end_date !== event.start_date && (
                                <span> - {formatToUKTime(event.end_date)}</span>
                              )}
                            </p>
                            <p className={`text-xs ${
                              dateStatus.status === 'past' ? 'text-red-600' :
                              dateStatus.status === 'today' ? 'text-green-600' :
                              dateStatus.status === 'soon' ? 'text-yellow-600' :
                              'text-gray-500'
                            }`}>
                              {dateStatus.text}
                            </p>
                          </div>
                        </div>
                      )}

                      {event.responsible_party && (
                        <div className="flex items-center gap-2 text-sm">
                          <User className="h-4 w-4 text-gray-400" />
                          <div>
                            <p className="text-gray-600">Responsible Party</p>
                            <p className="text-gray-900 font-medium">{event.responsible_party}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Description */}
                    {event.description && (
                      <div className="mb-3">
                        <p className="text-sm text-gray-700">{event.description}</p>
                      </div>
                    )}

                    {/* Outlook Link */}
                    {isOutlookEvent && event.outlook_event_id && (
                      <div className="flex items-center gap-2 text-sm">
                        <ExternalLink className="h-3 w-3 text-blue-600" />
                        <a 
                          href={`https://outlook.office.com/calendar/item/${event.outlook_event_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          View in Outlook
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="ml-4 flex flex-col gap-2">
                    <button className="flex items-center gap-2 px-3 py-1 text-sm text-teal-600 hover:text-teal-700 border border-teal-200 rounded hover:bg-teal-50 transition-colors">
                      <Calendar className="h-3 w-3" />
                      Edit
                    </button>
                    {isOutlookEvent && (
                      <button className="flex items-center gap-2 px-3 py-1 text-sm text-blue-600 hover:text-blue-700 border border-blue-200 rounded hover:bg-blue-50 transition-colors">
                        <ExternalLink className="h-3 w-3" />
                        Sync
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Quick Actions */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Showing {sortedEvents.length} of {allEvents.length} events
          </div>
          <div className="flex gap-2">
            <button className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors">
              <Calendar className="h-4 w-4" />
              Add Event
            </button>
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
              <Filter className="h-4 w-4" />
              Export
            </button>
          </div>
        </div>
      </div>
    </div>
  )
} 