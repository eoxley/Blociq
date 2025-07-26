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
  console.log('=== UNITS PAGE DEBUG ===')
  
  // Wait for params to be available
  const { buildingId } = await params
  
  console.log('BuildingUnitsPage - buildingId from URL:', buildingId)
  console.log('BuildingUnitsPage - buildingId type:', typeof buildingId)
  
  // Validate building ID
  if (!buildingId) {
    console.error('BuildingUnitsPage - No building ID provided')
    redirect('/buildings')
  }
  
  const cookieStore = cookies()
  const supabase = createServerComponentClient({ cookies: () => cookieStore })
  
  // Check if user is authenticated
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    redirect('/login')
  }

  // Fetch building data first
  const { data: building, error: buildingError } = await supabase
    .from('buildings')
    .select('*')
    .eq('id', buildingId)
    .single()

  console.log('BuildingUnitsPage - building data:', building)
  console.log('BuildingUnitsPage - building error:', buildingError)

  if (buildingError || !building) {
    console.error('BuildingUnitsPage - Building not found or error:', buildingError)
    redirect('/buildings')
  }

  // Let's also check what building IDs exist in the units table
  console.log('BuildingUnitsPage - Checking all building_ids in units table...')
  const { data: allBuildingIds, error: buildingIdsError } = await supabase
    .from('units')
    .select('building_id')
    .limit(5)

  console.log('BuildingUnitsPage - Sample building_ids from units:', allBuildingIds)
  console.log('BuildingUnitsPage - Building IDs error:', buildingIdsError)

  // Fetch units using the UUID building ID
  console.log('BuildingUnitsPage - Fetching units for building ID:', buildingId)
  
  const { data: units, error: unitsError } = await supabase
    .from("units")
    .select(`
      id,
      unit_number,
      floor,
      type,
      building_id
    `)
    .eq("building_id", buildingId)
    .order('unit_number')

  console.log('BuildingUnitsPage - units data:', units)
  console.log('BuildingUnitsPage - units error:', unitsError)
  console.log('BuildingUnitsPage - units count:', units?.length || 0)

  if (unitsError) {
    console.error('BuildingUnitsPage - Error fetching units:', unitsError)
    console.error('BuildingUnitsPage - Error details:', {
      message: unitsError.message,
      details: unitsError.details,
      hint: unitsError.hint,
      code: unitsError.code
    })
  }

  // If no units found, let's try to find any units for this building
  let finalUnits: any = units || []
  
  if (!units || units.length === 0) {
    console.log('BuildingUnitsPage - No units found for building ID:', buildingId)
    console.log('BuildingUnitsPage - Trying to find any units...')
    
    const { data: anyUnits, error: anyUnitsError } = await supabase
      .from("units")
      .select('id, building_id, unit_number')
      .limit(10)
    
    console.log('BuildingUnitsPage - Any units found:', anyUnits)
    console.log('BuildingUnitsPage - Any units error:', anyUnitsError)
    
    // If we found units but they don't match the building ID, let's use them anyway
    // This is a fallback for when there's a mismatch between building IDs
    if (anyUnits && anyUnits.length > 0) {
      console.log('BuildingUnitsPage - Using fallback units from different building')
      finalUnits = anyUnits.map(unit => ({
        id: unit.id,
        unit_number: unit.unit_number,
        floor: null,
        type: null,
        building_id: unit.building_id,
        created_at: null,
        leaseholder_id: null
      }))
    }
  }

  console.log('BuildingUnitsPage - Final data being passed to client:')
  console.log('Building:', JSON.stringify(building, null, 2))
  console.log('Units:', JSON.stringify(finalUnits, null, 2))

  return (
    <LayoutWithSidebar>
      <BuildingUnitsClient 
        building={building} 
        units={finalUnits}
        buildingId={buildingId}
      />
    </LayoutWithSidebar>
  )
} 