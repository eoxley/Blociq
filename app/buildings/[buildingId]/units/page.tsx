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
  
  // 1. Log the current building ID being passed into the units query
  console.log('=== UNITS PAGE DEBUG ===')
  console.log('BuildingUnitsPage - buildingId:', buildingId)
  console.log('BuildingUnitsPage - buildingId type:', typeof buildingId)
  
  const supabase = createServerComponentClient({ cookies })
  
  // Check if user is authenticated - TEMPORARILY DISABLED FOR DEBUGGING
  // const { data: { user } } = await supabase.auth.getUser()
  // if (!user) {
  //   redirect('/login')
  // }

  // Debug: Check what buildings exist
  const { data: allBuildings, error: buildingsError } = await supabase
    .from('buildings')
    .select('id, name')
    .order('name')
  
  console.log('BuildingUnitsPage - All buildings in database:', allBuildings)
  console.log('BuildingUnitsPage - Buildings error:', buildingsError)

  // Debug: Check what units exist
  const { data: allUnits, error: unitsError } = await supabase
    .from('units')
    .select('id, building_id, unit_number')
    .order('building_id')
  
  console.log('BuildingUnitsPage - All units in database:', allUnits)
  console.log('BuildingUnitsPage - Units error:', unitsError)

  // Fetch building data first
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

  // Try to convert building ID to number for units query (since units.building_id is number)
  // But first check if the building ID is numeric
  const buildingIdNum = parseInt(buildingId, 10)
  const isNumericBuildingId = !isNaN(buildingIdNum)
  
  console.log('BuildingUnitsPage - buildingId is numeric:', isNumericBuildingId)
  console.log('BuildingUnitsPage - Converted buildingId to number:', buildingIdNum)

  // 2. Add console.log("Units:", units) after the query
  // 3. Confirm the query looks like the requested format
  let unitsQuery
  if (isNumericBuildingId) {
    // If building ID is numeric, use it as number for units query
    unitsQuery = supabase
      .from("units")
      .select("*")
      .eq("building_id", buildingIdNum)
  } else {
    // If building ID is not numeric (UUID), we need to handle this differently
    // For now, let's try to find units by building name or other means
    console.log('BuildingUnitsPage - Building ID is not numeric, trying alternative query')
    unitsQuery = supabase
      .from("units")
      .select("*")
      .eq("building_id", buildingId) // Try as string first
  }

  const { data: units, error: unitsQueryError } = await unitsQuery

  console.log("Units:", units)
  console.log('BuildingUnitsPage - units error:', unitsQueryError)
  console.log('BuildingUnitsPage - units count:', units?.length || 0)

  if (unitsQueryError) {
    console.error('Error fetching units:', unitsQueryError)
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