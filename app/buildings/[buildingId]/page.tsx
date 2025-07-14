import React from 'react'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Building, Users } from 'lucide-react'

interface Unit {
  id: string
  unit_number: string
  leaseholder_id: string | null
}

interface Leaseholder {
  id: string
  full_name: string
  email: string
}

interface Building {
  id: string
  name: string
  address: string
}

export default async function BuildingDetailPage({ 
  params 
}: { 
  params: Promise<{ buildingId: string }> 
}) {
  const { buildingId } = await params
  const supabase = createServerComponentClient({ cookies })
  
  // Check if user is authenticated
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  // Fetch building data
  const { data: building, error: buildingError } = await supabase
    .from('buildings')
    .select('id, name, address')
    .eq('id', buildingId)
    .single()

  if (buildingError || !building) {
    redirect('/buildings')
  }

  // Fetch all units for this building
  const { data: units, error: unitsError } = await supabase
    .from('units')
    .select('id, unit_number, leaseholder_id')
    .eq('building_id', buildingId)

  if (unitsError) {
    console.error('Error fetching units:', unitsError)
  }

  // If no units found, show fallback
  if (!units || units.length === 0) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-6">
          <Link 
            href="/buildings" 
            className="flex items-center gap-2 text-[#0F5D5D] hover:text-teal-700 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            Back to Buildings
          </Link>
        </div>
        
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <Building className="h-6 w-6 text-teal-600" />
            <h1 className="text-2xl font-bold text-[#0F5D5D]">{building.name}</h1>
          </div>
          <p className="text-gray-600 mb-6">{building.address}</p>
          
          <div className="text-center py-12">
            <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No Units Found</h2>
            <p className="text-gray-500">No units have been added to this building yet.</p>
          </div>
        </div>
      </div>
    )
  }

  // Get unique leaseholder IDs from units
  const leaseholderIds = units
    .map(unit => unit.leaseholder_id)
    .filter(id => id !== null) as string[]

  // Fetch leaseholders for these units
  let leaseholders: Leaseholder[] = []
  if (leaseholderIds.length > 0) {
    const { data: leaseholdersData, error: leaseholdersError } = await supabase
      .from('leaseholders')
      .select('id, full_name, email')
      .in('id', leaseholderIds)

    if (leaseholdersError) {
      console.error('Error fetching leaseholders:', leaseholdersError)
    } else {
      leaseholders = leaseholdersData || []
    }
  }

  // Create a map for quick leaseholder lookup
  const leaseholderMap = new Map(
    leaseholders.map(leaseholder => [leaseholder.id, leaseholder])
  )

  // Merge units with leaseholder data
  const unitsWithLeaseholders = units.map(unit => ({
    ...unit,
    leaseholder: unit.leaseholder_id ? leaseholderMap.get(unit.leaseholder_id) : null
  }))

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <Link 
          href="/buildings" 
          className="flex items-center gap-2 text-[#0F5D5D] hover:text-teal-700 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
          Back to Buildings
        </Link>
      </div>
      
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <Building className="h-6 w-6 text-teal-600" />
          <h1 className="text-2xl font-bold text-[#0F5D5D]">{building.name}</h1>
        </div>
        <p className="text-gray-600 mb-6">{building.address}</p>
        
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-[#0F5D5D] flex items-center gap-2 mb-4">
            <Users className="h-5 w-5" />
            Units ({units.length})
          </h2>
          
          <div className="space-y-3">
            {unitsWithLeaseholders.map((unit) => (
              <div key={unit.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-gray-900">Flat {unit.unit_number}</span>
                  <span className="text-gray-400">—</span>
                  {unit.leaseholder ? (
                    <span className="text-gray-700">
                      {unit.leaseholder.full_name} ({unit.leaseholder.email})
                    </span>
                  ) : (
                    <span className="text-gray-500 italic">No leaseholder assigned</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
} 