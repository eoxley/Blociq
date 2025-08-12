'use client'

import React, { useState } from 'react'
import {
  Inbox as InboxIcon,
  CheckCircle,
  Folder,
  Building as BuildingIcon,
  Tag,
  RefreshCw,
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
  emails: any[] // Add emails prop to get data from parent
}

export default function FolderSidebar({
  currentFilter,
  onFilterChange,
  onSync,
  isSyncing,
  lastSync,
  emails,
}: FolderSidebarProps) {


  // Calculate folder counts from the emails prop
  const folderCounts = React.useMemo(() => {
    if (!emails || emails.length === 0) {
      return {
        inbox: 0,
        handled: 0,
        all: 0,
        archived: 0,
        complaints: 0,
        queries: 0,
        actionRequired: 0,
        flagged: 0
      }
    }

    return {
      all: emails.length,
      inbox: emails.filter(email => !email.is_read || email.unread).length,
      handled: emails.filter(email => email.is_handled || email.handled).length,
      flagged: emails.filter(email => email.flag_status === 'flagged').length,
      archived: emails.filter(email => email.flag_status === 'archived').length,
      complaints: emails.filter(email => email.categories?.includes('complaint')).length,
      queries: emails.filter(email => email.categories?.includes('query')).length,
      actionRequired: emails.filter(email => !email.is_handled && !email.handled).length
    }
  }, [emails])

  // Calculate building folders from emails
  const buildings = React.useMemo(() => {
    if (!emails || emails.length === 0) return []
    
    const buildingMap = new Map<string, { id: string, name: string, emailCount: number }>()
    
    emails.forEach(email => {
      if (email.building_id) {
        const buildingId = email.building_id.toString()
        const existing = buildingMap.get(buildingId)
        
        if (existing) {
          existing.emailCount++
        } else {
          buildingMap.set(buildingId, {
            id: buildingId,
            name: email.building_name || `Building ${buildingId}`,
            emailCount: 1
          })
        }
      }
    })
    
    return Array.from(buildingMap.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [emails])

  // Calculate tag folders from emails
  const tags = React.useMemo(() => {
    if (!emails || emails.length === 0) return []
    
    const tagMap = new Map<string, number>()
    
    emails.forEach(email => {
      if (email.categories && Array.isArray(email.categories)) {
        email.categories.forEach(tag => {
          tagMap.set(tag, (tagMap.get(tag) || 0) + 1)
        })
      }
    })
    
    return Array.from(tagMap.entries()).map(([tag, count]) => ({
      tag,
      emailCount: count
    })).sort((a, b) => a.tag.localeCompare(b.tag))
  }, [emails])



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

      {/* Debug Info - Remove this after testing */}
      {emails && emails.length > 0 && (
        <Card className="p-4 bg-blue-50 border-blue-200">
          <h3 className="font-semibold text-blue-900 mb-2">Debug Info</h3>
          <p className="text-xs text-blue-700">
            Total emails: {emails.length}<br/>
            Inbox: {folderCounts.inbox}<br/>
            Handled: {folderCounts.handled}<br/>
            Flagged: {folderCounts.flagged}<br/>
            Buildings: {buildings.length}<br/>
            Tags: {tags.length}
          </p>
        </Card>
      )}
    </div>
  )
} 