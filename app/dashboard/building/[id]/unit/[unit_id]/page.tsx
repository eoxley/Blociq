import React from 'react'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Building2, User, FileText, Mail, Calendar, Phone, Mail as MailIcon } from 'lucide-react'

interface Unit {
  id: string
  unit_number: string
  leaseholder_id: string | null
}

interface Leaseholder {
  id: string
  full_name: string
  email: string
  phone: string
}

interface Lease {
  id: string
  term: string
  start_date: string
  end_date: string
  apportionment: number
}

interface Email {
  id: string
  subject: string
  received_at: string
}

export default async function DashboardUnitPage({ 
  params 
}: { 
  params: Promise<{ id: string; unit_id: string }> 
}) {
  const { id: building_id, unit_id } = await params
  
  const supabase = createServerComponentClient({ cookies })
  
  // Secure the route using Supabase Auth
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect('/login')
  }

  // Get unit data
  const { data: unit } = await supabase
    .from('units')
    .select('id, unit_number, leaseholder_id')
    .eq('id', unit_id)
    .single()

  if (!unit) {
    redirect('/dashboard')
  }

  // Get leaseholder data if unit has a leaseholder
  let leaseholder: Leaseholder | null = null
  if (unit.leaseholder_id) {
    const { data: leaseholderData } = await supabase
      .from('leaseholders')
      .select('id, full_name, email, phone')
      .eq('id', unit.leaseholder_id)
      .single()
    leaseholder = leaseholderData
  }

  // Get lease data
  const { data: lease } = await supabase
    .from('leases')
    .select('id, term, start_date, end_date, apportionment')
    .eq('unit_id', unit_id)
    .single()

  // Get recent emails for this unit
  const { data: emails } = await supabase
    .from('incoming_emails')
    .select('id, subject, received_at')
    .eq('unit_id', unit_id)
    .order('received_at', { ascending: false })
    .limit(5)

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount)
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link 
          href={`/dashboard/building/${building_id}`}
          className="flex items-center gap-2 text-teal-600 hover:text-teal-700 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
          Back to Building
        </Link>
      </div>

      {/* Unit Overview */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl">
            <Building2 className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              🏷️ Unit {unit.unit_number}
            </h1>
            <p className="text-lg text-gray-600">
              Building ID: {building_id}
            </p>
          </div>
        </div>
      </div>

      {/* Leaseholder Information */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
        <h2 className="text-2xl font-semibold text-gray-900 flex items-center gap-2 mb-6">
          <User className="h-6 w-6" />
          👤 Leaseholder Details
        </h2>

        {leaseholder ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-gray-500" />
              <div>
                <p className="font-semibold text-gray-900">{leaseholder.full_name}</p>
                <p className="text-sm text-gray-600">Leaseholder</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <MailIcon className="h-5 w-5 text-gray-500" />
              <div>
                <p className="font-medium text-gray-900">{leaseholder.email}</p>
                <p className="text-sm text-gray-600">Email</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Phone className="h-5 w-5 text-gray-500" />
              <div>
                <p className="font-medium text-gray-900">{leaseholder.phone}</p>
                <p className="text-sm text-gray-600">Phone</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Leaseholder Assigned</h3>
            <p className="text-gray-500">This unit is currently available.</p>
          </div>
        )}
      </div>

      {/* Lease Information */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
        <h2 className="text-2xl font-semibold text-gray-900 flex items-center gap-2 mb-6">
          <FileText className="h-6 w-6" />
          📄 Lease Details
        </h2>

        {lease ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-gray-500" />
              <div>
                <p className="font-semibold text-gray-900">{lease.term}</p>
                <p className="text-sm text-gray-600">Lease Term</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-gray-500" />
                <div>
                  <p className="font-medium text-gray-900">
                    {lease.start_date ? formatDate(lease.start_date) : 'Not specified'}
                  </p>
                  <p className="text-sm text-gray-600">Start Date</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-gray-500" />
                <div>
                  <p className="font-medium text-gray-900">
                    {lease.end_date ? formatDate(lease.end_date) : 'Not specified'}
                  </p>
                  <p className="text-sm text-gray-600">End Date</p>
                </div>
              </div>
            </div>
            
            {lease.apportionment && (
              <div className="flex items-center gap-3">
                <div className="h-5 w-5 text-gray-500">£</div>
                <div>
                  <p className="font-medium text-gray-900">
                    {formatCurrency(lease.apportionment)}
                  </p>
                  <p className="text-sm text-gray-600">Apportionment</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Lease Found</h3>
            <p className="text-gray-500">No lease information is available for this unit.</p>
          </div>
        )}
      </div>

      {/* Recent Emails */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-2xl font-semibold text-gray-900 flex items-center gap-2 mb-6">
          <Mail className="h-6 w-6" />
          ✉️ Recent Emails
        </h2>

        {emails && emails.length > 0 ? (
          <div className="space-y-4">
            {emails.map((email) => (
              <div key={email.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-gray-900">{email.subject}</h3>
                  <span className="text-sm text-gray-500">
                    {email.received_at ? formatDate(email.received_at) : 'No date'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Mail className="h-4 w-4" />
                  <span>Received {email.received_at ? formatDate(email.received_at) : 'Unknown date'}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Recent Emails</h3>
            <p className="text-gray-500">No emails have been received for this unit.</p>
          </div>
        )}
      </div>
    </div>
  )
} 