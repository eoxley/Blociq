import React from 'react'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Building, Users, Mail, Calendar } from 'lucide-react'

interface Building {
  id: string
  name: string
  address: string
  units_count: number
  recent_emails_count: number
}

export default async function BuildingsPage() {
  const supabase = createServerComponentClient({ cookies })
  
  // Check if user is authenticated
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  // Fetch all buildings with unit counts
  const { data: buildings, error } = await supabase
    .from('buildings')
    .select(`
      id,
      name,
      address,
      units!inner(count)
    `)
    .order('name')

  if (error) {
    console.error('Error fetching buildings:', error)
  }

  // Get recent email counts for each building
  const buildingsWithData = await Promise.all(
    (buildings || []).map(async (building) => {
      const { count: recentEmailsCount } = await supabase
        .from('incoming_emails')
        .select('*', { count: 'exact', head: true })
        .eq('building_id', building.id)
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())

      return {
        id: building.id,
        name: building.name,
        address: building.address,
        units_count: building.units?.length || 0,
        recent_emails_count: recentEmailsCount || 0
      }
    })
  )

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#0F5D5D] mb-2">Buildings</h1>
        <p className="text-gray-600">Manage your property portfolio</p>
      </div>

      {buildingsWithData.length === 0 ? (
        <div className="text-center py-12">
          <Building className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No Buildings Found</h2>
          <p className="text-gray-500">No buildings have been added to your portfolio yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {buildingsWithData.map((building) => (
            <Link 
              key={building.id} 
              href={`/buildings/${building.id}`}
              className="block bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-200"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-[#0F5D5D]">{building.name}</h2>
                  <Building className="h-6 w-6 text-teal-600" />
                </div>
                
                <p className="text-gray-600 mb-4">{building.address}</p>
                
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    <span>{building.units_count} units</span>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <Mail className="h-4 w-4" />
                    <span>{building.recent_emails_count} recent emails</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
} 