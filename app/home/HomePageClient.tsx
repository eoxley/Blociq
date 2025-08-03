'use client'

// Home page client component - Major works dashboard removed for cleaner interface
import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { Calendar, Plus, X, Building, Clock, AlertCircle, CheckCircle, Loader2, ExternalLink, RefreshCw, MessageCircle, Sparkles, Upload, FileText, Send, Bot } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import DailySummary from '@/components/DailySummary'
import AskBlocIQHomepage from '@/components/AskBlocIQHomepage'

import BreadcrumbNavigation from '@/components/BreadcrumbNavigation'
import { BlocIQButton } from '@/components/ui/blociq-button'
import { BlocIQCard, BlocIQCardContent, BlocIQCardHeader } from '@/components/ui/blociq-card'
import { BlocIQBadge } from '@/components/ui/blociq-badge'
import BlocIQLogo from '@/components/BlocIQLogo'
import { toast } from 'sonner'
import { checkOutlookConnection, fetchOutlookEvents, getOutlookAuthUrl } from '@/lib/outlookUtils'
import { getTimeBasedGreeting } from '@/utils/greeting'

type PropertyEvent = {
  building: string
  date: string
  title: string
  category: string
  source?: 'property' | 'outlook'
  event_type?: 'outlook' | 'manual'
  location?: string | null
  organiser_name?: string | null
  online_meeting?: any | null
}

type Building = {
  id: number
  name: string
}

type CalendarEvent = {
  id: string
  outlook_id: string
  subject: string
  description: string
  location: string | null
  start_time: string
  end_time: string
  is_all_day: boolean
  organiser: string | null
  organiser_name: string | null
  attendees: any[]
  importance: string
  show_as: string
  categories: string[]
  web_link: string | null
  online_meeting: any | null
}

type UserData = {
  name: string
  email: string
}

type Email = {
  id: string
  subject: string
  from_email: string
  body_preview: string
  received_at: string
  handled: boolean
  unread: boolean
  flag_status: string
  categories: string[]
}

interface HomePageClientProps {
  userData: UserData
}

