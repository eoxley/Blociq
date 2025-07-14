import React from 'react'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Building, Users, Calendar, FileText, AlertTriangle } from 'lucide-react'

interface Building {
  id: string
  name: string
  address: string
  unit_count: number
  last_compliance_upload?: string
  upcoming_events_count?: number
  next_expiry_days?: number | null
}

export default async function BuildingsPage() {
  const supabase = createServerComponentClient({ cookies })
  
  // Check if user is authenticated
  const {
    data: { session }
  } = await supabase.auth.getSession()
  
  if (!session) {
    redirect('/login')
  }

  // Fetch all buildings with basic info
  const { data: buildings, error } = await supabase
    .from('buildings')
    .select('id, name, address')
    .order('name')

  if (error) {
    console.error('Error fetching buildings:', error)
  }

  // Get additional data for each building
  const buildingsWithData = await Promise.all(
    (buildings || []).map(async (building) => {
      // Get unit count
      const { count: unitCount } = await supabase
        .from('units')
        .select('*', { count: 'exact', head: true })
        .eq('building_id', building.id)

      // Get latest compliance document
      const { data: latestCompliance } = await supabase
        .from('compliance_docs')
        .select('last_uploaded_at')
        .eq('building_id', building.id)
        .order('last_uploaded_at', { ascending: false })
        .limit(1)
        .single()

      // Get upcoming diary entries (next 30 days)
      const thirtyDaysFromNow = new Date()
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)
      
      const { data: upcomingEvents } = await supabase
        .from('diary_entries')
        .select('*')
        .eq('building_id', building.id)
        .gte('event_date', new Date().toISOString())
        .lte('event_date', thirtyDaysFromNow.toISOString())
        .order('event_date', { ascending: true })

      // Find next expiry
      const nextExpiry = upcomingEvents?.find(event => 
        event.event_type === 'expiry' || 
        event.title?.toLowerCase().includes('expiry')
      )

      const nextExpiryDays = nextExpiry ? 
        Math.ceil((new Date(nextExpiry.event_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 
        null

      return {
        id: building.id,
        name: building.name,
        address: building.address,
        unit_count: unitCount || 0,
        last_compliance_upload: latestCompliance?.last_uploaded_at,
        upcoming_events_count: upcomingEvents?.length || 0,
        next_expiry_days: nextExpiryDays
      }
    })
  )

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long'
    })
  }

  const getSummaryString = (building: Building) => {
    const parts: string[] = []
    
    if (building.last_compliance_upload) {
      parts.push(`Last RCA uploaded ${formatDate(building.last_compliance_upload)}`)
    }
    
    if (building.next_expiry_days && building.next_expiry_days <= 30) {
      parts.push(`${building.next_expiry_days} expiry in ${building.next_expiry_days} days`)
    }
    
    if (building.upcoming_events_count && building.upcoming_events_count > 0) {
      parts.push(`${building.upcoming_events_count} upcoming events`)
    }
    
    return parts.length > 0 ? parts.join('. ') + '.' : 'No recent activity.'
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#0F5D5D] mb-2">Building Dashboard</h1>
        <p className="text-gray-600">Manage your property portfolio and compliance</p>
      </div>

      {buildingsWithData.length === 0 ? (
        <div className="text-center py-12">
          <Building className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No buildings yet</h2>
          <p className="text-gray-500">Start by adding your first one!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {buildingsWithData.map((building) => (
            <Link 
              key={building.id} 
              href={`/dashboard/building/${building.id}`}
              className="block bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:bg-gray-50"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-[#0F5D5D]">{building.name}</h2>
                  <Building className="h-6 w-6 text-teal-600" />
                </div>
                
                {building.address && (
                  <p className="text-gray-600 mb-4">{building.address}</p>
                )}
                
                <div className="flex items-center gap-2 mb-4">
                  <Users className="h-4 w-4 text-teal-600" />
                  <span className="text-sm font-medium text-gray-700">
                    {building.unit_count} {building.unit_count === 1 ? 'Unit' : 'Units'}
                  </span>
                </div>

                <div className="space-y-2">
                  {building.last_compliance_upload && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <FileText className="h-4 w-4" />
                      <span>Last RCA: {formatDate(building.last_compliance_upload)}</span>
                    </div>
                  )}
                  
                  {building.upcoming_events_count && building.upcoming_events_count > 0 && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="h-4 w-4" />
                      <span>{building.upcoming_events_count} upcoming events</span>
                    </div>
                  )}
                  
                  {building.next_expiry_days && building.next_expiry_days <= 30 && (
                    <div className="flex items-center gap-2 text-sm text-orange-600">
                      <AlertTriangle className="h-4 w-4" />
                      <span>Expiry in {building.next_expiry_days} days</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-sm text-gray-500">
                    {getSummaryString(building)}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
} 