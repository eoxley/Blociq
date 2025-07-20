'use client'

import React from 'react'
import { Mail, Clock, Building, Eye, EyeOff } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface Email {
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

interface EmailListItemProps {
  email: Email
  isSelected: boolean
  onSelect: () => void
  dimmed?: boolean
}

export default function EmailListItem({ email, isSelected, onSelect, dimmed }: EmailListItemProps) {
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

  return (
    <div
      onClick={onSelect}
      className={`
        p-4 rounded-lg cursor-pointer transition-all duration-200 border
        ${isSelected 
          ? 'bg-blue-50 border-blue-200 shadow-sm' 
          : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300'
        }
        ${!email.is_read ? 'border-l-4 border-l-blue-500' : ''}
        ${dimmed ? 'opacity-60 grayscale' : ''}
      `}
    >
      <div className="flex items-start gap-3">
        {/* Sender Avatar */}
        <div className={`
          w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium
          ${!email.is_read 
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
                font-medium truncate
                ${!email.is_read ? 'text-gray-900' : 'text-gray-700'}
              `}>
                {email.from_name || email.from_email || 'Unknown Sender'}
              </span>
              {!email.is_read && (
                <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-xs text-gray-500">
                {formatDate(email.received_at)}
              </span>
              {!email.is_read ? (
                <EyeOff className="h-3 w-3 text-gray-400" />
              ) : (
                <Eye className="h-3 w-3 text-gray-400" />
              )}
            </div>
          </div>

          <h3 className={`
            font-medium mb-1 truncate
            ${!email.is_read ? 'text-gray-900' : 'text-gray-700'}
          `}>
            {email.subject || 'No Subject'}
          </h3>

          <p className="text-sm text-gray-600 mb-2 line-clamp-2">
            {truncateText(email.body_preview, 120)}
          </p>

          <div className="flex items-center gap-2">
            {email.buildings?.name && (
              <Badge variant="outline" className="text-xs">
                <Building className="h-3 w-3 mr-1" />
                {email.buildings.name}
              </Badge>
            )}
            
            {email.is_handled && (
              <Badge variant="outline" className="text-xs bg-green-100 text-green-700">
                Handled
              </Badge>
            )}
            
            {email.tags && email.tags.length > 0 && (
              <Badge variant="outline" className="text-xs">
                {email.tags[0]}
                {email.tags.length > 1 && ` +${email.tags.length - 1}`}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 