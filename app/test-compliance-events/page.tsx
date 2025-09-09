'use client'

import React, { useState, useEffect } from 'react'
import { BlocIQButton } from '@/components/ui/blociq-button'
import { BlocIQCard, BlocIQCardContent, BlocIQCardHeader } from '@/components/ui/blociq-card'
import { Calendar, Building, AlertCircle, Clock, FileText, RefreshCw } from 'lucide-react'

type ComplianceEvent = {
  id: string
  building: string
  date: string
  title: string
  category: string
  source: 'compliance'
  event_type: 'compliance'
  location: string | null
  organiser_name: string | null
  online_meeting: any | null
  startUtc: string | null
  endUtc: string | null
  timeZoneIana: string
  isAllDay: boolean
  compliance_status?: string
  compliance_notes?: string | null
  days_until_due?: number
  is_overdue?: boolean
  status?: string
  status_color?: string
}

export default function TestComplianceEventsPage() {
  const [events, setEvents] = useState<ComplianceEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchComplianceEvents = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/events/compliance')
      const data = await response.json()
      
      if (data.success) {
        setEvents(data.data)
      } else {
        setError(data.error || 'Failed to fetch compliance events')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchComplianceEvents()
  }, [])

  const formatEventDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-GB', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'overdue':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      case 'due_soon':
        return <Clock className="h-4 w-4 text-yellow-500" />
      default:
        return <Calendar className="h-4 w-4 text-blue-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'overdue':
        return 'bg-red-100 text-red-800'
      case 'due_soon':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-blue-100 text-blue-800'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Compliance Events Test</h1>
        
        <div className="mb-6">
          <BlocIQButton 
            onClick={fetchComplianceEvents} 
            disabled={loading}
            className="mb-4"
          >
            {loading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Events
              </>
            )}
          </BlocIQButton>
        </div>

        {error && (
          <BlocIQCard className="mb-6">
            <BlocIQCardContent>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="text-red-800">
                  <strong>Error:</strong> {error}
                </div>
              </div>
            </BlocIQCardContent>
          </BlocIQCard>
        )}

        {events.length === 0 && !loading && !error && (
          <BlocIQCard>
            <BlocIQCardContent>
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Compliance Events</h3>
                <p className="text-gray-500">
                  No compliance assets with due dates found. Make sure you have compliance data seeded.
                </p>
              </div>
            </BlocIQCardContent>
          </BlocIQCard>
        )}

        {events.length > 0 && (
          <div className="space-y-4">
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                Found {events.length} compliance events
              </h2>
            </div>
            
            {events.map((event) => (
              <BlocIQCard key={event.id} className="hover:shadow-lg transition-shadow">
                <BlocIQCardContent>
                  <div className="p-5">
                    <div className="flex items-start gap-4">
                      {/* Event Icon */}
                      <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl flex items-center justify-center text-white flex-shrink-0 shadow-lg">
                        <Calendar className="h-5 w-5" />
                      </div>
                      
                      {/* Event Content */}
                      <div className="flex-1 min-w-0">
                        {/* Event Header */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2">
                              <h4 className="text-xl font-bold text-gray-900 truncate">{event.title}</h4>
                              {event.status && (
                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(event.status)}`}>
                                  {getStatusIcon(event.status)}
                                  <span className="ml-1">
                                    {event.status === 'overdue' ? 'Overdue' : 
                                     event.status === 'due_soon' ? 'Due Soon' : 
                                     'Upcoming'}
                                  </span>
                                </span>
                              )}
                            </div>
                            
                            {/* Source Badges */}
                            <div className="flex items-center gap-2 mb-3">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                Compliance Due
                              </span>
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {event.category}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Event Details Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                          {/* Date */}
                          <div className="flex items-start gap-3">
                            <div className="w-6 h-6 bg-gradient-to-r from-[#4f46e5]/20 to-[#a855f7]/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 border border-[#4f46e5]/30">
                              <Clock className="h-3 w-3 text-[#4f46e5]" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-gray-700 mb-2">Due Date</p>
                              <p className="text-gray-900 font-semibold">
                                {formatEventDate(event.date)}
                              </p>
                            </div>
                          </div>

                          {/* Building */}
                          <div className="flex items-start gap-3">
                            <div className="w-6 h-6 bg-gradient-to-r from-[#14b8a6]/20 to-[#3b82f6]/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 border border-[#14b8a6]/30">
                              <Building className="h-3 w-3 text-[#14b8a6]" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-gray-700 mb-2">Building</p>
                              <p className="text-gray-900 font-semibold">{event.building}</p>
                            </div>
                          </div>

                          {/* Compliance Status */}
                          {event.compliance_status && (
                            <div className="flex items-start gap-3">
                              <div className="w-6 h-6 bg-gradient-to-r from-[#ef4444]/20 to-[#dc2626]/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 border border-[#ef4444]/30">
                                <AlertCircle className="h-3 w-3 text-[#ef4444]" />
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-gray-700 mb-2">Compliance Status</p>
                                <p className="text-gray-900 font-semibold capitalize">{event.compliance_status}</p>
                              </div>
                            </div>
                          )}

                          {/* Days Until Due */}
                          {event.days_until_due !== undefined && (
                            <div className="flex items-start gap-3">
                              <div className="w-6 h-6 bg-gradient-to-r from-[#3b82f6]/20 to-[#1d4ed8]/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 border border-[#3b82f6]/30">
                                <Calendar className="h-3 w-3 text-[#3b82f6]" />
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-gray-700 mb-2">Due In</p>
                                <p className="text-gray-900 font-semibold">
                                  {event.days_until_due === 0 ? 'Today' : 
                                   event.days_until_due < 0 ? `${Math.abs(event.days_until_due)} days overdue` :
                                   `${event.days_until_due} days`}
                                </p>
                              </div>
                            </div>
                          )}

                          {/* Compliance Notes */}
                          {event.compliance_notes && (
                            <div className="flex items-start gap-3 md:col-span-2">
                              <div className="w-6 h-6 bg-gradient-to-r from-[#6b7280]/20 to-[#374151]/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 border border-[#6b7280]/30">
                                <FileText className="h-3 w-3 text-[#6b7280]" />
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-gray-700 mb-2">Notes</p>
                                <p className="text-gray-900 font-semibold">{event.compliance_notes}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </BlocIQCardContent>
              </BlocIQCard>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
