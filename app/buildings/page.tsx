import React from 'react'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Building, Users } from 'lucide-react'

interface Building {
  id: string
  name: string
  address: string
  unit_count: number
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

  // Fetch all buildings
  const { data: buildings, error } = await supabase
    .from('buildings')
    .select('id, name, address, unit_count')
    .order('name')

  if (error) {
    console.error('Error fetching buildings:', error)
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#0F5D5D] mb-2">Buildings</h1>
        <p className="text-gray-600">Manage your property portfolio</p>
      </div>

      {!buildings || buildings.length === 0 ? (
        <div className="text-center py-12">
          <Building className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No buildings yet</h2>
          <p className="text-gray-500">Start by adding one.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {buildings.map((building) => (
            <div key={building.id} className="bg-white p-4 shadow rounded-xl hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-[#0F5D5D]">{building.name}</h2>
                <Building className="h-6 w-6 text-teal-600" />
              </div>
              
              {building.address && (
                <p className="text-gray-600 mb-4">{building.address}</p>
              )}
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-teal-600" />
                  <span className="text-sm font-medium text-gray-700">
                    {building.unit_count || 0} {building.unit_count === 1 ? 'Unit' : 'Units'}
                  </span>
                </div>
                
                <Link 
                  href={`/dashboard/building/${building.id}`}
                  className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm font-medium"
                >
                  View Details
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
} 