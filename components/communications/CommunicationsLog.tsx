'use client'

import { useState, useEffect } from 'react'
import { Mail, MailOpen, Send, Calendar, Building2, User, ArrowUp, ArrowDown, RefreshCw } from 'lucide-react'
import { BlocIQCard, BlocIQCardContent, BlocIQCardHeader } from '@/components/ui/blociq-card'
import { BlocIQBadge } from '@/components/ui/blociq-badge'
import { useSupabase } from '@/components/SupabaseProvider'
import { toast } from 'sonner'

interface Communication {
  id: string
  direction: 'inbound' | 'outbound'
  subject: string | null
  body: string
  sent_at: string
  building?: {
    id: string
    name: string
  } | null
  leaseholder?: {
    id: string
    name: string
    email: string
  } | null
  user?: {
    email: string
  } | null
  metadata?: any
}

interface CommunicationsLogProps {
  buildingId?: string
  leaseholderId?: string
  title?: string
  showFilters?: boolean
  limit?: number
}

export default function CommunicationsLog({
  buildingId,
  leaseholderId,
  title,
  showFilters = true,
  limit = 50
}: CommunicationsLogProps) {
  const { supabase } = useSupabase()
  const [communications, setCommunications] = useState<Communication[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'email' | 'letter'>('all')

  useEffect(() => {
    fetchCommunications()
  }, [buildingId, leaseholderId, filter])

  const fetchCommunications = async () => {
    try {
      setLoading(true)

      let query = supabase
        .from('communications_log')
        .select(`
          id,
          type,
          subject,
          content,
          sent_at,
          building_id,
          leaseholder_id,
          sent_by,
          building_name,
          leaseholder_name,
          unit_number,
          status
        `)
        .order('sent_at', { ascending: false })
        .limit(limit)

      // Apply filters
      if (buildingId) {
        query = query.eq('building_id', buildingId)
      }
      if (leaseholderId) {
        query = query.eq('leaseholder_id', leaseholderId)
      }
      if (filter !== 'all') {
        query = query.eq('type', filter)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching communications:', error)
        toast.error('Failed to load communications')
        return
      }

      if (!data || data.length === 0) {
        setCommunications([])
        return
      }

      // Fetch related building data if needed
      const buildingIds = [...new Set(data.map(comm => comm.building_id).filter(Boolean))]
      let buildingsMap: Record<string, { id: string; name: string }> = {}

      if (buildingIds.length > 0) {
        const { data: buildings } = await supabase
          .from('buildings')
          .select('id, name')
          .in('id', buildingIds)

        if (buildings) {
          buildingsMap = buildings.reduce((acc, building) => {
            acc[building.id] = building
            return acc
          }, {} as Record<string, { id: string; name: string }>)
        }
      }

      // Use leaseholder data directly from communications_log since it has leaseholder_name
      // Skip separate leaseholder fetch to avoid schema issues

      // Map the data with related entities
      const enrichedCommunications = data.map(comm => ({
        ...comm,
        direction: 'outbound', // Default since no direction field in schema
        body: comm.content || '', // Map content to body field
        building: comm.building_id ? buildingsMap[comm.building_id] : (comm.building_name ? { id: comm.building_id || '', name: comm.building_name } : null),
        leaseholder: comm.leaseholder_name ? {
          id: comm.leaseholder_id || '',
          name: comm.leaseholder_name,
          email: ''
        } : null,
        user: null // User data can be fetched if needed
      }))

      setCommunications(enrichedCommunications)
    } catch (error) {
      console.error('Exception fetching communications:', error)
      toast.error('Error loading communications')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 1) {
      return `Today, ${date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`
    } else if (diffDays <= 7) {
      return `${diffDays} days ago`
    } else {
      return date.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      })
    }
  }

  const getTypeIcon = (type: string) => {
    if (type === 'email') {
      return <Mail className="h-4 w-4 text-blue-600" />
    } else if (type === 'letter') {
      return <Send className="h-4 w-4 text-green-600" />
    } else {
      return <ArrowUp className="h-4 w-4 text-gray-600" />
    }
  }

  const getTypeColor = (type: string) => {
    if (type === 'email') {
      return 'bg-blue-100 text-blue-800 border-blue-200'
    } else if (type === 'letter') {
      return 'bg-green-100 text-green-800 border-green-200'
    } else {
      return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const truncateText = (text: string, maxLength = 200) => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  if (loading) {
    return (
      <BlocIQCard>
        <BlocIQCardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Communications Log</h3>
            <RefreshCw className="h-4 w-4 animate-spin text-gray-400" />
          </div>
        </BlocIQCardHeader>
        <BlocIQCardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
                    <div className="h-12 bg-gray-200 rounded"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </BlocIQCardContent>
      </BlocIQCard>
    )
  }

  return (
    <BlocIQCard>
      <BlocIQCardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-teal-600" />
            <h3 className="text-lg font-semibold">{title || 'Communications Log'}</h3>
            <BlocIQBadge variant="secondary" className="text-xs">
              {communications.length} message{communications.length !== 1 ? 's' : ''}
            </BlocIQBadge>
          </div>
          <div className="flex items-center gap-2">
            {showFilters && (
              <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-3 py-1 text-xs font-medium transition-colors ${
                    filter === 'all'
                      ? 'bg-teal-600 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilter('email')}
                  className={`px-3 py-1 text-xs font-medium transition-colors border-l border-gray-200 ${
                    filter === 'email'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Email
                </button>
                <button
                  onClick={() => setFilter('letter')}
                  className={`px-3 py-1 text-xs font-medium transition-colors border-l border-gray-200 ${
                    filter === 'letter'
                      ? 'bg-green-600 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Letter
                </button>
              </div>
            )}
            <button
              onClick={fetchCommunications}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              title="Refresh"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>
      </BlocIQCardHeader>
      <BlocIQCardContent>
        {communications.length === 0 ? (
          <div className="text-center py-12">
            <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No communications found</h3>
            <p className="text-gray-500">
              {filter === 'all'
                ? 'No communications have been logged yet.'
                : `No ${filter} communications found.`
              }
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {communications.map((comm) => (
              <div key={comm.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                <div className="flex items-start gap-4">
                  <div className={`p-2 rounded-full ${getTypeColor(comm.type)}`}>
                    {getTypeIcon(comm.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <BlocIQBadge
                          variant={comm.type === 'email' ? 'default' : 'outline'}
                          className={`text-xs ${getTypeColor(comm.type)}`}
                        >
                          {comm.type === 'email' ? 'Email' : comm.type === 'letter' ? 'Letter' : 'Communication'}
                        </BlocIQBadge>
                        <span className="text-sm text-gray-500">
                          {formatDate(comm.sent_at)}
                        </span>
                      </div>
                    </div>

                    <div className="mb-2">
                      <h4 className="font-medium text-gray-900 mb-1">
                        {comm.subject || 'No subject'}
                      </h4>

                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        {comm.leaseholder && (
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            <span>{comm.leaseholder.name}</span>
                            {comm.leaseholder.email && (
                              <span className="text-gray-400">({comm.leaseholder.email})</span>
                            )}
                          </div>
                        )}
                        {comm.building && (
                          <div className="flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            <span>{comm.building.name}</span>
                          </div>
                        )}
                        {comm.metadata?.source && (
                          <div className="text-xs text-gray-400">
                            via {comm.metadata.source.replace('_', ' ')}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-md p-3 text-sm text-gray-700">
                      <p className="whitespace-pre-wrap leading-relaxed">
                        {truncateText(comm.body)}
                      </p>
                    </div>

                    {comm.metadata?.generated_by_ai && (
                      <div className="mt-2">
                        <BlocIQBadge variant="secondary" className="text-xs bg-purple-100 text-purple-800">
                          AI Generated
                        </BlocIQBadge>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </BlocIQCardContent>
    </BlocIQCard>
  )
}