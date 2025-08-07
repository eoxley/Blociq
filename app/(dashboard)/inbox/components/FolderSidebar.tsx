'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import {
  Inbox as InboxIcon,
  CheckCircle,
  Folder,
  Building as BuildingIcon,
  Tag,
  RefreshCw,
  Loader2,
  Archive,
  AlertTriangle,
  MessageSquare,
  Clock,
  Star,
  Filter
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { formatDistanceToNow } from 'date-fns'

interface Building {
  id: string
  name: string
  emailCount: number
}

interface TagFolder {
  tag: string
  emailCount: number
}

interface FolderSidebarProps {
  currentFilter: string
  onFilterChange: (filter: string) => void
  onSync: () => void
  isSyncing: boolean
  lastSync: string | null
}

export default function FolderSidebar({
  currentFilter,
  onFilterChange,
  onSync,
  isSyncing,
  lastSync,
}: FolderSidebarProps) {
  const [buildings, setBuildings] = useState<Building[]>([])
  const [tags, setTags] = useState<TagFolder[]>([])
  const [loadingFolders, setLoadingFolders] = useState(true)
  const [folderCounts, setFolderCounts] = useState({
    inbox: 0,
    handled: 0,
    all: 0,
    archived: 0,
    complaints: 0,
    queries: 0,
    actionRequired: 0,
    flagged: 0
  })

  // Fetch all folder data
  useEffect(() => {
    fetchFolderData()
  }, [])

  const fetchFolderData = async () => {
    setLoadingFolders(true)
    try {
      await Promise.all([
        fetchBuildingFolders(),
        fetchTagFolders(),
        fetchFolderCounts(),
      ])
    } catch (error) {
      console.error('Error fetching folder data:', error)
    } finally {
      setLoadingFolders(false)
    }
  }

  const fetchBuildingFolders = async () => {
    try {
      const { data: buildingData, error } = await supabase
        .from('buildings')
        .select(`
          id,
          name
        `)
        .order('name', { ascending: true })

      if (!error && buildingData) {
        const buildingsWithCounts = await Promise.all(
          buildingData.map(async (building) => {
            const [incomingCount, sentCount] = await Promise.all([
              supabase
                .from('incoming_emails')
                .select('id', { count: 'exact', head: true })
                .eq('building_id', building.id),
              supabase
                .from('sent_emails')
                .select('id', { count: 'exact', head: true })
                .eq('building_id', building.id)
            ])

            return {
              id: building.id,
              name: building.name,
              emailCount: (incomingCount.count || 0) + (sentCount.count || 0)
            }
          })
        )

        setBuildings(buildingsWithCounts)
      }
    } catch (error) {
      console.error('Error fetching building folders:', error)
    }
  }

  const fetchTagFolders = async () => {
    try {
      const { data: tagData, error } = await supabase
        .from('incoming_emails')
        .select('categories')
        .not('categories', 'is', null)

      if (!error && tagData) {
        const tagCounts: Record<string, number> = {}
        
        tagData.forEach(email => {
          if (email.categories) {
            email.categories.forEach(tag => {
              tagCounts[tag] = (tagCounts[tag] || 0) + 1
            })
          }
        })

        const tagFolders = Object.entries(tagCounts).map(([tag, count]) => ({
          tag,
          emailCount: count
        }))

        setTags(tagFolders)
      }
    } catch (error) {
      console.error('Error fetching tag folders:', error)
    }
  }

  const fetchFolderCounts = async () => {
    try {
      const [allCount, unreadCount, handledCount, flaggedCount, archivedCount] = await Promise.all([
        supabase.from('incoming_emails').select('id', { count: 'exact', head: true }),
        supabase.from('incoming_emails').select('id', { count: 'exact', head: true }).eq('is_read', false),
        supabase.from('incoming_emails').select('id', { count: 'exact', head: true }).eq('is_handled', true),
        supabase.from('incoming_emails').select('id', { count: 'exact', head: true }).eq('flag_status', 'flagged'),
        supabase.from('incoming_emails').select('id', { count: 'exact', head: true }).eq('flag_status', 'archived')
      ])

      setFolderCounts({
        all: allCount.count || 0,
        inbox: unreadCount.count || 0,
        handled: handledCount.count || 0,
        flagged: flaggedCount.count || 0,
        archived: archivedCount.count || 0,
        complaints: 0, // Will be calculated from tags
        queries: 0, // Will be calculated from tags
        actionRequired: 0 // Will be calculated as unhandled
      })
    } catch (error) {
      console.error('Error fetching folder counts:', error)
    }
  }

  const formatLastSync = (timestamp: string | null) => {
    if (!timestamp) return 'Never'
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true })
  }

  const getFilterIcon = (filterType: string) => {
    switch (filterType) {
      case 'inbox':
        return <InboxIcon className="h-5 w-5" />
      case 'handled':
        return <CheckCircle className="h-5 w-5" />
      case 'flagged':
        return <Star className="h-5 w-5" />
      case 'archived':
        return <Archive className="h-5 w-5" />
      case 'complaints':
        return <AlertTriangle className="h-5 w-5" />
      case 'leaseholder-queries':
        return <MessageSquare className="h-5 w-5" />
      case 'action-required':
        return <Clock className="h-5 w-5" />
      default:
        return <Folder className="h-5 w-5" />
    }
  }

  const getFilterLabel = (filterType: string) => {
    switch (filterType) {
      case 'inbox':
        return 'Inbox'
      case 'handled':
        return 'Handled'
      case 'flagged':
        return 'Flagged'
      case 'archived':
        return 'Archived'
      case 'complaints':
        return 'Complaints'
      case 'leaseholder-queries':
        return 'Leaseholder Queries'
      case 'action-required':
        return 'Action Required'
      default:
        return filterType
    }
  }

  const getFilterCount = (filterType: string) => {
    switch (filterType) {
      case 'inbox':
        return folderCounts.inbox
      case 'handled':
        return folderCounts.handled
      case 'flagged':
        return folderCounts.flagged
      case 'archived':
        return folderCounts.archived
      case 'complaints':
        return folderCounts.complaints
      case 'leaseholder-queries':
        return folderCounts.queries
      case 'action-required':
        return folderCounts.actionRequired
      default:
        return 0
    }
  }

  const systemFolders = [
    { id: 'inbox', label: 'Inbox', icon: InboxIcon, count: folderCounts.inbox },
    { id: 'action-required', label: 'Action Required', icon: Clock, count: folderCounts.actionRequired },
    { id: 'flagged', label: 'Flagged', icon: Star, count: folderCounts.flagged },
    { id: 'handled', label: 'Handled', icon: CheckCircle, count: folderCounts.handled },
    { id: 'archived', label: 'Archived', icon: Archive, count: folderCounts.archived }
  ]

  const categoryFolders = [
    { id: 'complaints', label: 'Complaints', icon: AlertTriangle, count: folderCounts.complaints },
    { id: 'leaseholder-queries', label: 'Leaseholder Queries', icon: MessageSquare, count: folderCounts.queries }
  ]

  return (
    <div className="space-y-6">
      {/* Sync Status */}
      <Card className="p-4 bg-gradient-to-r from-teal-50 to-blue-50 border-teal-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900">Sync Status</h3>
          <Button
            onClick={onSync}
            disabled={isSyncing}
            size="sm"
            variant="outline"
            className="border-teal-300 text-teal-600 hover:bg-teal-50"
          >
            <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing...' : 'Sync'}
          </Button>
        </div>
        <p className="text-xs text-gray-600">
          Last sync: {formatLastSync(lastSync)}
        </p>
      </Card>

      {/* System Folders */}
      <Card className="p-4">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Filter className="h-4 w-4" />
          System Folders
        </h3>
        <div className="space-y-2">
          {systemFolders.map((folder) => {
            const isActive = currentFilter === folder.id
            return (
              <button
                key={folder.id}
                onClick={() => onFilterChange(folder.id)}
                className={`w-full flex items-center justify-between p-3 rounded-xl transition-all duration-200 ${
                  isActive 
                    ? 'bg-gradient-to-r from-teal-600 via-blue-600 to-purple-600 text-white shadow-lg' 
                    : 'hover:bg-gray-50 text-gray-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <folder.icon className="h-4 w-4" />
                  <span className="font-medium">{folder.label}</span>
                </div>
                <Badge 
                  variant={isActive ? "secondary" : "outline"}
                  className={isActive ? "bg-white/20 text-white" : ""}
                >
                  {folder.count}
                </Badge>
              </button>
            )
          })}
        </div>
      </Card>

      {/* Category Folders */}
      {categoryFolders.some(folder => folder.count > 0) && (
        <Card className="p-4">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Tag className="h-4 w-4" />
            Categories
          </h3>
          <div className="space-y-2">
            {categoryFolders.map((folder) => {
              const isActive = currentFilter === folder.id
              return (
                <button
                  key={folder.id}
                  onClick={() => onFilterChange(folder.id)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl transition-all duration-200 ${
                    isActive 
                      ? 'bg-gradient-to-r from-teal-600 via-blue-600 to-purple-600 text-white shadow-lg' 
                      : 'hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <folder.icon className="h-4 w-4" />
                    <span className="font-medium">{folder.label}</span>
                  </div>
                  <Badge 
                    variant={isActive ? "secondary" : "outline"}
                    className={isActive ? "bg-white/20 text-white" : ""}
                  >
                    {folder.count}
                  </Badge>
                </button>
              )
            })}
          </div>
        </Card>
      )}

      {/* Building Folders */}
      {buildings.length > 0 && (
        <Card className="p-4">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <BuildingIcon className="h-4 w-4" />
            Buildings
          </h3>
          <div className="space-y-2">
            {buildings.map((building) => {
              const isActive = currentFilter === `building-${building.id}`
              return (
                <button
                  key={building.id}
                  onClick={() => onFilterChange(`building-${building.id}`)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl transition-all duration-200 ${
                    isActive 
                      ? 'bg-gradient-to-r from-teal-600 via-blue-600 to-purple-600 text-white shadow-lg' 
                      : 'hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <BuildingIcon className="h-4 w-4" />
                    <span className="font-medium truncate">{building.name}</span>
                  </div>
                  <Badge 
                    variant={isActive ? "secondary" : "outline"}
                    className={isActive ? "bg-white/20 text-white" : ""}
                  >
                    {building.emailCount}
                  </Badge>
                </button>
              )
            })}
          </div>
        </Card>
      )}

      {/* Tag Folders */}
      {tags.length > 0 && (
        <Card className="p-4">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Tag className="h-4 w-4" />
            Tags
          </h3>
          <div className="space-y-2">
            {tags.map((tag) => {
              const isActive = currentFilter === `tag-${tag.tag}`
              return (
                <button
                  key={tag.tag}
                  onClick={() => onFilterChange(`tag-${tag.tag}`)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl transition-all duration-200 ${
                    isActive 
                      ? 'bg-gradient-to-r from-teal-600 via-blue-600 to-purple-600 text-white shadow-lg' 
                      : 'hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Tag className="h-4 w-4" />
                    <span className="font-medium">{tag.tag}</span>
                  </div>
                  <Badge 
                    variant={isActive ? "secondary" : "outline"}
                    className={isActive ? "bg-white/20 text-white" : ""}
                  >
                    {tag.emailCount}
                  </Badge>
                </button>
              )
            })}
          </div>
        </Card>
      )}

      {loadingFolders && (
        <Card className="p-4">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
            <span className="ml-2 text-gray-600">Loading folders...</span>
          </div>
        </Card>
      )}
    </div>
  )
} 