import { ReactNode } from 'react'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import BuildingNavigation from './components/BuildingNavigation'

interface BuildingLayoutProps {
  children: ReactNode
  params: {
    id: string
  }
}

export default async function BuildingLayout({
  children,
  params
}: BuildingLayoutProps) {
  const supabase = createClient(cookies())

  // Get building name
  let buildingName = 'Building'
  try {
    const { data: building } = await supabase
      .from('buildings')
      .select('name')
      .eq('id', params.id)
      .single()

    if (building) {
      buildingName = building.name
    }
  } catch (error) {
    console.warn('Could not fetch building name:', error)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <BuildingNavigation buildingId={params.id} buildingName={buildingName} />

      {/* Page Content */}
      <div className="max-w-7xl mx-auto p-6">
        {children}
      </div>
    </div>
  )
}