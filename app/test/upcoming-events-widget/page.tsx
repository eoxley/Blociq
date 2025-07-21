import LayoutWithSidebar from '@/components/LayoutWithSidebar'
import UpcomingEventsWidget from '@/components/UpcomingEventsWidget'

export default function UpcomingEventsWidgetTestPage() {
  return (
    <LayoutWithSidebar>
      <div className="space-y-8">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white">
          <h1 className="text-3xl font-bold mb-2">Upcoming Events Widget</h1>
          <p className="text-blue-100">Test page for the calendar events widget with building matching</p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <UpcomingEventsWidget />
          
          <div className="bg-white rounded-xl shadow-lg p-6 border">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Widget Features</h2>
            <div className="space-y-3 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>Pulls events from Outlook calendar via Supabase</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Matches events to buildings by scanning title & location</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                <span>Priority indicators for upcoming events</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span>One-click calendar sync functionality</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <span>Shows organizer, location, and online meeting info</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </LayoutWithSidebar>
  )
} 