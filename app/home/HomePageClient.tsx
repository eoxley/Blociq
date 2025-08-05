"use client";

import { useState, useEffect } from 'react';
import { Calendar, Plus, X, Loader2, RefreshCw, ExternalLink, CheckCircle } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import BuildingTodoList from '@/components/BuildingTodoList';
import BreadcrumbNavigation from '@/components/BreadcrumbNavigation';
import { BlocIQButton } from '@/components/ui/blociq-button';
import { BlocIQCard, BlocIQCardContent, BlocIQCardHeader } from '@/components/ui/blociq-card';
import { BlocIQBadge } from '@/components/ui/blociq-badge';
import BlocIQLogo from '@/components/BlocIQLogo';
import { checkOutlookConnection, fetchOutlookEvents, getOutlookAuthUrl } from '@/lib/outlookUtils';
import { getTimeBasedGreeting } from '@/utils/greeting';
import CommunicationModal from '@/components/CommunicationModal';

type PropertyEvent = {
  building: string;
  date: string;
  title: string;
  category: string;
  source?: 'property' | 'outlook';
  event_type?: 'outlook' | 'manual';
  location?: string | null;
  organiser_name?: string | null;
  online_meeting?: any | null;
};

type Building = {
  id: number;
  name: string;
};

type CalendarEvent = {
  id: string;
  outlook_id: string;
  subject: string;
  description: string;
  location: string | null;
  start_time: string;
  end_time: string;
  is_all_day: boolean;
  organiser: string | null;
  organiser_name: string | null;
  attendees: any[];
  importance: string;
  show_as: string;
  categories: string[];
  web_link: string | null;
  online_meeting: any | null;
};

type UserData = {
  name: string;
  email: string;
};

type Email = {
  id: string;
  subject: string;
  from_email: string;
  body_preview: string;
  received_at: string;
  handled: boolean;
  unread: boolean;
  flag_status: string;
  categories: string[];
};

interface HomePageClientProps {
  userData: UserData;
}

