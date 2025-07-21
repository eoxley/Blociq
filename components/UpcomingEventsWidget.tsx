"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Calendar, MapPin, Clock, Building, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Event = {
  id: string;
  subject: string;
  location: string | null;
  start_time: string;
  end_time: string;
  outlook_id: string;
  is_all_day: boolean;
  organiser_name: string | null;
  description: string | null;
  online_meeting: any | null;
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

  const loadData = async () => {
    setLoading(true);
    try {
      // Load buildings and events in parallel
      const [buildingsResponse, eventsResponse] = await Promise.all([
        supabase.from("buildings").select("id, name, address"),
        supabase
          .from("calendar_events")
          .select("*")
          .gte("start_time", new Date().toISOString())
          .order("start_time", { ascending: true })
          .limit(10)
      ]);

      setBuildings(buildingsResponse.data || []);
      setEvents(eventsResponse.data || []);
    } catch (error) {
      console.error("Error loading events widget data:", error);
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
      }
    } catch (error) {
      console.error("Error syncing calendar:", error);
    } finally {
      setSyncing(false);
    }
  };

  const matchBuilding = (event: Event): Building | null => {
    if (!event.subject && !event.location) return null;
    
    const searchText = `${event.subject || ''} ${event.location || ''}`.toLowerCase();
    
    // Try exact matches first
    const exactMatch = buildings.find((building) => 
      searchText.includes(building.name.toLowerCase())
    );
    if (exactMatch) return exactMatch;
    
    // Try partial matches (building name contains words from event)
    const eventWords = searchText.split(/\s+/).filter(word => word.length > 2);
    const partialMatch = buildings.find((building) => {
      const buildingWords = building.name.toLowerCase().split(/\s+/);
      return eventWords.some(word => 
        buildingWords.some(buildingWord => buildingWord.includes(word) || word.includes(buildingWord))
      );
    });
    
    return partialMatch || null;
  };

  const formatEventTime = (startTime: string, endTime: string, isAllDay: boolean) => {
    if (isAllDay) return "All day";
    
    const start = new Date(startTime);
    const end = new Date(endTime);
    
    const startFormatted = start.toLocaleTimeString('en-GB', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    const endFormatted = end.toLocaleTimeString('en-GB', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    
    return `${startFormatted} - ${endFormatted}`;
  };

  const formatEventDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) {
      return "Today";
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return "Tomorrow";
    } else {
      return date.toLocaleDateString('en-GB', { 
        weekday: 'short', 
        day: 'numeric', 
        month: 'short' 
      });
    }
  };

  const getEventPriority = (event: Event) => {
    const startTime = new Date(event.start_time);
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
          <Calendar className="h-5 w-5 text-blue-600" />
          Upcoming Events
        </h2>
        <Button
          onClick={syncCalendar}
          disabled={syncing}
          variant="outline"
          size="sm"
          className="text-blue-600 border-blue-200 hover:bg-blue-50"
        >
          {syncing ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          {syncing ? 'Syncing...' : 'Sync'}
        </Button>
      </div>

      {events.length === 0 ? (
        <div className="text-center py-8">
          <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500 text-sm mb-2">No upcoming events found</p>
          <p className="text-gray-400 text-xs">Sync your Outlook calendar to see events here</p>
          <Button
            onClick={syncCalendar}
            disabled={syncing}
            className="mt-4 bg-blue-600 hover:bg-blue-700 text-white"
          >
            {syncing ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Calendar className="h-4 w-4 mr-2" />
            )}
            {syncing ? 'Syncing...' : 'Sync Calendar'}
          </Button>
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
                  priority === 'high' 
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
                        {event.subject}
                      </h3>
                      {priority === 'high' && (
                        <span className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded-full">
                          Soon
                        </span>
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
            <span>Building matching: {events.filter(e => matchBuilding(e)).length}/{events.length}</span>
          </div>
        </div>
      )}
    </div>
  );
} 