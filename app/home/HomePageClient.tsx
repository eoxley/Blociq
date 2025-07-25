'use client'

// Home page client component - Major works dashboard removed for cleaner interface
import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { Calendar, Plus, X, Building, Clock, AlertCircle, CheckCircle, Loader2 } from 'lucide-react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import DailySummary from '@/components/DailySummary'
import AskBlocIQHomepage from '@/components/AskBlocIQHomepage'

import BreadcrumbNavigation from '@/components/BreadcrumbNavigation'
import { BlocIQButton } from '@/components/ui/blociq-button'
import { BlocIQCard, BlocIQCardContent, BlocIQCardHeader } from '@/components/ui/blociq-card'
import { BlocIQBadge } from '@/components/ui/blociq-badge'
import BlocIQLogo from '@/components/BlocIQLogo'
import { toast } from 'sonner'

type PropertyEvent = {
  building: string
  date: string
  title: string
  category: string
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
  const supabase = createClientComponentClient()



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
    "Yes, you still remember the gate code from six buildings ago. 🧠",
    "You've explained 'communal areas' three times this week. That's law now.",
    "Someone's going to mention 'right to manage' today — take a breath.",
    "Your service charge breakdowns are more accurate than the Met Office.",
    "If someone says 'I pay your salary' — congrats, you're in mid-season form.",

    // 🤓 "Did You Know?" Facts
    "Did you know? The world's tallest residential building is over 1,500 feet high.",
    "Did you know? UK property law dates back over 800 years — and still confuses everyone.",
    "Did you know? Pigeons can identify themselves in mirrors. Some residents can't.",
    "Did you know? London has over 70 fire stations — and you've probably emailed half of them.",
    "Did you know? The first lease ever recorded in England was in 1066. Still no communal cleaning.",
    "Did you know? The average person spends 87% of their time indoors — that includes your inbox.",
    "Did you know? Ancient Romans had property managers. They were called *curatores domus*.",
    "Did you know? More than 20% of UK homes are flats — and every single one comes with questions.",

    // 🧠 Bonus inspiration
    "Order, calm, and coffee. You're 2 out of 3 already.",
    "Excellence is quiet. So is successful block management.",
    "You don't need to chase perfection — just service charge reconciliation.",
    "Trust the process. And the fire alarm service provider (mostly).",
    "One task at a time. One leaseholder at a time. BlocIQ's got your back."
  ]

  // Get random welcome message once on component mount
  const [currentWelcomeMessage] = useState(() => {
    const randomIndex = Math.floor(Math.random() * welcomeMessages.length)
    return welcomeMessages[randomIndex]
  })

  // Real upcoming events from database
  const [upcomingEvents, setUpcomingEvents] = useState<PropertyEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [buildings, setBuildings] = useState<Building[]>([]);

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
  }, [supabase]);

  // Fetch real property events from database
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const { data: events, error } = await supabase
          .from('property_events')
          .select('*')
          .gte('start_time', new Date().toISOString())
          .order('start_time', { ascending: true })
          .limit(10);

        if (error) {
          console.error('Error fetching events:', error);
          setUpcomingEvents([]);
        } else {
          // Transform database events to match PropertyEvent type
          const transformedEvents: PropertyEvent[] = (events || []).map(event => {
            // Find building name from buildings array
            const building = buildings.find(b => b.id === event.building_id);
            return {
              building: building ? building.name : 'General',
              date: event.start_time,
              title: event.title,
              category: event.category || event.event_type || '📅 Event'
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
            handled: email.handled || false,
            unread: !email.unread,
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
          .limit(10);

        if (!error && events) {
          // Transform database events to match PropertyEvent type
          const transformedEvents: PropertyEvent[] = (events || []).map(event => {
            // Find building name from buildings array
            const building = buildings.find(b => b.id === event.building_id);
            return {
              building: building ? building.name : 'General',
              date: event.start_time,
              title: event.title,
              category: event.category || event.event_type || '📅 Event'
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
    const date = new Date(dateString)
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



  return (
    <div className="space-y-8">
      {/* Enhanced Header with BlocIQ Gradient Background */}
      <div className="bg-gradient-to-r from-[#008C8F] to-[#7645ED] rounded-2xl p-8 text-white shadow-xl">
        <div className="flex items-center justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                <BlocIQLogo className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Welcome back, {userData.name}!</h1>
                <p className="text-white/90 text-lg">{currentWelcomeMessage}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Upcoming Events Section */}
              <BlocIQCard variant="elevated">
                <BlocIQCardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-[#008C8F] to-[#7645ED] rounded-xl flex items-center justify-center">
                      <Calendar className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-semibold text-[#333333]">Property Events</h2>
                      <p className="text-sm text-[#64748B]">Manage your property events</p>
                    </div>
                  </div>
                </BlocIQCardHeader>
                
                <BlocIQCardContent>
                  <div className="space-y-4">
                    {/* Add Event Button */}
                    {!showAddEventForm && (
                      <div className="text-center">
                        <BlocIQButton
                          onClick={() => setShowAddEventForm(true)}
                          size="sm"
                          className="bg-gradient-to-r from-[#008C8F] to-[#2BBEB4] hover:from-[#007B8A] hover:to-[#2BBEB4] text-white"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add New Event
                        </BlocIQButton>
                      </div>
                    )}

                    {/* Manual Event Input Form */}
                    {showAddEventForm && (
                      <div className="bg-gradient-to-r from-[#F0FDFA] to-emerald-50 rounded-xl p-4 border border-[#2BBEB4]/20">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-semibold text-[#0F5D5D]">Add New Event</h3>
                          <button
                            type="button"
                            onClick={() => setShowAddEventForm(false)}
                            className="text-[#64748B] hover:text-[#333333] transition-colors"
                          >
                            <X className="h-5 w-5" />
                          </button>
                        </div>
                        <form onSubmit={handleAddEvent} className="space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-sm font-medium text-[#333333] mb-1">Event Title</label>
                              <input
                                type="text"
                                name="title"
                                required
                                className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#008C8F] focus:border-transparent"
                                placeholder="Enter event title"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-[#333333] mb-1">Date & Time</label>
                              <input
                                type="datetime-local"
                                name="date"
                                required
                                min={new Date().toISOString().slice(0, 16)}
                                className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#008C8F] focus:border-transparent"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-[#333333] mb-1">Building (Optional)</label>
                            <select
                              name="building"
                              className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#008C8F] focus:border-transparent"
                            >
                              <option value="">Select a building</option>
                              {buildings.map(building => (
                                <option key={building.id} value={building.name}>{building.name}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-[#333333] mb-1">Description (Optional)</label>
                            <textarea
                              name="description"
                              rows={3}
                              className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#008C8F] focus:border-transparent"
                              placeholder="Enter event description"
                            />
                          </div>
                          <div className="flex justify-end gap-2">
                            <BlocIQButton
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setShowAddEventForm(false)}
                              disabled={isAddingEvent}
                            >
                              Cancel
                            </BlocIQButton>
                            <BlocIQButton
                              type="submit"
                              disabled={isAddingEvent}
                              size="sm"
                              className="bg-gradient-to-r from-[#008C8F] to-[#2BBEB4] hover:from-[#007B8A] hover:to-[#2BBEB4] text-white"
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
                            </BlocIQButton>
                          </div>
                        </form>
                      </div>
                    )}

                    {/* Events List */}
                    {loadingEvents ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#008C8F] mx-auto mb-2"></div>
                        <p className="text-[#64748B] text-sm">Loading events...</p>
                      </div>
                    ) : upcomingEvents.length > 0 ? (
                      <div className="space-y-3">
                        {upcomingEvents.map((event, index) => {
                          const { date, time } = formatEventDate(event.date)
                          const eventDate = new Date(event.date)
                          const isToday = eventDate.toDateString() === new Date().toDateString()
                          const isTomorrow = eventDate.toDateString() === new Date(Date.now() + 24 * 60 * 60 * 1000).toDateString()
                          
                          return (
                            <div key={`property-${index}`} className="bg-gradient-to-r from-[#F0FDFA] to-emerald-50 rounded-xl p-4 hover:shadow-lg text-sm border-l-4 border-[#2BBEB4] transition-all duration-200">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <div className="font-bold text-[#333333]">
                                      {event.title}
                                    </div>
                                    {(isToday || isTomorrow) && (
                                      <BlocIQBadge variant={isToday ? "destructive" : "warning"} size="sm">
                                        {isToday ? 'Today' : 'Tomorrow'}
                                      </BlocIQBadge>
                                    )}
                                  </div>
                                  {event.category && (
                                    <div className="text-[#64748B] mb-1">
                                      📋 {event.category}
                                    </div>
                                  )}
                                  <div className="text-[#64748B] mb-1">
                                    📍 {event.building}
                                  </div>
                                  <div className="text-[#64748B]">
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
                        <Calendar className="h-12 w-12 text-[#64748B] mx-auto mb-3" />
                        <p className="text-[#64748B] text-sm">No events yet</p>
                        <p className="text-[#64748B] text-xs mt-1">Click "Add New Event" to get started</p>
                      </div>
                    )}
                  </div>
                </BlocIQCardContent>
              </BlocIQCard>

              {/* Ask BlocIQ AI Assistant */}
              <div>
                <AskBlocIQHomepage />
              </div>
            </div>

      {/* Daily Summary Section */}
      <DailySummary />
    </div>
  )
} 