export default function HomePageClient({ userData }: HomePageClientProps) {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [events, setEvents] = useState<PropertyEvent[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<PropertyEvent[]>([]);
  const [outlookEvents, setOutlookEvents] = useState<CalendarEvent[]>([]);
  const [outlookConnected, setOutlookConnected] = useState(false);
  const [syncingOutlook, setSyncingOutlook] = useState(false);
  const [showAddEventForm, setShowAddEventForm] = useState(false);
  const [emails, setEmails] = useState<Email[]>([]);
  const [todosEmpty, setTodosEmpty] = useState(false);
  const [showCommunicationModal, setShowCommunicationModal] = useState(false);
  const [communicationModalData, setCommunicationModalData] = useState<any>(null);

  // Welcome message state
  const [welcomeMessage, setWelcomeMessage] = useState('');

  // Dynamic welcome messages
  const welcomeMessages = [
    "Ready to tackle today's property challenges?",
    "Your properties are in good hands today!",
    "Let's make today productive for your buildings!",
    "Time to check in on your properties!",
    "Your buildings are waiting for your attention!"
  ];

  // Rotate welcome messages
  useEffect(() => {
    const interval = setInterval(() => {
      const randomMessage = welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)];
      setWelcomeMessage(randomMessage);
    }, 10000);

    setWelcomeMessage(welcomeMessages[0]);
    return () => clearInterval(interval);
  }, []);

  // Fetch data on mount
  useEffect(() => {
    fetchBuildings();
    fetchEvents();
    checkOutlook();
    fetchEmails();
  }, []);

  const fetchBuildings = async () => {
    try {
      const { data, error } = await supabase
        .from('buildings')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setBuildings(data || []);
    } catch (error) {
      console.error('Error fetching buildings:', error);
    }
  };

  const fetchEvents = async () => {
    try {
      // Fetch from both property_events and manual_events tables
      const [propertyEventsResult, manualEventsResult] = await Promise.all([
        supabase.from('property_events').select('*').order('date', { ascending: true }),
        supabase.from('manual_events').select('*').order('date', { ascending: true })
      ]);

      let allEvents: PropertyEvent[] = [];

      // Handle property events
      if (propertyEventsResult.data) {
        const propertyEvents = propertyEventsResult.data.map((event: any) => ({
          building: event.building_name || 'Unknown Building',
          date: event.date,
          title: event.title || 'Untitled Event',
          category: event.category || 'General',
          source: 'property' as const,
          event_type: 'manual' as const,
          location: event.location,
          organiser_name: event.organiser_name
        }));
        allEvents = [...allEvents, ...propertyEvents];
      }

      // Handle manual events
      if (manualEventsResult.data) {
        const manualEvents = manualEventsResult.data.map((event: any) => ({
          building: event.building_name || 'Unknown Building',
          date: event.date,
          title: event.title || 'Untitled Event',
          category: event.category || 'General',
          source: 'property' as const,
          event_type: 'manual' as const,
          location: event.location,
          organiser_name: event.organiser_name
        }));
        allEvents = [...allEvents, ...manualEvents];
      }

      // Combine and sort all events
      const sortedEvents = allEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      setEvents(sortedEvents);
      setUpcomingEvents(sortedEvents.slice(0, 5));
    } catch (error) {
      console.error('Error fetching events:', error);
      setEvents([]);
      setUpcomingEvents([]);
    }
  };

  const checkOutlook = async () => {
    try {
      const isConnected = await checkOutlookConnection();
      setOutlookConnected(isConnected);
      if (isConnected) {
        await loadOutlookEvents();
      }
    } catch (error) {
      console.error('Error checking Outlook connection:', error);
    }
  };

  const loadOutlookEvents = async () => {
    try {
      const outlookEvents = await fetchOutlookEvents();
      
      // Transform Outlook events to match PropertyEvent type
      const transformedEvents = outlookEvents.map((event: CalendarEvent) => ({
        building: 'Outlook Calendar',
        date: event.start_time,
        title: event.subject,
        category: event.categories?.[0] || 'Calendar',
        source: 'outlook' as const,
        event_type: 'outlook' as const,
        location: event.location,
        organiser_name: event.organiser_name,
        online_meeting: event.online_meeting
      }));

      // Replace existing Outlook events with new ones, filter out past events
      const now = new Date();
      const futureEvents = transformedEvents.filter(event => {
        const eventDate = new Date(event.date);
        return eventDate >= now;
      });

      setOutlookEvents(futureEvents.slice(0, 5));
    } catch (error) {
      console.error('Error loading Outlook events:', error);
    }
  };

  const fetchEmails = async () => {
    try {
      const { data, error } = await supabase
        .from('incoming_emails')
        .select('*')
        .order('received_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setEmails(data || []);
    } catch (error) {
      console.error('Error fetching emails:', error);
    }
  };

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    
    try {
      const eventData = {
        title: formData.get('title') as string,
        building_name: formData.get('building') as string,
        date: formData.get('date') as string,
        category: formData.get('category') as string,
        location: formData.get('location') as string,
        organiser_name: formData.get('organiser') as string
      };

      const response = await fetch('/api/events/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData)
      });

      if (!response.ok) throw new Error('Failed to create event');

      toast.success('Event created successfully!');
      setShowAddEventForm(false);
      fetchEvents();
    } catch (error) {
      console.error('Error creating event:', error);
      toast.error('Failed to create event');
    }
  };

  const formatEventDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleConnectOutlook = () => {
    const authUrl = getOutlookAuthUrl();
    window.location.href = authUrl;
  };

  const handleSyncOutlook = async () => {
    setSyncingOutlook(true);
    try {
      await loadOutlookEvents();
      toast.success('Outlook calendar synced!');
    } catch (error) {
      console.error('Error syncing Outlook:', error);
      toast.error('Failed to sync Outlook calendar');
    } finally {
      setSyncingOutlook(false);
    }
  };

  const handleSaveTemplate = async (template: any) => {
    try {
      const { data, error } = await supabase
        .from('communication_templates')
        .insert(template)
        .select()
        .single();

      if (error) throw error;

      toast.success(`${template.template_type.charAt(0).toUpperCase() + template.template_type.slice(1)} template saved!`);
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error('Failed to save template');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <BlocIQLogo className="h-16 w-auto" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            {getTimeBasedGreeting()}, {userData.name}!
          </h1>
          <p className="text-xl text-gray-600 mb-8">{welcomeMessage}</p>
        </div>

        {/* Today's Tasks Section */}
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Today's Tasks</h2>
            <p className="text-gray-600">Manage your property events and building tasks</p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[600px]">
            {/* Property Events Widget */}
            <div className="h-full">
              <div className="bg-white rounded-2xl shadow-lg border-0 overflow-hidden h-full flex flex-col">
                <div className="bg-gradient-to-r from-[#4f46e5] to-[#a855f7] p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                        <Calendar className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold">Property Events</h2>
                        <p className="text-sm text-white/80">Manage your property events</p>
                      </div>
                    </div>
                    
                    {/* Outlook Integration Status */}
                    <div className="flex items-center gap-2">
                      {outlookConnected ? (
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1 text-xs bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full">
                            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                            <span>Outlook Connected</span>
                          </div>
                          <button
                            onClick={handleSyncOutlook}
                            disabled={syncingOutlook}
                            className="bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white px-3 py-1 rounded-full text-xs transition-all duration-200"
                          >
                            {syncingOutlook ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <RefreshCw className="h-3 w-3" />
                            )}
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={handleConnectOutlook}
                          className="bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white px-3 py-1 rounded-full text-xs transition-all duration-200"
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          Connect Outlook
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="p-6 flex-1 overflow-y-auto">
                  {/* Add Event Button */}
                  {!showAddEventForm && (
                    <div className="text-center mb-6">
                      <button
                        onClick={() => setShowAddEventForm(true)}
                        className="bg-gradient-to-r from-[#4f46e5] to-[#a855f7] hover:brightness-110 text-white px-6 py-3 rounded-xl font-medium shadow-lg transition-all duration-200"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add New Event
                      </button>
                    </div>
                  )}

                  {/* Manual Event Input Form */}
                  {showAddEventForm && (
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-gray-900">Add New Event</h3>
                        <button
                          type="button"
                          onClick={() => setShowAddEventForm(false)}
                          className="text-gray-500 hover:text-gray-700 transition-colors"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>
                      <form onSubmit={handleAddEvent} className="space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Event Title</label>
                            <input
                              type="text"
                              name="title"
                              required
                              className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4f46e5] focus:border-transparent"
                              placeholder="Enter event title"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Building</label>
                            <select
                              name="building"
                              required
                              className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4f46e5] focus:border-transparent"
                            >
                              <option value="">Select a building</option>
                              {buildings.map((building) => (
                                <option key={building.id} value={building.name}>
                                  {building.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Date & Time</label>
                            <input
                              type="datetime-local"
                              name="date"
                              required
                              className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4f46e5] focus:border-transparent"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                            <select
                              name="category"
                              required
                              className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4f46e5] focus:border-transparent"
                            >
                              <option value="">Select category</option>
                              <option value="Inspection">Inspection</option>
                              <option value="Maintenance">Maintenance</option>
                              <option value="Meeting">Meeting</option>
                              <option value="Visit">Visit</option>
                              <option value="Other">Other</option>
                            </select>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                            <input
                              type="text"
                              name="location"
                              className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4f46e5] focus:border-transparent"
                              placeholder="Enter location"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Organiser</label>
                            <input
                              type="text"
                              name="organiser"
                              className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4f46e5] focus:border-transparent"
                              placeholder="Enter organiser name"
                            />
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <button
                            type="submit"
                            className="flex-1 bg-gradient-to-r from-[#4f46e5] to-[#a855f7] hover:brightness-110 text-white px-6 py-3 rounded-xl font-medium shadow-lg transition-all duration-200"
                          >
                            Create Event
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowAddEventForm(false)}
                            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-all duration-200"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  {/* Events List */}
                  {events.length > 0 ? (
                    <div className="space-y-3">
                      {events.slice(0, 5).map((event, index) => (
                        <div key={index} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="font-semibold text-gray-900">{event.title}</h3>
                                {event.source === 'outlook' && (
                                  <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full">
                                    Outlook
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-600 mb-1">{event.building}</p>
                              <p className="text-sm text-gray-500">{formatEventDate(event.date)}</p>
                              {event.location && (
                                <p className="text-sm text-gray-500">📍 {event.location}</p>
                              )}
                              {event.organiser_name && (
                                <p className="text-sm text-gray-500">👤 {event.organiser_name}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                              {event.category && (
                                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                  {event.category}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-gradient-to-r from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Calendar className="h-8 w-8 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">No events yet</h3>
                      <p className="text-gray-500 mb-4 max-w-sm mx-auto">
                        {outlookConnected 
                          ? 'Add property events or sync your Outlook calendar to get started.'
                          : 'Add property events or connect your Outlook calendar to get started.'
                        }
                      </p>
                      {!outlookConnected && (
                        <button
                          onClick={handleConnectOutlook}
                          className="bg-gradient-to-r from-[#4f46e5] to-[#a855f7] hover:brightness-110 text-white px-4 py-2 rounded-xl font-medium shadow-lg transition-all duration-200"
                        >
                          <ExternalLink className="h-3 w-3 mr-2" />
                          Connect Outlook Calendar
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Building To-Do Widget */}
            <div className="h-full">
              {todosEmpty ? (
                <div className="text-center py-8 flex-1 flex items-center justify-center">
                  <div className="w-16 h-16 bg-gradient-to-r from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">All caught up!</h3>
                </div>
              ) : (
                <BuildingTodoList 
                  maxItems={5} 
                  showBuildingName={true} 
                  className="h-full" 
                  onEmptyState={setTodosEmpty}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 