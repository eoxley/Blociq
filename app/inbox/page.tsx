"use client";

import LayoutWithSidebar from "@/components/LayoutWithSidebar";

export default function InboxPage() {
  const messages = [
    {
      id: 1,
      from: "john.doe@email.com",
      subject: "Maintenance Request - Unit 204",
      preview: "The heating system in my unit isn't working properly...",
      time: "2 hours ago",
      unread: true,
    },
    {
      id: 2,
      from: "sarah.wilson@email.com",
      subject: "Lease Renewal Inquiry",
      preview: "I would like to discuss renewing my lease for another year...",
      time: "1 day ago",
      unread: true,
    },
    {
      id: 3,
      from: "mike.johnson@email.com",
      subject: "Noise Complaint",
      preview: "There has been excessive noise from the unit above mine...",
      time: "2 days ago",
      unread: false,
    },
    {
      id: 4,
      from: "lisa.brown@email.com",
      subject: "Parking Issue",
      preview: "Someone has been parking in my assigned spot...",
      time: "3 days ago",
      unread: false,
    },
  ];

  return (
    <LayoutWithSidebar>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Inbox</h1>
            <p className="text-gray-600 mt-2">Manage your property communications</p>
          </div>
          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
            Compose
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button className="border-blue-500 text-blue-600 border-b-2 py-2 px-1 text-sm font-medium">
              All Messages ({messages.length})
            </button>
            <button className="border-transparent text-gray-500 hover:text-gray-700 border-b-2 py-2 px-1 text-sm font-medium">
              Unread ({messages.filter(m => m.unread).length})
            </button>
            <button className="border-transparent text-gray-500 hover:text-gray-700 border-b-2 py-2 px-1 text-sm font-medium">
              Maintenance
            </button>
          </nav>
        </div>

        {/* Messages List */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="divide-y divide-gray-200">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`p-6 hover:bg-gray-50 cursor-pointer ${
                  message.unread ? "bg-blue-50" : ""
                }`}
              >
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-gray-700">
                        {message.from.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className={`text-sm ${message.unread ? "font-semibold" : ""} text-gray-900`}>
                        {message.from}
                      </p>
                      <p className="text-sm text-gray-500">{message.time}</p>
                    </div>
                    <p className={`text-sm ${message.unread ? "font-semibold" : ""} text-gray-900 mt-1`}>
                      {message.subject}
                    </p>
                    <p className="text-sm text-gray-600 mt-1 truncate">
                      {message.preview}
                    </p>
                  </div>
                  {message.unread && (
                    <div className="flex-shrink-0">
                      <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </LayoutWithSidebar>
  );
}