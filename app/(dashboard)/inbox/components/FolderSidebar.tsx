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
      // Get buildings with email counts from both incoming and sent emails
      const { data: buildingData, error } = await supabase
        .from('buildings')
        .select(`
          id,
          name
        `)
        .order('name', { ascending: true })

      if (!error && buildingData) {
        // Get email counts for each building
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

            const totalCount = (incomingCount.count || 0) + (sentCount.count || 0)
            
            return {
              id: building.id,
              name: building.name,
              emailCount: totalCount
            }
          })
        )

        // Only show buildings with emails
        const buildingsWithEmails = buildingsWithCounts.filter(building => building.emailCount > 0)
        setBuildings(buildingsWithEmails)
      }
    } catch (error) {
      console.error('Error fetching building folders:', error)
    }
  }

  const fetchTagFolders = async () => {
    try {
      // Get unique tags from incoming emails
      const { data: incomingTags, error: incomingError } = await supabase
        .from('incoming_emails')
        .select('tags')
        .not('tags', 'is', null)

      // Get unique tags from sent emails
      const { data: sentTags, error: sentError } = await supabase
        .from('sent_emails')
        .select('tags')
        .not('tags', 'is', null)

      if (!incomingError && !sentError) {
        const allTags = [...(incomingTags || []), ...(sentTags || [])]
        const tagCounts: { [key: string]: number } = {}

        allTags.forEach(item => {
          if (item.tags && Array.isArray(item.tags)) {
            item.tags.forEach((tag: string) => {
              tagCounts[tag] = (tagCounts[tag] || 0) + 1
            })
          }
        })

        const tagFolders = Object.entries(tagCounts)
          .map(([tag, count]) => ({ tag, emailCount: count }))
          .sort((a, b) => b.emailCount - a.emailCount) // Sort by count descending

        setTags(tagFolders)
      }
    } catch (error) {
      console.error('Error fetching tag folders:', error)
    }
  }

  const fetchFolderCounts = async () => {
    try {
      // Get counts for static folders
      const [inboxCount, handledCount, allCount] = await Promise.all([
        supabase.from('incoming_emails').select('id', { count: 'exact', head: true }), // All emails for inbox
        supabase.from('incoming_emails').select('id', { count: 'exact', head: true }).eq('handled', true),
        supabase.from('incoming_emails').select('id', { count: 'exact', head: true }),
      ])

      setFolderCounts({
        inbox: inboxCount.count || 0, // All emails in inbox
        handled: handledCount.count || 0,
        all: allCount.count || 0,
      })
    } catch (error) {
      console.error('Error fetching folder counts:', error)
    }
  }

  const formatLastSync = (timestamp: string | null) => {
    if (!timestamp) return 'Never'
    const now = new Date()
    const syncTime = new Date(timestamp)
    const diffInMinutes = Math.floor((now.getTime() - syncTime.getTime()) / (1000 * 60))
    if (diffInMinutes < 1) return 'Just now'
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) return `${diffInHours}h ago`
    const diffInDays = Math.floor(diffInHours / 24)
    return `${diffInDays}d ago`
  }

  const getFilterIcon = (filterType: string) => {
    switch (filterType) {
      case 'inbox':
        return <InboxIcon className="h-4 w-4" />
      case 'handled':
        return <CheckCircle className="h-4 w-4" />
      case 'all':
        return <Folder className="h-4 w-4" />
      default:
        if (filterType.startsWith('building-')) {
          return <BuildingIcon className="h-4 w-4" />
        }
        if (filterType.startsWith('tag-')) {
          return <Tag className="h-4 w-4" />
        }
        return <Folder className="h-4 w-4" />
    }
  }

  const getFilterLabel = (filterType: string) => {
    switch (filterType) {
      case 'inbox':
        return 'Inbox'
      case 'handled':
        return 'Handled'
      case 'all':
        return 'All Emails'
      default:
        if (filterType.startsWith('building-')) {
          const buildingId = filterType.replace('building-', '')
          const building = buildings.find(b => b.id === buildingId)
          return building?.name || 'Unknown Building'
        }
        if (filterType.startsWith('tag-')) {
          const tag = filterType.replace('tag-', '')
          return tag
        }
        return 'Unknown'
    }
  }

  const getFilterCount = (filterType: string) => {
    switch (filterType) {
      case 'inbox':
        return folderCounts.inbox // All emails in inbox
      case 'handled':
        return folderCounts.handled
      case 'all':
        return folderCounts.all
      default:
        if (filterType.startsWith('building-')) {
          const buildingId = filterType.replace('building-', '')
          const building = buildings.find(b => b.id === buildingId)
          return building?.emailCount || 0
        }
        if (filterType.startsWith('tag-')) {
          const tag = filterType.replace('tag-', '')
          const tagFolder = tags.find(t => t.tag === tag)
          return tagFolder?.emailCount || 0
        }
        return 0
    }
  }

  return (
    <div className="w-72 border-r bg-white flex flex-col p-4">
      <Card className="w-full p-4 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Folders</h2>
          {loadingFolders && <Loader2 className="h-4 w-4 animate-spin" />}
        </div>

        {/* Static Folders */}
        <div className="space-y-1 mb-4">
          <Button
            variant={currentFilter === 'inbox' ? 'default' : 'ghost'}
            onClick={() => onFilterChange('inbox')}
            className="w-full justify-start h-9"
          >
            <InboxIcon className="h-4 w-4 mr-2" />
            Inbox
            {folderCounts.inbox > 0 && (
              <Badge variant="outline" className="ml-auto text-xs">
                {folderCounts.inbox}
              </Badge>
            )}
          </Button>

          <Button
            variant={currentFilter === 'handled' ? 'default' : 'ghost'}
            onClick={() => onFilterChange('handled')}
            className="w-full justify-start h-9"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Handled
            {folderCounts.handled > 0 && (
              <Badge variant="outline" className="ml-auto text-xs">
                {folderCounts.handled}
              </Badge>
            )}
          </Button>

          <Button
            variant={currentFilter === 'all' ? 'default' : 'ghost'}
            onClick={() => onFilterChange('all')}
            className="w-full justify-start h-9"
          >
            <Folder className="h-4 w-4 mr-2" />
            All Emails
            {folderCounts.all > 0 && (
              <Badge variant="outline" className="ml-auto text-xs">
                {folderCounts.all}
              </Badge>
            )}
          </Button>
        </div>

        {/* Building Folders */}
        {buildings.length > 0 && (
          <>
            <Separator className="my-3" />
            <div className="mb-2">
              <h3 className="text-sm font-medium text-gray-700 mb-2">🏢 By Building</h3>
            </div>
            <div className="space-y-1 mb-4">
              {buildings.map((building) => (
                <Button
                  key={building.id}
                  variant={currentFilter === `building-${building.id}` ? 'default' : 'ghost'}
                  onClick={() => onFilterChange(`building-${building.id}`)}
                  className="w-full justify-start h-9 text-sm"
                >
                  <BuildingIcon className="h-4 w-4 mr-2" />
                  <span className="truncate">{building.name}</span>
                  {building.emailCount > 0 && (
                    <Badge variant="outline" className="ml-auto text-xs">
                      {building.emailCount}
                    </Badge>
                  )}
                </Button>
              ))}
            </div>
          </>
        )}

        {/* Tag Folders */}
        {tags.length > 0 && (
          <>
            <Separator className="my-3" />
            <div className="mb-2">
              <h3 className="text-sm font-medium text-gray-700 mb-2">🔖 By Tag</h3>
            </div>
            <div className="space-y-1">
              {tags.slice(0, 10).map((tagFolder) => ( // Limit to top 10 tags
                <Button
                  key={tagFolder.tag}
                  variant={currentFilter === `tag-${tagFolder.tag}` ? 'default' : 'ghost'}
                  onClick={() => onFilterChange(`tag-${tagFolder.tag}`)}
                  className="w-full justify-start h-9 text-sm"
                >
                  <Tag className="h-4 w-4 mr-2" />
                  <span className="truncate">{tagFolder.tag}</span>
                  {tagFolder.emailCount > 0 && (
                    <Badge variant="outline" className="ml-auto text-xs">
                      {tagFolder.emailCount}
                    </Badge>
                  )}
                </Button>
              ))}
            </div>
          </>
        )}
      </Card>

      {/* Sync Section */}
      <div className="mt-auto">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-blue-900">📧 Outlook Sync</h3>
            {isSyncing && (
              <div className="flex items-center gap-1 text-blue-600">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span className="text-xs">Syncing...</span>
              </div>
            )}
          </div>
          
          <Button
            onClick={onSync}
            disabled={isSyncing}
            variant="outline"
            size="sm"
            className="w-full flex items-center gap-2 bg-white hover:bg-blue-50 border-blue-300 text-blue-700"
          >
            {isSyncing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {isSyncing ? 'Syncing...' : '🔄 Sync Inbox'}
          </Button>
          
          <div className="text-xs text-blue-600 mt-2 text-center">
            {lastSync ? (
              <span>Last synced: {formatDistanceToNow(new Date(lastSync), { addSuffix: true })}</span>
            ) : (
              <span className="text-blue-500">Never synced</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 