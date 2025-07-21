'use client'

import React, { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { 
  Inbox, 
  CheckCircle, 
  Archive, 
  Building2, 
  Search, 
  RefreshCw, 
  Mail, 
  Paperclip, 
  Eye,
  EyeOff,
  Calendar,
  User,
  Tag,
  Filter,
  MoreVertical,
  Star,
  StarOff
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type Email = {
  id: string
  subject: string | null
  from_name: string | null
  from_email: string | null
  received_at: string | null
  body_preview: string | null
  body_full: string | null
  building_id: string | null
  is_read: boolean | null
  is_handled: boolean | null
  tags: string[] | null
  outlook_id: string | null
  buildings?: { name: string } | null
}

type Building = {
  id: string
  name: string
}

type Folder = {
  id: string
  name: string
  icon: React.ReactNode
  count: number
  color: string
}

interface ModernInboxLayoutProps {
  initialEmails: Email[]
  lastSyncTime: string | null
  userId: string
  searchParams?: { success?: string; email?: string; error?: string }
}

export default function ModernInboxLayout({
  initialEmails,
  lastSyncTime,
  userId,
  searchParams
}: ModernInboxLayoutProps) {
  const [emails, setEmails] = useState<Email[]>(initialEmails)
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null)
  const [buildings, setBuildings] = useState<Building[]>([])
  const [currentFilter, setCurrentFilter] = useState('inbox')
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [folderCounts, setFolderCounts] = useState({
    inbox: 0,
    handled: 0,
    unhandled: 0,
    all: 0
  })

  const supabase = createClientComponentClient()

  // Fetch buildings and folder counts
  useEffect(() => {
    const fetchData = async () => {
      const { data: buildingsData } = await supabase.from('buildings').select('id, name')
      setBuildings(buildingsData || [])

      // Get folder counts
      const [inboxCount, handledCount, unhandledCount, allCount] = await Promise.all([
        supabase.from('incoming_emails').select('id', { count: 'exact', head: true }),
        supabase.from('incoming_emails').select('id', { count: 'exact', head: true }).eq('is_handled', true),
        supabase.from('incoming_emails').select('id', { count: 'exact', head: true }).eq('is_handled', false),
        supabase.from('incoming_emails').select('id', { count: 'exact', head: true })
      ])

      setFolderCounts({
        inbox: inboxCount.count || 0,
        handled: handledCount.count || 0,
        unhandled: unhandledCount.count || 0,
        all: allCount.count || 0
      })
    }

    fetchData()
  }, [supabase])

  // Fetch emails based on filter
  useEffect(() => {
    const fetchEmails = async () => {
      setLoading(true)
      let query = supabase
        .from('incoming_emails')
        .select(`
          id, subject, from_name, from_email, received_at, body_preview, body_full, 
          building_id, is_read, is_handled, tags, outlook_id, buildings(name)
        `)
        .order('received_at', { ascending: false })

      if (currentFilter === 'handled') {
        query = query.eq('is_handled', true)
      } else if (currentFilter === 'unhandled') {
        query = query.eq('is_handled', false)
      } else if (currentFilter.startsWith('building-')) {
        const buildingId = currentFilter.replace('building-', '')
        query = query.eq('building_id', buildingId)
      }

      const { data, error } = await query
      if (!error && data) {
        const processedEmails = data.map((email: any) => ({
          ...email,
          buildings: Array.isArray(email.buildings) ? email.buildings[0] : email.buildings
        }))
        setEmails(processedEmails)
      }
      setLoading(false)
    }

    fetchEmails()
  }, [currentFilter, supabase])

  const syncEmails = async () => {
    setSyncing(true)
    try {
      const response = await fetch('/api/sync-inbox', { method: 'POST' })
      if (response.ok) {
        // Refresh emails
        const { data } = await supabase
          .from('incoming_emails')
          .select(`
            id, subject, from_name, from_email, received_at, body_preview, body_full, 
            building_id, is_read, is_handled, tags, outlook_id, buildings(name)
          `)
          .order('received_at', { ascending: false })

        if (data) {
          const processedEmails = data.map((email: any) => ({
            ...email,
            buildings: Array.isArray(email.buildings) ? email.buildings[0] : email.buildings
          }))
          setEmails(processedEmails)
        }
      }
    } catch (error) {
      console.error('Error syncing emails:', error)
    } finally {
      setSyncing(false)
    }
  }

  const markAsRead = async (emailId: string) => {
    await supabase
      .from('incoming_emails')
      .update({ is_read: true })
      .eq('id', emailId)

    setEmails(prev => prev.map(email => 
      email.id === emailId ? { ...email, is_read: true } : email
    ))
  }

  const markAsHandled = async (emailId: string) => {
    await supabase
      .from('incoming_emails')
      .update({ is_handled: true })
      .eq('id', emailId)

    setEmails(prev => prev.map(email => 
      email.id === emailId ? { ...email, is_handled: true } : email
    ))
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 24) {
      return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    } else if (diffInHours < 48) {
      return 'Yesterday'
    } else {
      return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    }
  }

  const folders: Folder[] = [
    {
      id: 'inbox',
      name: 'Inbox',
      icon: <Inbox className="h-4 w-4" />,
      count: folderCounts.inbox,
      color: 'bg-blue-500'
    },
    {
      id: 'unhandled',
      name: 'Unhandled',
      icon: <EyeOff className="h-4 w-4" />,
      count: folderCounts.unhandled,
      color: 'bg-orange-500'
    },
    {
      id: 'handled',
      name: 'Handled',
      icon: <CheckCircle className="h-4 w-4" />,
      count: folderCounts.handled,
      color: 'bg-green-500'
    },
    {
      id: 'all',
      name: 'All Emails',
      icon: <Archive className="h-4 w-4" />,
      count: folderCounts.all,
      color: 'bg-purple-500'
    }
  ]

  const filteredEmails = emails.filter(email => {
    if (!searchTerm) return true
    const searchLower = searchTerm.toLowerCase()
    return (
      email.subject?.toLowerCase().includes(searchLower) ||
      email.from_name?.toLowerCase().includes(searchLower) ||
      email.from_email?.toLowerCase().includes(searchLower) ||
      email.body_preview?.toLowerCase().includes(searchLower)
    )
  })

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Email Inbox</h1>
            <p className="text-sm text-gray-600">
              {filteredEmails.length} emails • Last sync: {lastSyncTime ? formatDate(lastSyncTime) : 'Never'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={syncEmails}
              disabled={syncing}
              className="bg-teal-600 hover:bg-teal-700 text-white"
            >
              {syncing ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              {syncing ? 'Syncing...' : 'Sync Emails'}
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Folders Panel */}
        <div className="w-80 bg-white border-r border-gray-200 p-4">
          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search emails..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-gray-50 border-gray-200 focus:border-teal-500"
              />
            </div>

            {/* Folders */}
            <div className="space-y-2">
              {folders.map((folder) => (
                <button
                  key={folder.id}
                  onClick={() => setCurrentFilter(folder.id)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl text-left transition-all duration-200 group ${
                    currentFilter === folder.id
                      ? 'bg-teal-50 border-2 border-teal-200 text-teal-900'
                      : 'bg-white border-2 border-gray-100 hover:bg-gray-50 hover:border-gray-200 text-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${folder.color} text-white`}>
                      {folder.icon}
                    </div>
                    <span className="font-medium">{folder.name}</span>
                  </div>
                  <span className={`text-sm font-semibold ${
                    currentFilter === folder.id ? 'text-teal-700' : 'text-gray-500'
                  }`}>
                    {folder.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Buildings */}
            {buildings.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  By Building
                </h3>
                {buildings.map((building) => (
                  <button
                    key={building.id}
                    onClick={() => setCurrentFilter(`building-${building.id}`)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl text-left transition-all duration-200 group ${
                      currentFilter === `building-${building.id}`
                        ? 'bg-teal-50 border-2 border-teal-200 text-teal-900'
                        : 'bg-white border-2 border-gray-100 hover:bg-gray-50 hover:border-gray-200 text-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gray-200 flex items-center justify-center">
                        <Building2 className="h-4 w-4 text-gray-600" />
                      </div>
                      <span className="font-medium">{building.name}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Email List */}
        <div className="flex-1 flex flex-col bg-white">
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <RefreshCw className="h-8 w-8 animate-spin text-teal-600 mx-auto mb-2" />
                <p className="text-gray-600">Loading emails...</p>
              </div>
            </div>
          ) : filteredEmails.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Mail className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No emails found</h3>
                <p className="text-gray-600">Try adjusting your search or sync your inbox</p>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto">
              {filteredEmails.map((email) => (
                <div
                  key={email.id}
                  onClick={() => {
                    setSelectedEmail(email)
                    if (!email.is_read) markAsRead(email.id)
                  }}
                  className={`p-4 border-b border-gray-100 cursor-pointer transition-all duration-200 hover:bg-gray-50 ${
                    selectedEmail?.id === email.id ? 'bg-teal-50 border-l-4 border-l-teal-500' : ''
                  } ${!email.is_read ? 'bg-blue-50' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    {/* Sender Avatar */}
                    <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-semibold text-teal-700">
                        {getInitials(email.from_name || email.from_email || 'U')}
                      </span>
                    </div>

                    {/* Email Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className={`font-semibold text-sm ${
                            !email.is_read ? 'text-gray-900' : 'text-gray-700'
                          }`}>
                            {email.from_name || email.from_email}
                          </span>
                          {!email.is_read && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span>{formatDate(email.received_at || '')}</span>
                          {email.tags && email.tags.length > 0 && (
                            <Tag className="h-3 w-3" />
                          )}
                        </div>
                      </div>

                      <h3 className={`font-medium text-sm mb-1 ${
                        !email.is_read ? 'text-gray-900' : 'text-gray-700'
                      }`}>
                        {email.subject || '(No Subject)'}
                      </h3>

                      <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                        {email.body_preview || 'No preview available'}
                      </p>

                      <div className="flex items-center gap-2">
                        {email.buildings?.name && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-teal-100 text-teal-800">
                            <Building2 className="h-3 w-3 mr-1" />
                            {email.buildings.name}
                          </span>
                        )}
                        {email.is_handled && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Handled
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Email Detail Panel */}
        <div className="w-96 bg-gray-50 border-l border-gray-200">
          {selectedEmail ? (
            <div className="h-full flex flex-col">
              {/* Email Header */}
              <div className="p-6 bg-white border-b border-gray-200">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center">
                    <span className="text-lg font-semibold text-teal-700">
                      {getInitials(selectedEmail.from_name || selectedEmail.from_email || 'U')}
                    </span>
                  </div>
                  <div className="flex-1">
                    <h2 className="text-lg font-semibold text-gray-900 mb-1">
                      {selectedEmail.subject || '(No Subject)'}
                    </h2>
                    <p className="text-sm text-gray-600 mb-1">
                      {selectedEmail.from_name || selectedEmail.from_email}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatDate(selectedEmail.received_at || '')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {selectedEmail.buildings?.name && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-teal-100 text-teal-800">
                      <Building2 className="h-4 w-4 mr-1" />
                      {selectedEmail.buildings.name}
                    </span>
                  )}
                  {selectedEmail.is_handled ? (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Handled
                    </span>
                  ) : (
                    <Button
                      onClick={() => markAsHandled(selectedEmail.id)}
                      size="sm"
                      className="bg-orange-600 hover:bg-orange-700 text-white"
                    >
                      Mark as Handled
                    </Button>
                  )}
                </div>
              </div>

              {/* Email Body */}
              <div className="flex-1 p-6 overflow-y-auto">
                <div className="prose prose-sm max-w-none">
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    {selectedEmail.body_full ? (
                      <div dangerouslySetInnerHTML={{ __html: selectedEmail.body_full }} />
                    ) : (
                      <p className="text-gray-600">{selectedEmail.body_preview || 'No content available'}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <Mail className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Select an email</h3>
                <p className="text-gray-600">Choose an email from the list to view its details</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 