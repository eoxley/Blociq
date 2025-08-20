'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Calendar, Plus, Clock, MapPin, Filter, ExternalLink, AlertCircle, CheckCircle2 } from 'lucide-react';
import CreateEventModal from './CreateEventModal';
import { formatEventTimeUK, formatEventDateUK } from '@/utils/date';

interface BuildingEvent {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string | null;
  event_type: string;
  category: string | null;
  location: string | null;
  outlook_event_id: string | null;
  created_at: string;
}

interface BuildingEventsProps {
  buildingId: number;
  buildingName: string;
}

const EVENT_TYPE_EMOJIS: Record<string, string> = {
  'AGM': '🏢',
  'FRA': '🔥',
  'INSPECTION': '🔍',
  'MAINTENANCE': '🔧',
  'BOARD_MEETING': '👥',
  'INSURANCE': '📄',
  'COMPLIANCE': '✅',
  'EMERGENCY': '🚨',
  'OTHER': '📅'
};

export default function BuildingEvents({ buildingId, buildingName }: BuildingEventsProps) {
  const [events, setEvents] = useState<BuildingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');

  useEffect(() => {
    fetchEvents();
  }, [buildingId]);

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('property_events')
        .select('*')
        .eq('building_id', buildingId)
        .gte('start_time', new Date().toISOString())
        .order('start_time', { ascending: true })
        .limit(10);

      if (error) {
        console.error('Error fetching events:', error?.message || JSON.stringify(error));
      } else {
        setEvents(data || []);
      }
    } catch (error) {
      console.error('Error fetching events:', error?.message || JSON.stringify(error));
    } finally {
      setLoading(false);
    }
  };

  const handleEventCreated = () => {
    fetchEvents();
  };

  const formatEventDate = (dateString: string) => {
    if (!dateString) {
      return {
        date: 'Unknown Date',
        time: 'Unknown Time',
        fullDate: 'Unknown Date'
      };
    }
    
    return formatEventDateUK(dateString);
  };

  const getEventTypeEmoji = (eventType: string) => {
    return EVENT_TYPE_EMOJIS[eventType] || '📅';
  };

  const getFilteredEvents = () => {
    if (selectedFilter === 'all') return events;
    return events.filter(event => event.event_type === selectedFilter);
  };

  const filteredEvents = getFilteredEvents();

  const eventTypes = Array.from(new Set(events.map(e => e.event_type)));

  const getPriorityColor = (eventType: string) => {
    const priorityTypes = ['EMERGENCY', 'FRA', 'COMPLIANCE'];
    if (priorityTypes.includes(eventType)) {
      return 'border-red-500 bg-red-50';
    }
    return 'border-green-500 bg-green-50';
  };

  const getPriorityIcon = (eventType: string) => {
    const priorityTypes = ['EMERGENCY', 'FRA', 'COMPLIANCE'];
    if (priorityTypes.includes(eventType)) {
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
    return <CheckCircle2 className="h-4 w-4 text-green-500" />;
  };

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
              <h2 className="text-2xl font-bold">Building Events</h2>
              <p className="text-white/80 text-sm">{buildingName}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm text-white rounded-lg hover:bg-white/30 transition-colors font-medium"
            >
              <Plus className="h-4 w-4" />
              Add Event
            </button>
          </div>
        </div>
      </div>

      {/* Filter */}
      {events.length > 0 && (
        <div className="p-6 border-b border-gray-100 bg-gray-50">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Filter by type:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedFilter('all')}
              className={`px-3 py-1.5 text-xs rounded-lg transition-all font-medium ${
                selectedFilter === 'all'
                  ? 'bg-[#4f46e5] text-white shadow-sm'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              All ({events.length})
            </button>
            {eventTypes.map(type => (
              <button
                key={type}
                onClick={() => setSelectedFilter(type)}
                className={`px-3 py-1.5 text-xs rounded-lg transition-all font-medium ${
                  selectedFilter === type
                    ? 'bg-[#a855f7] text-white shadow-sm'
                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                {getEventTypeEmoji(type)} {type} ({events.filter(e => e.event_type === type).length})
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Events List */}
      <div className="p-6">
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gradient-to-r from-[#4f46e5] to-[#a855f7] rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Calendar className="h-8 w-8 text-white" />
              </div>
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4f46e5] mx-auto mb-3"></div>
              <p className="text-gray-600 font-medium">Loading events...</p>
            </div>
          ) : filteredEvents.length > 0 ? (
            filteredEvents.map((event) => {
              const { date, time, fullDate } = formatEventDate(event.start_time);
              const eventDate = new Date(event.start_time);
              const isToday = !isNaN(eventDate.getTime()) && eventDate.toDateString() === new Date().toDateString();
              
              return (
                <div
                  key={event.id}
                  className={`border rounded-xl p-5 hover:shadow-lg transition-all duration-200 hover:scale-[1.02] ${getPriorityColor(event.event_type)}`}
                >
                  <div className="flex items-start gap-4">
                    {/* Priority Icon */}
                    <div className="flex-shrink-0 mt-1">
                      {getPriorityIcon(event.event_type)}
                    </div>

                    {/* Event Content */}
                    <div className="flex-1 min-w-0">
                      {/* Event Header */}
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-2xl">{getEventTypeEmoji(event.event_type)}</span>
                        <h3 className="text-xl font-semibold text-gray-900">{event.title || 'Untitled Event'}</h3>
                        {isToday && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#4f46e5] text-white">
                            Today
                          </span>
                        )}
                      </div>
                      
                      {/* Event Details */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Clock className="h-4 w-4 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-700 mb-1">Date & Time</p>
                            <p className="text-gray-900 font-semibold">
                              {date} at {time}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">All times shown in GMT+1</p>
                          </div>
                        </div>

                        {event.location && (
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                              <MapPin className="h-4 w-4 text-green-600" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-700 mb-1">Location</p>
                              <p className="text-gray-900 font-semibold">{event.location}</p>
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
                      
                      {/* Event Meta */}
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>Created: {event.created_at ? new Date(event.created_at).toLocaleDateString('en-GB') : 'Unknown'}</span>
                        {event.outlook_event_id && (
                          <span className="flex items-center gap-1 text-[#4f46e5] font-medium">
                            <ExternalLink className="h-3 w-3" />
                            Synced to Outlook
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Calendar className="h-10 w-10 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No upcoming events</h3>
              <p className="text-gray-500 mb-4">
                {selectedFilter === 'all' 
                  ? "Create your first event to get started."
                  : `No ${selectedFilter.toLowerCase()} events scheduled.`
                }
              </p>
              {selectedFilter !== 'all' && (
                <button
                  onClick={() => setSelectedFilter('all')}
                  className="text-[#4f46e5] hover:text-[#4338ca] text-sm font-medium underline"
                >
                  View all events
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Create Event Modal */}
      <CreateEventModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        buildingId={buildingId}
        buildingName={buildingName}
        onEventCreated={handleEventCreated}
      />
    </div>
  );
} 