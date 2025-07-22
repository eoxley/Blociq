'use client'

import React, { useState } from 'react'
import { Mail, Clock, Building, Eye, EyeOff } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import EmailContextMenu from './EmailContextMenu'

interface Email {
  id: string
  subject: string | null
  from_name: string | null
  from_email: string | null
  received_at: string | null
  body_preview: string | null
  body_full: string | null
  building_id: string | null
  unread: boolean | null
  handled: boolean | null
  tags: string[] | null
  outlook_id: string | null
  buildings?: { name: string } | null
}

interface EmailListItemProps {
  email: Email
  isSelected: boolean
  onSelect: () => void
  dimmed?: boolean
  onTagsUpdated?: () => void
}

export default function EmailListItem({ email, isSelected, onSelect, dimmed, onTagsUpdated }: EmailListItemProps) {
  const [contextMenu, setContextMenu] = useState<{
    isVisible: boolean
    position: { x: number; y: number }
  }>({
    isVisible: false,
    position: { x: 0, y: 0 }
  })
  const formatDate = (dateString: string | null) => {
    if (!dateString) return ''
    
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

  const getSenderInitials = (name: string | null, email: string | null) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    }
    if (email) {
      return email.split('@')[0].slice(0, 2).toUpperCase()
    }
    return '??'
  }

  const truncateText = (text: string | null, maxLength: number = 100) => {
    if (!text) return ''
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    setContextMenu({
      isVisible: true,
      position: { x: e.clientX, y: e.clientY }
    })
  }

  const closeContextMenu = () => {
    setContextMenu({
      isVisible: false,
      position: { x: 0, y: 0 }
    })
  }

  return (
    <>
      <div
        onClick={onSelect}
        onContextMenu={handleContextMenu}
        className={`
          p-3 rounded-lg cursor-pointer transition-all duration-200 border
          ${isSelected 
            ? 'bg-blue-50 border-blue-200 shadow-sm' 
            : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300'
          }
          ${email.unread ? 'border-l-4 border-l-blue-500' : ''}
          ${dimmed ? 'opacity-60 grayscale' : ''}
        `}
      >
      <div className="flex items-start gap-3">
        {/* Sender Avatar */}
        <div className={`
          w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0
          ${email.unread 
            ? 'bg-blue-100 text-blue-700' 
            : 'bg-gray-100 text-gray-600'
          }
        `}>
          {getSenderInitials(email.from_name, email.from_email)}
        </div>

        {/* Email Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="flex items-center gap-2 min-w-0">
              <span className={`
                text-sm font-medium truncate
                ${email.unread ? 'text-gray-900' : 'text-gray-700'}
              `}>
                {email.from_name || email.from_email || 'Unknown Sender'}
              </span>
              {email.unread && (
                <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
              )}
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <span className="text-xs text-gray-500">
                {formatDate(email.received_at)}
              </span>
              {email.unread ? (
                <EyeOff className="h-3 w-3 text-gray-400" />
              ) : (
                <Eye className="h-3 w-3 text-gray-400" />
              )}
            </div>
          </div>

          <h3 className={`
            text-sm font-medium mb-1 truncate
            ${email.unread ? 'text-gray-900' : 'text-gray-700'}
          `}>
            {email.subject || 'No Subject'}
          </h3>

          <p className="text-xs text-gray-600 mb-2 line-clamp-1">
            {truncateText(email.body_preview, 80)}
          </p>

          <div className="flex items-center gap-1 flex-wrap">
            {email.buildings?.name && (
              <Badge variant="outline" className="text-xs px-1 py-0 h-5">
                <Building className="h-2 w-2 mr-1" />
                {email.buildings.name}
              </Badge>
            )}
            
            {email.handled && (
              <Badge variant="outline" className="text-xs bg-green-100 text-green-700 px-1 py-0 h-5">
                Handled
              </Badge>
            )}
            
            {email.tags && email.tags.length > 0 && (
              <Badge variant="outline" className="text-xs px-1 py-0 h-5">
                {email.tags[0]}
                {email.tags.length > 1 && ` +${email.tags.length - 1}`}
              </Badge>
            )}
          </div>
        </div>
      </div>
      </div>

      {/* Context Menu */}
      <EmailContextMenu
        emailId={email.id}
        currentTags={email.tags}
        isVisible={contextMenu.isVisible}
        position={contextMenu.position}
        onClose={closeContextMenu}
        onTagsUpdated={onTagsUpdated}
      />
    </>
  )
} 