"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Calendar, MapPin, Clock, Building, Loader2, RefreshCw, Plus } from "lucide-react";
import { BlocIQButton } from "@/components/ui/blociq-button";
import { BlocIQBadge } from "@/components/ui/blociq-badge";
import ManualDiaryInput from "./ManualDiaryInput";
import { formatEventRangeUK, formatEventTimeUK } from "@/utils/date";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Event = {
  id: string;
  subject?: string;
  title?: string;
  location: string | null;
  start_time: string;
  end_time: string;
  outlook_id?: string;
  is_all_day: boolean;
  organiser_name: string | null;
  description: string | null;
  online_meeting: any | null;
  category?: string;
  priority?: string;
  notes?: string;
  user_id?: string;
  created_at?: string;
  updated_at?: string;
  event_type?: 'outlook' | 'manual';
};

type AIMatch = {
  buildingName: string;
  confidence: number;
  reasoning: string;
};

type Building = {
  id: string;
  name: string;
  address?: string;
};

export default function UpcomingEventsWidget() {
  const [events, setEvents] = useState<Event[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [aiMatches, setAiMatches] = useState<Record<string, AIMatch>>({});
  const [matchingInProgress, setMatchingInProgress] = useState<Record<string, boolean>>({});

  const loadData = async () => {
    setLoading(true);
    try {
      // Load buildings and events in parallel
      const [buildingsResponse, outlookEventsResponse, manualEventsResponse] = await Promise.all([
        supabase.from("buildings").select("id, name, address"),
        supabase
          .from("calendar_events")
          .select("*")
          .gte("start_time", new Date().toISOString())
          .order("start_time", { ascending: true })
          .limit(10),
        supabase
          .from("manual_events")
          .select("*")
          .gte("start_time", new Date().toISOString())
          .order("start_time", { ascending: true })
          .limit(10)
      ]);

      setBuildings(buildingsResponse.data || []);
      
      // Combine and sort events
      const outlookEvents = (outlookEventsResponse.data || []).map(event => ({
        ...event,
        event_type: 'outlook' as const
      }));
      const manualEvents = (manualEventsResponse.data || []).map(event => ({
        ...event,
        event_type: 'manual' as const,
        subject: event.title // Map title to subject for consistency
      }));
      
      const allEvents = [...outlookEvents, ...manualEvents].sort((a, b) => 
        new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
      );
      
      setEvents(allEvents);

      // Trigger AI matching for unmatched outlook events
      for (const event of outlookEvents) {
        const matchedBuilding = matchBuilding(event);
        if (!matchedBuilding) {
          matchWithAI(event);
        }
      }
    } catch (error) {
      console.error("Error loading events widget data:", error?.message || JSON.stringify(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const syncCalendar = async () => {
    setSyncing(true);
    try {
      const response = await fetch('/api/sync-calendar');
      if (response.ok) {
        // Refresh events after sync
        const { data: eventsData } = await supabase
          .from("calendar_events")
          .select("*")
          .gte("start_time", new Date().toISOString())
          .order("start_time", { ascending: true })
          .limit(10);
        
        setEvents(eventsData || []);

        // Trigger AI matching for new unmatched events
        for (const event of eventsData || []) {
          const matchedBuilding = matchBuilding(event);
          if (!matchedBuilding) {
            matchWithAI(event);
          }
        }
      }
    } catch (error) {
      console.error("Error syncing calendar:", error?.message || JSON.stringify(error));
    } finally {
      setSyncing(false);
    }
  };

  const matchBuilding = (event: Event): Building | null => {
    if (!event.subject && !event.title && !event.location) return null;
    
    const searchText = `${event.subject || event.title || ''} ${event.location || ''}`.toLowerCase();
    
    // Try exact matches first
    const exactMatch = buildings.find((building) => 
      building.name && searchText.includes(building.name.toLowerCase())
    );
    if (exactMatch) return exactMatch;
    
    // Try partial matches (building name contains words from event)
    const eventWords = searchText.split(/\s+/).filter(word => word.length > 2);
    const partialMatch = buildings.find((building) => {
      if (!building.name) return false;
      const buildingWords = building.name.toLowerCase().split(/\s+/);
      return eventWords.some(word => 
        buildingWords.some(buildingWord => buildingWord.includes(word) || word.includes(buildingWord))
      );
    });
    
    return partialMatch || null;
  };

  const matchWithAI = async (event: Event) => {
    // Skip if already matching or matched
    if (matchingInProgress[event.id] || aiMatches[event.id]) return;
    
    setMatchingInProgress(prev => ({ ...prev, [event.id]: true }));
    
    try {
      const response = await fetch('/api/match-building', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: event.subject || event.title,
          location: event.location,
          description: event.description
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.match && data.match !== 'Unknown') {
          setAiMatches(prev => ({
            ...prev,
            [event.id]: {
              buildingName: data.match,
              confidence: data.confidence || 0.5,
              reasoning: data.reasoning || 'AI analysis of event details'
            }
          }));
        }
      }
    } catch (error) {
      console.error('Error matching with AI:', error);
    } finally {
      setMatchingInProgress(prev => ({ ...prev, [event.id]: false }));
    }
  };

  const formatEventTime = (startTime: string, endTime: string, isAllDay: boolean) => {
    if (isAllDay) return "All day";
    
    if (!startTime) return "Time TBD";
    
    if (!endTime) {
      return formatEventTimeUK(startTime);
    }
    
    return formatEventRangeUK(startTime, endTime);
  };

  const formatEventDate = (dateString: string) => {
    if (!dateString) return "Unknown Date";
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Invalid Date";
    
    // Convert to UK timezone for comparison
    const ukDate = new Date(date.toLocaleString("en-US", { timeZone: "Europe/London" }));
    const today = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/London" }));
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (ukDate.toDateString() === today.toDateString()) {
      return "Today";
    } else if (ukDate.toDateString() === tomorrow.toDateString()) {
      return "Tomorrow";
    } else {
      return date.toLocaleDateString('en-GB', { 
        weekday: 'short', 
        day: 'numeric', 
        month: 'short',
        timeZone: 'Europe/London'
      });
    }
  };

  const getEventPriority = (event: Event) => {
    // For manual events, use the stored priority
    if (event.event_type === 'manual' && event.priority) {
      return event.priority;
    }
    
    // For outlook events, calculate based on time
    if (!event.start_time) return "low";
    
    const startTime = new Date(event.start_time);
    if (isNaN(startTime.getTime())) return "low";
    
    const now = new Date();
    const hoursUntilEvent = (startTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    if (hoursUntilEvent < 2) return "high";
    if (hoursUntilEvent < 24) return "medium";
    return "low";
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6 border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            Upcoming Events
          </h2>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600">Loading events...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Calendar className="h-5 w-5 text-[#008C8F]" />
          Upcoming Events
        </h2>
        <div className="flex items-center gap-3">
          <ManualDiaryInput 
            onEventCreated={loadData}
            buildings={buildings}
          />
          <BlocIQButton
            onClick={syncCalendar}
            disabled={syncing}
            variant="outline"
            size="sm"
            className="text-[#008C8F] border-[#008C8F] hover:bg-[#F0FDFA]"
          >
            {syncing ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            {syncing ? 'Syncing...' : 'Sync'}
          </BlocIQButton>
        </div>
      </div>

      {events.length === 0 ? (
        <div className="text-center py-8">
          <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500 text-sm mb-2">No upcoming events found</p>
          <p className="text-gray-400 text-xs">Sync your Outlook calendar to see events here</p>
          <BlocIQButton
            onClick={syncCalendar}
            disabled={syncing}
            className="mt-4"
          >
            {syncing ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Calendar className="h-4 w-4 mr-2" />
            )}
            {syncing ? 'Syncing...' : 'Sync Calendar'}
          </BlocIQButton>
        </div>
      ) : (
        <div className="space-y-4">
          {events.map((event) => {
            const matchedBuilding = matchBuilding(event);
            const priority = getEventPriority(event);
            const eventDate = formatEventDate(event.start_time);
            const eventTime = formatEventTime(event.start_time, event.end_time, event.is_all_day);
            
            return (
              <div
                key={event.id}
                className={`p-4 rounded-lg border-l-4 transition-all hover:shadow-md ${
                  event.event_type === 'manual'
                    ? priority === 'high'
                      ? 'border-[#EF4444] bg-red-50'
                      : priority === 'medium'
                      ? 'border-[#F59E0B] bg-yellow-50'
                      : 'border-[#2BBEB4] bg-[#F0FDFA]'
                    : priority === 'high' 
                      ? 'border-red-500 bg-red-50' 
                      : priority === 'medium'
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-blue-500 bg-blue-50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900 text-sm">
                        {event.subject || event.title || 'Untitled Event'}
                      </h3>
                      {event.event_type === 'manual' && (
                        <BlocIQBadge variant="secondary" size="sm">
                          Manual
                        </BlocIQBadge>
                      )}
                      {priority === 'high' && (
                        <BlocIQBadge variant="warning" size="sm">
                          Soon
                        </BlocIQBadge>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-4 text-xs text-gray-600 mb-2">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span className="font-medium">{eventDate}</span>
                        <span>•</span>
                        <span>{eventTime}</span>
                      </div>
                    </div>

                    {event.location && (
                      <div className="flex items-center gap-1 text-xs text-gray-600 mb-1">
                        <MapPin className="h-3 w-3" />
                        <span>{event.location}</span>
                      </div>
                    )}

                                         {matchedBuilding && (
                       <div className="flex items-center gap-1 text-xs text-blue-600 font-medium">
                         <Building className="h-3 w-3" />
                         <span>📍 {matchedBuilding.name}</span>
                       </div>
                     )}

                     {!matchedBuilding && aiMatches[event.id] && (
                       <div className="flex items-center gap-1 text-xs text-purple-600 font-medium">
                         <Building className="h-3 w-3" />
                         <span>🤖 AI: {aiMatches[event.id]?.buildingName || 'Unknown Building'}</span>
                         <span className="text-purple-400">
                           ({Math.round((aiMatches[event.id]?.confidence || 0) * 100)}% confidence)
                         </span>
                       </div>
                     )}

                     {!matchedBuilding && !aiMatches[event.id] && matchingInProgress[event.id] && (
                       <div className="flex items-center gap-1 text-xs text-gray-500">
                         <Loader2 className="h-3 w-3 animate-spin" />
                         <span>🤖 AI matching...</span>
                       </div>
                     )}

                     {!matchedBuilding && !aiMatches[event.id] && !matchingInProgress[event.id] && (
                       <div className="flex items-center gap-1 text-xs text-gray-500">
                         <Building className="h-3 w-3" />
                         <span>❓ No building match</span>
                         <button
                           onClick={() => matchWithAI(event)}
                           className="text-blue-600 hover:text-blue-800 underline text-xs"
                         >
                           Try AI match
                         </button>
                       </div>
                     )}

                    {event.organiser_name && (
                      <div className="text-xs text-gray-500 mt-1">
                        👤 {event.organiser_name}
                      </div>
                    )}

                    {event.online_meeting && (
                      <div className="text-xs text-blue-600 mt-1">
                        🎥 Online meeting available
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {events.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>{events.length} upcoming event{events.length !== 1 ? 's' : ''}</span>
            <div className="flex items-center gap-4">
              <span>
                Manual matches: {events.filter(e => matchBuilding(e)).length}
              </span>
              <span>
                AI matches: {Object.keys(aiMatches).length}
              </span>
              <span>
                Unmatched: {events.filter(e => !matchBuilding(e) && !aiMatches[e.id]).length}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 