export default function HomePageClient({ userData }: HomePageClientProps) {
  const [isAddingEvent, setIsAddingEvent] = useState(false)
  const [showAddEventForm, setShowAddEventForm] = useState(false)
  const [recentEmails, setRecentEmails] = useState<Email[]>([])
  const [loadingEmails, setLoadingEmails] = useState(true)

  // Dynamic welcome messages - rotating pool of positive, motivational, humorous, and informative messages
  const welcomeMessages = [
    // 🔁 Motivational Messages
    "You've already survived worse than a passive-aggressive leaseholder. Keep going.",
    "Coffee in one hand, compliance in the other — classic BlocIQ move.",
    "You're the reason building meetings *almost* run on time.",
    "You've dodged Section 20 bullets all week — gold star ⭐",
    "Risk assessed. Stress suppressed.",
    "Your building doesn't need a hero. It has you.",
    "You know the alarm panel code. You *are* the alarm panel code.",
    "Property managers don't crack under pressure. They schedule it.",
    "There's calm in your chaos. BlocIQ just makes it prettier.",
    "That building doesn't run on vibes — it runs on your last 14 emails.",

    // 😅 Humorous Management Quotes
    "Today's forecast: 80% chance of leaseholder emails before lunch.",
    "Another invoice, another mystery charge to decode. You've trained for this.",
    "Your building's compliance status: 'It's complicated' (but you're handling it).",
    "You've mastered the art of explaining service charges without causing riots.",
    "Your superpower: Making building regulations sound exciting.",
    "You're not just managing properties — you're managing expectations.",
    "Today's goal: Keep the building standing and the leaseholders happy.",
    "You've got this. The building's got this. BlocIQ's got this.",
    "Your building's maintenance schedule: 'When it breaks' (but you're working on it).",
    "You're the reason the building doesn't have a 'Days Since Last Incident' counter.",

    // 💡 Informative & Professional
    "Your portfolio compliance score is looking sharp today.",
    "All systems operational. All leaseholders accounted for.",
    "Your building's safety protocols are up to date and ready.",
    "Today's agenda: Excellence in property management.",
    "Your attention to detail is what keeps buildings running smoothly.",
    "You're not just managing properties — you're building communities.",
    "Your proactive approach to maintenance saves time and money.",
    "Today's focus: Delivering exceptional property management services.",
    "Your building's compliance status: Green across the board.",
    "You're the backbone of successful property management.",

    // 🌟 Encouraging & Positive
    "Today's the day to make your buildings shine.",
    "You're not just managing properties — you're creating value.",
    "Your dedication to excellence shows in every detail.",
    "Today's opportunities: Endless. Your potential: Unlimited.",
    "You're the reason buildings feel like homes.",
    "Your expertise makes the complex simple.",
    "Today's mission: Property management excellence.",
    "You're building more than properties — you're building trust.",
    "Your attention to detail sets the standard.",
    "Today's goal: Making property management look easy."
  ]

  const [currentWelcomeMessage, setCurrentWelcomeMessage] = useState(welcomeMessages[0])

  // Rotate welcome messages every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentWelcomeMessage(welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)])
    }, 30000)

    return () => clearInterval(interval)
  }, [welcomeMessages])

  // Real upcoming events from database
  const [upcomingEvents, setUpcomingEvents] = useState<PropertyEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [buildings, setBuildings] = useState<Building[]>([]);
  
  // Outlook integration
  const [outlookConnected, setOutlookConnected] = useState(false);
  const [outlookEmail, setOutlookEmail] = useState<string | null>(null);
  const [loadingOutlook, setLoadingOutlook] = useState(false);
  const [syncingOutlook, setSyncingOutlook] = useState(false);

  // Fetch buildings for event form
  useEffect(() => {
    const fetchBuildings = async () => {
      try {
        const { data: buildingsData, error } = await supabase
          .from('buildings')
          .select('id, name')
          .order('name');

        if (error) {
          console.error('Error fetching buildings:', error);
        } else {
          setBuildings(buildingsData || []);
        }
      } catch (error) {
        console.error('Error fetching buildings:', error);
      }
    };

    fetchBuildings();
  }, []);

    // Fetch real property events from database
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const { data: events, error } = await supabase
          .from('property_events')
          .select('*')
          .gte('start_time', new Date().toISOString())
          .order('start_time', { ascending: true })
          .limit(5);

        if (error) {
          console.error('Error fetching events:', error);
          setUpcomingEvents([]);
        } else {
          // Transform database events to match PropertyEvent type and filter out past events
          const transformedEvents: PropertyEvent[] = (events || [])
            .filter(event => {
              const eventDate = new Date(event.start_time);
              const now = new Date();
              return eventDate >= now; // Only include future events
            })
            .map(event => {
              // Find building name from buildings array
              const building = buildings.find(b => b.id === event.building_id);
              return {
                building: building ? building.name : 'General',
                date: event.start_time,
                title: event.title,
                category: event.category || event.event_type || '📅 Event',
                source: 'property',
                event_type: 'manual'
              };
            });
          setUpcomingEvents(transformedEvents);
        }
      } catch (error) {
        console.error('Error fetching events:', error);
        setUpcomingEvents([]);
      } finally {
        setLoadingEvents(false);
      }
    };

    fetchEvents();
  }, [supabase, buildings]); // Add buildings as dependency

  // Check Outlook connection status
  useEffect(() => {
    const checkOutlook = async () => {
      try {
        const status = await checkOutlookConnection();
        setOutlookConnected(status.connected);
        setOutlookEmail(status.email || null);
      } catch (error) {
        console.error('Error checking Outlook connection:', error);
        setOutlookConnected(false);
      }
    };

    checkOutlook();
  }, []);

  // Fetch Outlook events if connected
  useEffect(() => {
    const loadOutlookEvents = async () => {
      if (!outlookConnected) return;

      setLoadingOutlook(true);
      try {
        const outlookEvents = await fetchOutlookEvents();
        
        // Transform Outlook events to match PropertyEvent type
        const transformedOutlookEvents: PropertyEvent[] = outlookEvents.map((event: any) => ({
          building: 'Outlook Calendar',
          date: event.start_time,
          title: event.title || event.subject || 'Untitled Event',
          category: event.categories?.join(', ') || '📅 Outlook Event',
          source: 'outlook',
          event_type: 'outlook',
          location: event.location,
          organiser_name: event.organiser_name,
          online_meeting: event.online_meeting
        }));

        // Combine with existing property events, filter out past events, and sort by date
        setUpcomingEvents(prev => {
          const now = new Date();
          const propertyEvents = prev.filter(event => event.source === 'property');
          const futureOutlookEvents = transformedOutlookEvents.filter(event => {
            const eventDate = new Date(event.date);
            return eventDate >= now; // Only include future events
          });
          
          const combined = [...propertyEvents, ...futureOutlookEvents];
          const sorted = combined.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
          
          // Limit to 5 items total
          return sorted.slice(0, 5);
        });

      } catch (error) {
        console.error('Error fetching Outlook events:', error);
        // Don't show error toast for Outlook connection issues - just log it
        // This prevents spam when Outlook is not connected
        if (error instanceof Error && error.message.includes('Please reconnect')) {
          console.log('Outlook not connected - skipping events fetch');
        } else {
          toast.error('Failed to load Outlook events');
        }
      } finally {
        setLoadingOutlook(false);
      }
    };

    loadOutlookEvents();
  }, [outlookConnected]);

  // Fetch recent emails
  useEffect(() => {
    const fetchEmails = async () => {
      try {
        const { data: emails, error } = await supabase
          .from('incoming_emails')
          .select('*')
          .order('received_at', { ascending: false })
          .limit(5);

        if (error) {
          console.error('Error fetching emails:', error);
          setRecentEmails([]);
        } else {
          const transformedEmails: Email[] = (emails || []).map(email => ({
            id: email.id,
            subject: email.subject,
            from_email: email.from_email,
            body_preview: email.body_preview,
            received_at: email.received_at,
            handled: email.is_handled || false,
            unread: !email.is_read,
            flag_status: email.flag_status || 'none',
            categories: email.categories || []
          }));
          setRecentEmails(transformedEmails);
        }
      } catch (error) {
        console.error('Error fetching emails:', error);
        setRecentEmails([]);
      } finally {
        setLoadingEmails(false);
      }
    };

    fetchEmails();
  }, [supabase]);

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsAddingEvent(true)
    
    try {
      const formData = new FormData(e.target as HTMLFormElement)
      const eventData = {
        title: formData.get('title') as string,
        date: formData.get('date') as string,
        building: formData.get('building') as string,
        description: formData.get('description') as string,
      }

      console.log('Adding event:', eventData)

      const response = await fetch('/api/create-event', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventData),
      })

      const result = await response.json()

      if (response.ok && result.success) {
        toast.success('Event created successfully!')
        // Reset form and hide it
        ;(e.target as HTMLFormElement).reset()
        setShowAddEventForm(false)
        // Refresh events list
        const { data: events, error } = await supabase
          .from('property_events')
          .select('*')
          .gte('start_time', new Date().toISOString())
          .order('start_time', { ascending: true })
          .limit(5);

        if (!error && events) {
          // Transform database events to match PropertyEvent type and filter out past events
          const now = new Date();
          const transformedEvents: PropertyEvent[] = (events || [])
            .filter(event => {
              const eventDate = new Date(event.start_time);
              return eventDate >= now; // Only include future events
            })
            .map(event => {
              // Find building name from buildings array
              const building = buildings.find(b => b.id === event.building_id);
              return {
                building: building ? building.name : 'General',
                date: event.start_time,
                title: event.title,
                category: event.category || event.event_type || '📅 Event',
                source: 'property',
                event_type: 'manual'
              };
            });
          setUpcomingEvents(transformedEvents);
        }
      } else {
        toast.error(result.error || 'Failed to create event')
      }
    } catch (error) {
      console.error('Error creating event:', error)
      toast.error('Failed to create event')
    } finally {
      setIsAddingEvent(false)
    }
  }

  const formatEventDate = (dateString: string) => {
    if (!dateString) {
      return {
        date: 'Unknown Date',
        time: 'Unknown Time'
      }
    }
    
    const date = new Date(dateString)
    if (isNaN(date.getTime())) {
      return {
        date: 'Invalid Date',
        time: 'Invalid Time'
      }
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
      })
    }
  }

  const handleConnectOutlook = () => {
    try {
      const authUrl = getOutlookAuthUrl();
      window.location.href = authUrl;
    } catch (error) {
      console.error('Error getting Outlook auth URL:', error);
      toast.error('Failed to connect Outlook. Please try again.');
    }
  };

  const handleSyncOutlook = async () => {
    setSyncingOutlook(true);
    try {
      const outlookEvents = await fetchOutlookEvents();
      
      // Transform Outlook events to match PropertyEvent type
      const transformedOutlookEvents: PropertyEvent[] = outlookEvents.map((event: any) => ({
        building: 'Outlook Calendar',
        date: event.start_time,
        title: event.title || event.subject || 'Untitled Event',
        category: event.categories?.join(', ') || '📅 Outlook Event',
        source: 'outlook',
        event_type: 'outlook',
        location: event.location,
        organiser_name: event.organiser_name,
        online_meeting: event.online_meeting
      }));

      // Replace existing Outlook events with new ones, filter out past events
      setUpcomingEvents(prev => {
        const now = new Date();
        const propertyEvents = prev.filter(event => event.source === 'property');
        const futureOutlookEvents = transformedOutlookEvents.filter(event => {
          const eventDate = new Date(event.date);
          return eventDate >= now; // Only include future events
        });
        
        const combined = [...propertyEvents, ...futureOutlookEvents];
        const sorted = combined.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        // Limit to 5 items total
        return sorted.slice(0, 5);
      });

      toast.success('Outlook calendar synced successfully!');
    } catch (error) {
      console.error('Error syncing Outlook:', error);
      toast.error('Failed to sync Outlook calendar');
    } finally {
      setSyncingOutlook(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Enhanced Hero Banner - BlocIQ Landing Page Style */}
      <section className="relative overflow-hidden bg-gradient-to-r from-[#4f46e5] to-[#a855f7] py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center">
            <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-2xl">
              <BlocIQLogo className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
              {getTimeBasedGreeting(userData.name)}
            </h1>
            <p className="text-xl text-white/90 max-w-3xl mx-auto leading-relaxed">
              {currentWelcomeMessage}
            </p>
          </div>
        </div>
        
        {/* Decorative Elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-10 left-10 w-32 h-32 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-1/4 w-24 h-24 bg-white/5 rounded-full blur-2xl"></div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-6 py-12 space-y-8">
        {/* MAIN GRID - Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* PROPERTY EVENTS WIDGET - Enhanced */}
          <div className="bg-white rounded-2xl shadow-lg border-0 overflow-hidden">
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
            
            <div className="p-6">
              <div className="space-y-4">
                {/* Add Event Button */}
                {!showAddEventForm && (
                  <div className="text-center">
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
                          <label className="block text-sm font-medium text-gray-700 mb-1">Date & Time</label>
                          <input
                            type="datetime-local"
                            name="date"
                            required
                            min={new Date().toISOString().slice(0, 16)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4f46e5] focus:border-transparent"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Building (Optional)</label>
                        <select
                          name="building"
                          className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4f46e5] focus:border-transparent"
                        >
                          <option value="">Select a building</option>
                          {buildings.map(building => (
                            <option key={building.id} value={building.name}>{building.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
                        <textarea
                          name="description"
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4f46e5] focus:border-transparent"
                          placeholder="Enter event description"
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setShowAddEventForm(false)}
                          disabled={isAddingEvent}
                          className="px-4 py-2 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={isAddingEvent}
                          className="bg-gradient-to-r from-[#4f46e5] to-[#a855f7] hover:brightness-110 text-white px-4 py-2 rounded-xl font-medium shadow-lg transition-all duration-200"
                        >
                          {isAddingEvent ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              Adding...
                            </>
                          ) : (
                            <>
                              <Plus className="h-4 w-4 mr-2" />
                              Add Event
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Events List */}
                {(loadingEvents || (outlookConnected && loadingOutlook)) ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4f46e5] mx-auto mb-2"></div>
                    <p className="text-gray-600 text-sm">
                      {loadingEvents ? 'Loading events...' : 'Loading Outlook events...'}
                    </p>
                  </div>
                ) : upcomingEvents.length > 0 ? (
                  <div className="space-y-3">
                    {upcomingEvents.map((event, index) => {
                      const { date, time } = formatEventDate(event.date)
                      const eventDate = new Date(event.date)
                      const isToday = !isNaN(eventDate.getTime()) && eventDate.toDateString() === new Date().toDateString()
                      const isTomorrow = !isNaN(eventDate.getTime()) && eventDate.toDateString() === new Date(Date.now() + 24 * 60 * 60 * 1000).toDateString()
                      const isOutlookEvent = event.source === 'outlook'
                      
                      return (
                        <div 
                          key={`${event.source}-${index}`} 
                          className={`rounded-xl p-4 hover:shadow-lg text-sm border-l-4 transition-all duration-200 ${
                            isOutlookEvent 
                              ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-400' 
                              : 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-400'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <div className="font-bold text-gray-900">
                                  {event.title || 'Untitled Event'}
                                </div>
                                {isOutlookEvent && (
                                  <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs">
                                    Outlook
                                  </span>
                                )}
                                {(isToday || isTomorrow) && (
                                  <span className={`px-2 py-1 rounded-full text-xs ${
                                    isToday 
                                      ? 'bg-red-100 text-red-700' 
                                      : 'bg-yellow-100 text-yellow-700'
                                  }`}>
                                    {isToday ? 'Today' : 'Tomorrow'}
                                  </span>
                                )}
                              </div>
                              {event.category && (
                                <div className="text-gray-600 mb-1">
                                  📋 {event.category}
                                </div>
                              )}
                              <div className="text-gray-600 mb-1">
                                📍 {event.building || 'General'}
                              </div>
                              {event.location && (
                                <div className="text-gray-600 mb-1">
                                  🏢 {event.location}
                                </div>
                              )}
                              {event.organiser_name && (
                                <div className="text-gray-600 mb-1">
                                  👤 {event.organiser_name}
                                </div>
                              )}
                              {event.online_meeting && (
                                <div className="text-blue-600 mb-1">
                                  🎥 Online meeting available
                                </div>
                              )}
                              <div className="text-gray-600">
                                🕒 {date} at {time}
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
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

          {/* ASK BLOCIQ WIDGET - Enhanced */}
          <div className="bg-white rounded-2xl shadow-lg border-0 overflow-hidden">
            <div className="bg-gradient-to-r from-[#4f46e5] to-[#a855f7] p-6 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                    <Bot className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Ask BlocIQ</h2>
                    <p className="text-sm text-white/80">AI-powered assistant</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full">
                  <Sparkles className="h-3 w-3" />
                  <span>AI Assistant</span>
                </div>
              </div>
            </div>
            
            <div className="p-6">
              <div className="space-y-4">
                {/* AI Tips */}
                <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-4 border border-purple-200">
                  <div className="flex items-start gap-2">
                    <Sparkles className="h-4 w-4 text-purple-600 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-gray-900 mb-1">💡 Try asking:</p>
                      <p className="text-gray-600">"When is the next EICR inspection?" or "What's the service charge for Flat 3?"</p>
                    </div>
                  </div>
                </div>

                {/* Chat Interface */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Ask BlocIQ anything..."
                      className="flex-1 border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#4f46e5] focus:border-transparent"
                    />
                    <button className="bg-gradient-to-r from-[#4f46e5] to-[#a855f7] hover:brightness-110 p-3 rounded-xl text-white shadow-lg transition-all duration-200">
                      <Send className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* File Upload Area */}
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-[#4f46e5] transition-colors">
                  <div className="w-12 h-12 bg-gradient-to-r from-gray-100 to-gray-200 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <Upload className="h-6 w-6 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-600 mb-1">
                    Drag & drop files here or <span className="text-[#4f46e5] underline cursor-pointer">click to upload</span>
                  </p>
                  <p className="text-xs text-gray-500">
                    Supports PDF, DOCX, TXT • Max 10MB • Up to 5 files
                  </p>
                </div>

                                 {/* AI Assistant Component */}
                 <div className="mt-4">
                   <AskBlocIQHomepage />
                 </div>
              </div>
            </div>
          </div>
        </div>

        {/* Daily Summary Section */}
        <DailySummary />
      </div>
    </div>
  )
} 