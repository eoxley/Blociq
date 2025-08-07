'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Calendar, Plus, Clock, MapPin, Filter, ExternalLink } from 'lucide-react';
import CreateEventModal from './CreateEventModal';

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
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return {
        date: 'Invalid Date',
        time: 'Invalid Time',
        fullDate: 'Invalid Date'
      };
    }
    
    return {
      date: date.toLocaleDateString('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short'
      }),
      time: date.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit'
      }),
      fullDate: date.toLocaleDateString('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      })
    };
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

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 bg-teal-100 rounded-lg">
            <Calendar className="h-5 w-5 text-teal-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Upcoming Events</h2>
            <p className="text-sm text-gray-600">{buildingName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-3 py-1.5 text-sm bg-teal-600 text-white rounded-md hover:bg-teal-700 transition-colors"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Event
          </button>
        </div>
      </div>

      {/* Filter */}
      {events.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-600">Filter by type:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedFilter('all')}
              className={`px-3 py-1 text-xs rounded-full transition-colors ${
                selectedFilter === 'all'
                  ? 'bg-teal-100 text-teal-800'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All ({events.length})
            </button>
            {eventTypes.map(type => (
              <button
                key={type}
                onClick={() => setSelectedFilter(type)}
                className={`px-3 py-1 text-xs rounded-full transition-colors ${
                  selectedFilter === type
                    ? 'bg-teal-100 text-teal-800'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {getEventTypeEmoji(type)} {type} ({events.filter(e => e.event_type === type).length})
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Events List */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto mb-2"></div>
            <p className="text-gray-500 text-sm">Loading events...</p>
          </div>
        ) : filteredEvents.length > 0 ? (
          filteredEvents.map((event) => {
            const { date, time, fullDate } = formatEventDate(event.start_time);
            const eventDate = new Date(event.start_time);
            const isToday = !isNaN(eventDate.getTime()) && eventDate.toDateString() === new Date().toDateString();
            
            return (
              <div
                key={event.id}
                className={`border rounded-lg p-4 hover:shadow-md transition-shadow ${
                  isToday ? 'border-teal-200 bg-teal-50' : 'border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">{getEventTypeEmoji(event.event_type)}</span>
                      <h3 className="font-semibold text-gray-900">{event.title || 'Untitled Event'}</h3>
                      {isToday && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-teal-100 text-teal-800">
                          Today
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span>{date} at {time}</span>
                      </div>
                      {event.location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          <span>{event.location}</span>
                        </div>
                      )}
                    </div>
                    
                    {event.description && (
                      <p className="text-sm text-gray-700 mb-2">{event.description}</p>
                    )}
                    
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span>Created: {event.created_at ? new Date(event.created_at).toLocaleDateString('en-GB') : 'Unknown'}</span>
                      {event.outlook_event_id && (
                        <span className="flex items-center gap-1 text-blue-600">
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
          <div className="text-center py-8">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No upcoming events</h3>
            <p className="text-gray-600 text-sm mb-4">
              {selectedFilter === 'all' 
                ? "Create your first event to get started."
                : `No ${selectedFilter.toLowerCase()} events scheduled.`
              }
            </p>
            {selectedFilter !== 'all' && (
              <button
                onClick={() => setSelectedFilter('all')}
                className="text-teal-600 hover:text-teal-700 text-sm font-medium"
              >
                View all events
              </button>
            )}
          </div>
        )}
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