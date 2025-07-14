import React from 'react'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Building, Users, Mail, Calendar, Shield } from 'lucide-react'

interface Building {
  id: string
  name: string
  address: string
  service_charge_year_end?: string
  section_20_threshold?: number
  insurance_renewal_date?: string
  property_account_balance?: number
  ews1_status?: string
  fire_door_survey?: string
  gas_eicr_status?: string
}

interface Unit {
  id: string
  unit_number: string
  type: string
  floor: string
  leaseholders: Array<{
    full_name: string
    email: string
    phone: string
  }>
}

export default async function BuildingDetailPage({ 
  params 
}: { 
  params: Promise<{ buildingId: string }> 
}) {
  const { buildingId } = await params
  console.log('🔍 BuildingDetailPage: buildingId =', buildingId)
  
  const supabase = createServerComponentClient({ cookies })
  
  // Secure the route using Supabase Auth
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect('/login')
  }
  
  console.log('🔍 BuildingDetailPage: session =', session ? 'authenticated' : 'not authenticated')

  // Fetch building data
  const { data: building, error: buildingError } = await supabase
    .from('buildings')
    .select('*')
    .eq('id', buildingId)
    .single()

  console.log('🔍 BuildingDetailPage: building query result =', { 
    building: building ? { id: building.id, name: building.name } : null, 
    error: buildingError 
  })

  if (buildingError || !building) {
    console.log('🔍 BuildingDetailPage: redirecting to buildings list - building not found')
    redirect('/buildings')
  }

  // Fetch units for this building
  const { data: units, error: unitsError } = await supabase
    .from('units')
    .select(`
      id,
      unit_number,
      type,
      floor,
      leaseholders!inner(full_name, email, phone)
    `)
    .eq('building_id', buildingId)
    .order('unit_number')

  console.log('🔍 BuildingDetailPage: units query result =', { 
    unitsCount: units?.length || 0, 
    error: unitsError 
  })

  if (unitsError) {
    console.error('Error fetching units:', unitsError)
  }

  // Fetch recent emails for this building
  const { data: recentEmails, error: emailsError } = await supabase
    .from('incoming_emails')
    .select('*')
    .eq('building_id', buildingId)
    .order('created_at', { ascending: false })
    .limit(5)

  console.log('🔍 BuildingDetailPage: emails query result =', { 
    emailsCount: recentEmails?.length || 0, 
    error: emailsError 
  })

  if (emailsError) {
    console.error('Error fetching emails:', emailsError)
  }

  console.log('🔍 BuildingDetailPage: rendering page with data')

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Debug Info */}
      <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-2 rounded mb-4">
        <p><strong>Debug:</strong> Building ID: {buildingId}</p>
        <p><strong>Debug:</strong> Building Name: {building.name}</p>
        <p><strong>Debug:</strong> Units found: {units?.length || 0}</p>
        <p><strong>Debug:</strong> Emails found: {recentEmails?.length || 0}</p>
      </div>

      {/* Building Overview Header */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
        <div className="flex items-center gap-4 mb-4">
          <Link 
            href="/buildings" 
            className="flex items-center gap-2 text-[#0F5D5D] hover:text-teal-700 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            Back to Buildings
          </Link>
        </div>
        
        <div className="border-b border-gray-200 pb-4">
          <h1 className="text-3xl font-bold text-[#0F5D5D] mb-2">
            {building.name}
          </h1>
          <p className="text-lg text-gray-600">
            {building.address}
          </p>
        </div>
      </div>

      {/* Units Section */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold text-[#0F5D5D] flex items-center gap-2">
            <Users className="h-6 w-6" />
            Units ({units?.length || 0})
          </h2>
        </div>

        {!units || units.length === 0 ? (
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Units Found</h3>
            <p className="text-gray-500">No units have been added to this building yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {units.map((unit) => (
              <div key={unit.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-900">{unit.unit_number}</h3>
                  <span className="text-xs bg-teal-100 text-teal-800 px-2 py-1 rounded">
                    {unit.type}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-2">Floor {unit.floor}</p>
                {unit.leaseholders && unit.leaseholders.length > 0 ? (
                  <div className="text-sm text-gray-700">
                    <p className="font-medium">{unit.leaseholders[0].full_name}</p>
                    <p className="text-gray-600">{unit.leaseholders[0].email}</p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic">No leaseholder assigned</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center gap-3 mb-3">
            <Calendar className="h-6 w-6 text-teal-600" />
            <h3 className="font-semibold text-[#0F5D5D]">Service Charge Year End</h3>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {building.service_charge_year_end ? formatDate(building.service_charge_year_end) : '31 March 2025'}
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center gap-3 mb-3">
            <Shield className="h-6 w-6 text-teal-600" />
            <h3 className="font-semibold text-[#0F5D5D]">Section 20 Threshold</h3>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {building.section_20_threshold ? formatCurrency(building.section_20_threshold) : '£250'}
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center gap-3 mb-3">
            <Shield className="h-6 w-6 text-teal-600" />
            <h3 className="font-semibold text-[#0F5D5D]">Insurance Renewal</h3>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {building.insurance_renewal_date ? formatDate(building.insurance_renewal_date) : '15 August 2025'}
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center gap-3 mb-3">
            <Building className="h-6 w-6 text-teal-600" />
            <h3 className="font-semibold text-[#0F5D5D]">Account Balance</h3>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {building.property_account_balance ? formatCurrency(building.property_account_balance) : '£23,500'}
          </p>
        </div>
      </div>

      {/* Recent Emails Section */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-[#0F5D5D] flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Recent Emails
          </h2>
        </div>

        {recentEmails && recentEmails.length > 0 ? (
          <div className="space-y-3">
            {recentEmails.slice(0, 3).map((email) => (
              <div key={email.id} className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-medium text-sm text-gray-900">{email.subject}</p>
                  <span className="text-xs text-gray-500">{email.sender}</span>
                </div>
                <p className="text-sm text-gray-600 line-clamp-2">{email.preview}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Recent Emails</h3>
            <p className="text-gray-500">No emails have been received for this building.</p>
          </div>
        )}
      </div>
    </div>
  )
} 