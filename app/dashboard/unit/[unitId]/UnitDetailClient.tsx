'use client'

import * as React from 'react'
import { Mail, FileText, User, Phone, Calendar, FilePlus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type Leaseholder = {
  id: string
  name: string | null
  email: string | null
  phone: string | null
}

type Lease = {
  id: string
  start_date: string | null
  expiry_date: string | null
  apportionment: number | null
  term: string | null
}

type Email = {
  id: string
  subject: string | null
  body_preview: string | null
  created_at: string | null
}

type Unit = {
  id: string
  unit_number: string
}

interface UnitDetailClientProps {
  unit: Unit
  leaseholders: Leaseholder[]
  lease: Lease | null
  emails: Email[]
}

export default function UnitDetailClient({ unit, leaseholders, lease, emails }: UnitDetailClientProps) {
  return (
    <div className="max-w-3xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <FileText className="h-8 w-8 text-teal-600" />
        <h1 className="text-3xl font-bold text-gray-900">Unit {unit.unit_number}</h1>
      </div>

      {/* Leaseholder Info */}
      <Card>
        <CardHeader>
          <CardTitle>Leaseholder</CardTitle>
        </CardHeader>
        <CardContent>
          {leaseholders.length > 0 ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-lg font-medium text-gray-800">
                <User className="h-5 w-5 text-gray-500" />
                {leaseholders[0].name || 'Unknown'}
              </div>
              {leaseholders[0].email && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Mail className="h-4 w-4 text-gray-400" />
                  {leaseholders[0].email}
                </div>
              )}
              {leaseholders[0].phone && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Phone className="h-4 w-4 text-gray-400" />
                  {leaseholders[0].phone}
                </div>
              )}
            </div>
          ) : (
            <div className="text-gray-500 italic">No leaseholder assigned</div>
          )}
        </CardContent>
      </Card>

      {/* Lease Info */}
      <Card>
        <CardHeader>
          <CardTitle>Lease Details</CardTitle>
        </CardHeader>
        <CardContent>
          {lease ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-500">Start Date</div>
                <div className="font-medium text-gray-900">{lease.start_date ? new Date(lease.start_date).toLocaleDateString() : '-'}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">End Date</div>
                <div className="font-medium text-gray-900">{lease.expiry_date ? new Date(lease.expiry_date).toLocaleDateString() : '-'}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Term</div>
                <div className="font-medium text-gray-900">{lease.term || '-'}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Apportionment</div>
                <div className="font-medium text-gray-900">{lease.apportionment ? lease.apportionment + '%' : '-'}</div>
              </div>
            </div>
          ) : (
            <div className="text-gray-500 italic">No lease details found</div>
          )}
        </CardContent>
      </Card>

      {/* Recent Correspondence */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Correspondence</CardTitle>
        </CardHeader>
        <CardContent>
          {emails.length > 0 ? (
            <div className="space-y-3">
              {emails.map(email => (
                <div key={email.id} className="border-b pb-2 last:border-b-0 last:pb-0">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-teal-600" />
                    <span className="font-medium text-gray-800">{email.subject || 'No subject'}</span>
                    <span className="ml-auto text-xs text-gray-400">{email.created_at ? new Date(email.created_at).toLocaleDateString() : ''}</span>
                  </div>
                  <div className="text-sm text-gray-600 truncate">
                    {email.body_preview || 'No preview available'}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-gray-500 italic">No recent correspondence</div>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-4 mt-6">
        <button className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg shadow hover:bg-teal-700 transition">
          <Mail className="h-4 w-4" />
          Send Email
        </button>
        <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg shadow hover:bg-gray-200 transition">
          <FileText className="h-4 w-4" />
          View Lease
        </button>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg shadow hover:bg-blue-200 transition">
          <FilePlus className="h-4 w-4" />
          Add Note
        </button>
      </div>
    </div>
  )
} 