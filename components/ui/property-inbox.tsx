"use client"

import { useState } from "react"
import { Search, Filter, Archive, Trash2, Reply, Bot, Flag, Clock, User, Building } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"

interface Email {
  id: string
  subject: string
  sender: string
  senderEmail: string
  timestamp: string
  preview: string
  isRead: boolean
  category: "Urgent" | "Finance" | "Complaint" | "Maintenance" | "Legal" | "General"
  property?: string
}

const mockEmails: Email[] = [
  {
    id: "1",
    subject: "Service Charge Query - Elmwood Gardens",
    sender: "Eleanor Richards",
    senderEmail: "e.richards@elmwoodgardens.co.uk",
    timestamp: "2 hours ago",
    preview:
      "Hi Michael, I hope you're well. I'm interested in viewing 14 Clifton Drive. Is the seller open to offers under asking price?",
    isRead: false,
    category: "Finance",
    property: "Elmwood Gardens",
  },
  {
    id: "2",
    subject: "URGENT: Water Leak in Flat 12B",
    sender: "James Wilson",
    senderEmail: "j.wilson@tenant.com",
    timestamp: "4 hours ago",
    preview:
      "There's a significant water leak in my bathroom ceiling. Water is dripping into the living room. This needs immediate attention.",
    isRead: false,
    category: "Urgent",
    property: "Camden Square Mansions",
  },
  {
    id: "3",
    subject: "Complaint: Noise from Construction Work",
    sender: "Sarah Thompson",
    senderEmail: "s.thompson@resident.com",
    timestamp: "6 hours ago",
    preview:
      "The construction work starting at 7 AM is unacceptable. This violates our lease agreement regarding quiet hours.",
    isRead: true,
    category: "Complaint",
    property: "Birchwood Court",
  },
  {
    id: "4",
    subject: "Annual Budget Approval Required",
    sender: "David Chen",
    senderEmail: "d.chen@management.com",
    timestamp: "1 day ago",
    preview:
      "Please review and approve the annual service charge budget for Dovetail House. The board meeting is scheduled for next week.",
    isRead: true,
    category: "Finance",
    property: "Dovetail House",
  },
  {
    id: "5",
    subject: "Lift Maintenance Schedule Update",
    sender: "TechLift Services",
    senderEmail: "service@techlift.co.uk",
    timestamp: "2 days ago",
    preview:
      "We need to reschedule the lift maintenance for next Tuesday due to parts availability. Please confirm the new time slot.",
    isRead: true,
    category: "Maintenance",
    property: "Camden Square Mansions",
  },
]

const categoryColors = {
  Urgent: "bg-red-100 text-red-800 border-red-200",
  Finance: "bg-green-100 text-green-800 border-green-200",
  Complaint: "bg-orange-100 text-orange-800 border-orange-200",
  Maintenance: "bg-blue-100 text-blue-800 border-blue-200",
  Legal: "bg-purple-100 text-purple-800 border-purple-200",
  General: "bg-gray-100 text-gray-800 border-gray-200",
}

const sidebarCategories = [
  { name: "To respond", color: "bg-red-400", count: 3 },
  { name: "FYI", color: "bg-orange-400", count: 2 },
  { name: "Comment", color: "bg-yellow-400", count: 1 },
  { name: "Notification", color: "bg-green-400", count: 5 },
  { name: "Meeting Update", color: "bg-blue-400", count: 2 },
  { name: "Awaiting reply", color: "bg-purple-400", count: 4 },
  { name: "Actioned", color: "bg-pink-400", count: 8 },
  { name: "Marketing", color: "bg-rose-400", count: 1 },
]

export function PropertyInbox() {
  const [selectedEmails, setSelectedEmails] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState("")

  const toggleEmailSelection = (emailId: string) => {
    setSelectedEmails((prev) => (prev.includes(emailId) ? prev.filter((id) => id !== emailId) : [...prev, emailId]))
  }

  const filteredEmails = mockEmails.filter(
    (email) =>
      email.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      email.sender.toLowerCase().includes(searchQuery.toLowerCase()) ||
      email.preview.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  return (
    <div className="flex h-screen bg-white">
      {/* Sidebar */}
      <div className="w-64 bg-gray-50 border-r border-gray-200 p-4">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-900 mb-2">BlocIQ Inbox</h1>
          <p className="text-sm text-gray-600">Property Management</p>
        </div>

        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Labels:</h3>
          {sidebarCategories.map((category, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-100 cursor-pointer"
            >
              <div className="flex items-center space-x-3">
                <div className={`w-4 h-4 rounded ${category.color}`}></div>
                <span className="text-sm font-medium text-gray-700">{category.name}</span>
              </div>
              <span className="text-xs text-gray-500">{category.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b border-gray-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Inbox</h2>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm">
                <Filter className="w-4 h-4 mr-2" />
                Filter
              </Button>
              <Button variant="outline" size="sm">
                <Archive className="w-4 h-4 mr-2" />
                Archive
              </Button>
              <Button variant="outline" size="sm">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search emails..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Email List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredEmails.map((email) => (
            <Card
              key={email.id}
              draggable={true}
              onDragStart={(e) => {
                e.dataTransfer.setData('emailId', email.id);
              }}
              className={`p-4 hover:shadow-md transition-shadow cursor-pointer ${!email.isRead ? "bg-blue-50 border-blue-200" : ""}`}
            >
              <div className="flex items-start space-x-4">
                <input
                  type="checkbox"
                  checked={selectedEmails.includes(email.id)}
                  onChange={() => toggleEmailSelection(email.id)}
                  className="mt-1 rounded border-gray-300"
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                        <User className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className={`text-sm ${!email.isRead ? "font-semibold" : "font-medium"} text-gray-900`}>
                          {email.sender}
                        </p>
                        <p className="text-xs text-gray-500">{email.senderEmail}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Badge className={categoryColors[email.category]} variant="outline">
                        <Flag className="w-3 h-3 mr-1" />
                        {email.category}
                      </Badge>
                      <div className="flex items-center text-xs text-gray-500">
                        <Clock className="w-3 h-3 mr-1" />
                        {email.timestamp}
                      </div>
                    </div>
                  </div>

                  <div className="mb-2">
                    <h3 className={`text-sm ${!email.isRead ? "font-semibold" : "font-medium"} text-gray-900 mb-1`}>
                      {email.subject}
                    </h3>
                    {email.property && (
                      <div className="flex items-center text-xs text-gray-600 mb-2">
                        <Building className="w-3 h-3 mr-1" />
                        {email.property}
                      </div>
                    )}
                    <p className="text-sm text-gray-600 line-clamp-2">{email.preview}</p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Button size="sm" variant="outline" className="text-xs bg-transparent">
                      <Reply className="w-3 h-3 mr-1" />
                      Reply
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                    >
                      <Bot className="w-3 h-3 mr-1" />
                      Reply with AI
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
