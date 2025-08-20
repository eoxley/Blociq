'use client'

import { useState } from 'react'
import { Calendar, Clock, User, ExternalLink, Filter, Search, Plus, MapPin, AlertCircle, CheckCircle2, CalendarDays } from 'lucide-react'
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
      'repair': 'bg-red-100 text-red-800',
      'visit': 'bg-purple-100 text-purple-800',
      'compliance': 'bg-orange-100 text-orange-800'
    }

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[eventType as keyof typeof colors] || 'bg-gray-100 text-gray-800'}`}>
        {eventType.charAt(0).toUpperCase() + eventType.slice(1)}
      </span>
    )
  }

  // Get date status
  const getDateStatus = (dateString: string) => {
    if (!dateString) return { status: 'unknown', text: 'No date' }

    const eventDate = new Date(dateString)
    const today = new Date()
    const daysDiff = Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    if (daysDiff < 0) return { status: 'past', text: 'Past event' }
    if (daysDiff === 0) return { status: 'today', text: 'Today' }
    if (daysDiff <= 7) return { status: 'soon', text: 'This week' }
    return { status: 'upcoming', text: 'Upcoming' }
  }

  // Check if event is from Outlook
  const isOutlookEvent = (event: any) => event.outlook_event_id !== null

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#4f46e5] to-[#a855f7] px-6 py-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <Calendar className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Property Events</h2>
              <p className="text-white/80 text-sm">Manage and track all property-related events</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm text-white rounded-lg hover:bg-white/30 transition-colors font-medium">
              <Plus className="h-4 w-4" />
              Add Event
            </button>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="p-6 border-b border-gray-100 bg-gray-50">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search events..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4f46e5] focus:border-transparent"
              />
            </div>
          </div>

          {/* Event Type Filter */}
          <div className="flex gap-2">
            <select
              value={selectedEventType}
              onChange={(e) => setSelectedEventType(e.target.value)}
              className="px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4f46e5] focus:border-transparent bg-white"
            >
              <option value="all">All Types</option>
              {eventTypes.map(type => (
                <option key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </option>
              ))}
            </select>

            {/* Date Range Filter */}
            <select
              value={selectedDateRange}
              onChange={(e) => setSelectedDateRange(e.target.value)}
              className="px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4f46e5] focus:border-transparent bg-white"
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
      </div>

      {/* Events List */}
      <div className="p-6">
        {sortedEvents.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Calendar className="h-10 w-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No events found</h3>
            <p className="text-gray-500">Try adjusting your search terms or filters</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedEvents.map((event) => {
              const dateStatus = getDateStatus(event.start_date || '')
              const isOutlook = isOutlookEvent(event)
              
              return (
                <div
                  key={event.id} 
                  className="border border-gray-200 rounded-xl p-5 hover:shadow-lg transition-all duration-200 hover:scale-[1.02] bg-white"
                >
                  <div className="flex items-start gap-4">
                    {/* Event Icon */}
                    <div className="w-12 h-12 bg-gradient-to-r from-[#4f46e5] to-[#a855f7] rounded-xl flex items-center justify-center flex-shrink-0">
                      <Calendar className="h-6 w-6 text-white" />
                    </div>

                    {/* Event Content */}
                    <div className="flex-1 min-w-0">
                      {/* Event Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-xl font-semibold text-gray-900 truncate">{event.title}</h3>
                            {getEventTypeBadge(event.event_type)}
                          </div>
                          
                          {/* Source Badges */}
                          <div className="flex items-center gap-2">
                            {isOutlook && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                Outlook Event
                              </span>
                            )}
                            {!isOutlook && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Manual
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Event Details Grid */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                        {event.start_date && (
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                              <Clock className="h-4 w-4 text-blue-600" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-700 mb-1">Date & Time</p>
                              <p className="text-gray-900 font-semibold">
                                {formatToUKTime(event.start_date)}
                                {event.end_date && event.end_date !== event.start_date && (
                                  <span className="text-gray-600 font-normal"> - {formatToUKTime(event.end_date)}</span>
                                )}
                              </p>
                              <p className={`text-xs font-medium ${
                                dateStatus.status === 'past' ? 'text-red-600' :
                                dateStatus.status === 'today' ? 'text-green-600' :
                                dateStatus.status === 'soon' ? 'text-amber-600' :
                                'text-gray-500'
                              }`}>
                                {dateStatus.text}
                              </p>
                              <p className="text-xs text-gray-400 mt-1">All times shown in GMT+1</p>
                            </div>
                          </div>
                        )}

                        {event.responsible_party && (
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                              <User className="h-4 w-4 text-green-600" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-700 mb-1">Responsible Party</p>
                              <p className="text-gray-900 font-semibold">{event.responsible_party}</p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Description */}
                      {event.description && (
                        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                          <p className="text-sm text-gray-700 leading-relaxed">{event.description}</p>
                        </div>
                      )}

                      {/* Outlook Link */}
                      {isOutlook && event.outlook_event_id && (
                        <div className="flex items-center gap-2 text-sm">
                          <ExternalLink className="h-4 w-4 text-[#4f46e5]" />
                          <a 
                            href={`https://outlook.office.com/calendar/item/${event.outlook_event_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#4f46e5] hover:text-[#4338ca] underline font-medium"
                          >
                            View in Outlook
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      <button className="flex items-center gap-2 px-4 py-2 text-sm text-[#4f46e5] hover:text-[#4338ca] border border-[#4f46e5] rounded-lg hover:bg-[#4f46e5]/5 transition-colors font-medium">
                        <Calendar className="h-4 w-4" />
                        Edit
                      </button>
                      {isOutlook && (
                        <button className="flex items-center gap-2 px-4 py-2 text-sm text-[#a855f7] hover:text-[#9333ea] border border-[#a855f7] rounded-lg hover:bg-[#a855f7]/5 transition-colors font-medium">
                          <ExternalLink className="h-4 w-4" />
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
      </div>

      {/* Quick Actions Footer */}
      <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Showing <span className="font-medium">{sortedEvents.length}</span> of <span className="font-medium">{allEvents.length}</span> events
          </div>
          <div className="flex gap-3">
            <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#4f46e5] to-[#a855f7] text-white rounded-lg hover:brightness-110 transition-all font-medium">
              <Plus className="h-4 w-4" />
              Add Event
            </button>
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium">
              <Filter className="h-4 w-4" />
              Export
            </button>
          </div>
        </div>
      </div>
    </div>
  )
} 