import LayoutWithSidebar from '@/components/LayoutWithSidebar'
import BuildingUnitsClient from './BuildingUnitsClient'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function BuildingUnitsPage({ 
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
    .select('*')
    .eq('id', buildingId)
    .single()

  if (buildingError || !building) {
    redirect('/buildings')
  }

  // Fetch units for this building
  const { data: units, error: unitsError } = await supabase
    .from('units')
    .select(`
      *,
      leaseholders (
        name,
        email,
        phone
      )
    `)
    .eq('building_id', buildingId)
    .order('unit_number')

  if (unitsError) {
    console.error('Error fetching units:', unitsError)
  }

  return (
    <LayoutWithSidebar>
      <BuildingUnitsClient 
        building={building} 
        units={units || []}
      />
    </LayoutWithSidebar>
  )
} 