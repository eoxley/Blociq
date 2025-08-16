import LayoutWithSidebar from '@/components/LayoutWithSidebar'
import BuildingUnitsClient from './BuildingUnitsClient'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function BuildingUnitsPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  console.log('=== UNITS PAGE DEBUG ===')
  
  // Wait for params to be available
  const { id: buildingId } = await params
  
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
    console.log('BuildingUnitsPage - No session found, redirecting to login')
    redirect('/login')
  }

  console.log('BuildingUnitsPage - User authenticated:', session.user.email)

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

  // Use the units directly - no fallback needed since we know they exist
  const finalUnits = units || []

  console.log('BuildingUnitsPage - Final data being passed to client:')
  console.log('Building:', JSON.stringify(building, null, 2))
  console.log('Units:', JSON.stringify(finalUnits, null, 2))
  console.log('Units count being passed to client:', finalUnits.length)

  // Add a simple test to verify the data is correct
  if (finalUnits.length > 0) {
    console.log('BuildingUnitsPage - First unit:', finalUnits[0])
    console.log('BuildingUnitsPage - Last unit:', finalUnits[finalUnits.length - 1])
  }

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