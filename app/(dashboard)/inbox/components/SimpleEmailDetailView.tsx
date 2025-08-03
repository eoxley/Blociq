'use client'

import React from 'react'

type Email = {
  id: string
  from_email: string | null
  from_name: string | null
  subject: string | null
  body_preview: string | null
  body_full: string | null
  received_at: string | null
  unread: boolean | null
  handled: boolean | null
  pinned: boolean | null
  flag_status: string | null
  categories: string[] | null
  building_id: number | null
  unit_id: number | null
  leaseholder_id: string | null
  buildings?: { name: string } | null
  units?: { unit_number: string } | null
  leaseholders?: { name: string; email: string } | null
}

interface SimpleEmailDetailViewProps {
  email: Email
}

export default function SimpleEmailDetailView({ email }: SimpleEmailDetailViewProps) {
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Unknown date'
    return new Date(dateString).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="space-y-6">
      {/* Email Header */}
      <div className="border-b border-gray-200 pb-4">
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          {email.subject || 'No subject'}
        </h2>
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <span className="font-medium">
            From: {email.from_name || email.from_email || 'Unknown sender'}
          </span>
          <span>•</span>
          <span>{formatDate(email.received_at)}</span>
          {email.unread && (
            <>
              <span>•</span>
              <span className="text-blue-600 font-medium">Unread</span>
            </>
          )}
        </div>
      </div>

      {/* Email Body */}
      <div className="prose max-w-none">
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-3">Email Content</h3>
          <div className="text-gray-700 whitespace-pre-wrap">
            {email.body_full || email.body_preview || 'No content available'}
          </div>
        </div>
      </div>

      {/* Email Metadata */}
      <div className="border-t border-gray-200 pt-4">
        <h3 className="text-lg font-semibold mb-3">Details</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-600">Status:</span>
            <span className="ml-2">
              {email.handled ? 'Handled' : 'Pending'}
            </span>
          </div>
          <div>
            <span className="font-medium text-gray-600">Flagged:</span>
            <span className="ml-2">
              {email.flag_status === 'flagged' ? 'Yes' : 'No'}
            </span>
          </div>
          {email.categories && email.categories.length > 0 && (
            <div className="col-span-2">
              <span className="font-medium text-gray-600">Categories:</span>
              <div className="flex gap-2 mt-1">
                {email.categories.map((category, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs"
                  >
                    {category}
                  </span>
                ))}
              </div>
            </div>
          )}
          {email.buildings?.name && (
            <div className="col-span-2">
              <span className="font-medium text-gray-600">Building:</span>
              <span className="ml-2">{email.buildings.name}</span>
            </div>
          )}
          {email.units?.unit_number && (
            <div className="col-span-2">
              <span className="font-medium text-gray-600">Unit:</span>
              <span className="ml-2">{email.units.unit_number}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 