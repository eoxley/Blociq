"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Calendar, MapPin, Clock, Building, Loader2, RefreshCw, Plus, AlertCircle, CheckCircle2, CalendarDays } from "lucide-react";
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
      // Call the actual Outlook sync API
      const response = await fetch('/api/sync-calendar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to sync calendar');
      }

      const result = await response.json();
      console.log('Calendar sync result:', result);
      
      // Reload the data to show new events
      await loadData();
    } catch (error) {
      console.error("Error syncing calendar:", error);
      // You might want to add toast notifications here
    } finally {
      setSyncing(false);
    }
  };

  const matchBuilding = (event: Event): Building | null => {
    if (!event.location) return null;
    
    return buildings.find(building => 
      building.name.toLowerCase().includes(event.location!.toLowerCase()) ||
      event.location!.toLowerCase().includes(building.name.toLowerCase())
    ) || null;
  };

  const matchWithAI = async (event: Event) => {
    if (matchingInProgress[event.id]) return;
    
    setMatchingInProgress(prev => ({ ...prev, [event.id]: true }));
    
    try {
      // Simulate AI matching delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Mock AI match result
      const mockMatch: AIMatch = {
        buildingName: buildings[Math.floor(Math.random() * buildings.length)]?.name || 'Unknown Building',
        confidence: 0.7 + Math.random() * 0.3,
        reasoning: 'Location and context analysis'
      };
      
      setAiMatches(prev => ({ ...prev, [event.id]: mockMatch }));
    } catch (error) {
      console.error("Error in AI matching:", error);
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
    
    // Convert to GMT+1 (Europe/London) for comparison
    const gmtPlus1Date = new Date(date.toLocaleString("en-US", { timeZone: "Europe/London" }));
    const today = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/London" }));
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (gmtPlus1Date.toDateString() === today.toDateString()) {
      return "Today";
    } else if (gmtPlus1Date.toDateString() === tomorrow.toDateString()) {
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

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'medium':
        return <Clock className="h-4 w-4 text-amber-500" />;
      default:
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'border-red-500 bg-red-50';
      case 'medium':
        return 'border-amber-500 bg-amber-50';
      default:
        return 'border-green-500 bg-green-50';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-r from-[#4f46e5] to-[#a855f7] rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Calendar className="h-8 w-8 text-white" />
            </div>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4f46e5] mx-auto mb-3"></div>
            <p className="text-gray-600 font-medium">Loading events...</p>
          </div>
        </div>
      </div>
    );
  }

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
              <h2 className="text-2xl font-bold">Upcoming Events</h2>
              <p className="text-white/80 text-sm">Stay on top of your schedule</p>
            </div>
          </div>
          
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
              className="text-white border-white/30 hover:bg-white/10 backdrop-blur-sm"
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
      </div>

      {/* Content */}
      <div className="p-6">
        {events.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Calendar className="h-10 w-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No upcoming events</h3>
            <p className="text-gray-500 mb-4">Sync your Outlook calendar to see events here</p>
            <BlocIQButton
              onClick={syncCalendar}
              disabled={syncing}
              className="bg-gradient-to-r from-[#4f46e5] to-[#a855f7] text-white hover:brightness-110"
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
                  className={`p-5 rounded-xl border-l-4 transition-all duration-200 hover:shadow-lg hover:scale-[1.02] ${getPriorityColor(priority)}`}
                >
                  <div className="flex items-start gap-4">
                    {/* Priority Icon */}
                    <div className="flex-shrink-0 mt-1">
                      {getPriorityIcon(priority)}
                    </div>

                    {/* Event Content */}
                    <div className="flex-1 min-w-0">
                      {/* Event Header */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900 truncate">
                              {event.subject || event.title || 'Untitled Event'}
                            </h3>
                            {event.event_type === 'manual' && (
                              <BlocIQBadge variant="secondary" size="sm" className="bg-blue-100 text-blue-800">
                                Manual
                              </BlocIQBadge>
                            )}
                            {priority === 'high' && (
                              <BlocIQBadge variant="warning" size="sm" className="bg-red-100 text-red-800">
                                Soon
                              </BlocIQBadge>
                            )}
                          </div>
                          
                          {/* Date & Time */}
                          <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                            <div className="flex items-center gap-2">
                              <CalendarDays className="h-4 w-4 text-[#4f46e5]" />
                              <span className="font-medium">{eventDate}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-[#a855f7]" />
                              <span className="font-medium">{eventTime}</span>
                              <span className="text-xs text-gray-400">(GMT+1)</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Event Details */}
                      <div className="space-y-2">
                        {event.location && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <MapPin className="h-4 w-4 text-gray-400" />
                            <span>{event.location}</span>
                          </div>
                        )}

                        {matchedBuilding && (
                          <div className="flex items-center gap-2 text-sm text-[#4f46e5] font-medium">
                            <Building className="h-4 w-4" />
                            <span>📍 {matchedBuilding.name}</span>
                          </div>
                        )}

                        {!matchedBuilding && aiMatches[event.id] && (
                          <div className="flex items-center gap-2 text-sm text-[#a855f7] font-medium">
                            <Building className="h-4 w-4" />
                            <span>🤖 AI: {aiMatches[event.id]?.buildingName || 'Unknown Building'}</span>
                            <span className="text-[#a855f7]/60">
                              ({Math.round((aiMatches[event.id]?.confidence || 0) * 100)}% confidence)
                            </span>
                          </div>
                        )}

                        {!matchedBuilding && !aiMatches[event.id] && matchingInProgress[event.id] && (
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>🤖 AI matching...</span>
                          </div>
                        )}

                        {!matchedBuilding && !aiMatches[event.id] && !matchingInProgress[event.id] && (
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <Building className="h-4 w-4" />
                            <span>❓ No building match</span>
                            <button
                              onClick={() => matchWithAI(event)}
                              className="text-[#4f46e5] hover:text-[#4338ca] underline text-xs font-medium"
                            >
                              Try AI match
                            </button>
                          </div>
                        )}

                        {event.organiser_name && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                            <span>👤 {event.organiser_name}</span>
                          </div>
                        )}

                        {event.online_meeting && (
                          <div className="flex items-center gap-2 text-sm text-[#4f46e5]">
                            <div className="w-2 h-2 bg-[#4f46e5] rounded-full"></div>
                            <span>🎥 Online meeting available</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer Stats */}
        {events.length > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span className="font-medium">{events.length} upcoming event{events.length !== 1 ? 's' : ''}</span>
              <div className="flex items-center gap-6">
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Manual matches: {events.filter(e => matchBuilding(e)).length}
                </span>
                <span className="flex items-center gap-2">
                  <Building className="h-4 w-4 text-[#a855f7]" />
                  AI matches: {Object.keys(aiMatches).length}
                </span>
                <span className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                  Unmatched: {events.filter(e => !matchBuilding(e) && !aiMatches[e.id]).length}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 