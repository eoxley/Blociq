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
  
  // Simple test to see if page loads
  console.log('=== PAGE LOADED ===')
  console.log('BuildingUnitsPage - buildingId:', buildingId)
  console.log('BuildingUnitsPage - buildingId type:', typeof buildingId)
  
  const supabase = createServerComponentClient({ cookies })
  
  // Check if user is authenticated - TEMPORARILY DISABLED FOR DEBUGGING
  // const { data: { user } } = await supabase.auth.getUser()
  // if (!user) {
  //   redirect('/login')
  // }

  // Simple test query first
  console.log('BuildingUnitsPage - Testing simple query...')
  const { data: simpleTest, error: simpleError } = await supabase
    .from('units')
    .select('count')
    .eq('building_id', buildingId)

  console.log('BuildingUnitsPage - Simple test result:', simpleTest)
  console.log('BuildingUnitsPage - Simple test error:', simpleError)

  // Fetch building data
  const { data: building, error: buildingError } = await supabase
    .from('buildings')
    .select('*')
    .eq('id', buildingId)
    .single()

  // Debug logging
  console.log('BuildingUnitsPage - building data:', building)
  console.log('BuildingUnitsPage - building error:', buildingError)

  if (buildingError || !building) {
    console.log('BuildingUnitsPage - redirecting to /buildings due to building error')
    redirect('/buildings')
  }

  // Test direct query first
  console.log('BuildingUnitsPage - Testing direct query...')
  const { data: testUnits, error: testError } = await supabase
    .from('units')
    .select('*')
    .eq('building_id', buildingId)

  console.log('BuildingUnitsPage - Direct units query result:', testUnits)
  console.log('BuildingUnitsPage - Direct units query error:', testError)

  // Fetch units for this building with leaseholders
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

  // Debug logging
  console.log('BuildingUnitsPage - units data:', units)
  console.log('BuildingUnitsPage - units error:', unitsError)
  console.log('BuildingUnitsPage - units count:', units?.length || 0)

  if (unitsError) {
    console.error('Error fetching units:', unitsError)
  }

  // Test data structure
  console.log('BuildingUnitsPage - Final data being passed to client:')
  console.log('Building:', JSON.stringify(building, null, 2))
  console.log('Units:', JSON.stringify(units, null, 2))

  return (
    <LayoutWithSidebar>
      <BuildingUnitsClient 
        building={building} 
        units={units || []}
      />
    </LayoutWithSidebar>
  )
} 