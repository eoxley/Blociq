import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function SimpleUnitsPage({ 
  params 
}: { 
  params: Promise<{ buildingId: string }> 
}) {
  console.log('=== SIMPLE UNITS PAGE DEBUG ===')
  
  const { buildingId } = await params
  console.log('SimpleUnitsPage - buildingId:', buildingId)
  
  const cookieStore = cookies()
  const supabase = createServerComponentClient({ cookies: () => cookieStore })
  
  // Fetch building
  const { data: building, error: buildingError } = await supabase
    .from('buildings')
    .select('*')
    .eq('id', buildingId)
    .single()

  console.log('SimpleUnitsPage - building:', building)
  console.log('SimpleUnitsPage - building error:', buildingError)

  // Fetch units
  const { data: units, error: unitsError } = await supabase
    .from("units")
    .select('id, unit_number, floor, type, building_id')
    .eq("building_id", buildingId)
    .order('unit_number')

  console.log('SimpleUnitsPage - units:', units)
  console.log('SimpleUnitsPage - units error:', unitsError)
  console.log('SimpleUnitsPage - units count:', units?.length || 0)

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Simple Units Test</h1>
      
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold mb-2">Building</h2>
          <div className="bg-gray-100 p-4 rounded">
            <p><strong>Name:</strong> {building?.name}</p>
            <p><strong>ID:</strong> {building?.id}</p>
            <p><strong>Address:</strong> {building?.address}</p>
          </div>
        </div>
        
        <div>
          <h2 className="text-xl font-semibold mb-2">Units ({units?.length || 0})</h2>
          {units && units.length > 0 ? (
            <div className="space-y-2">
              {units.map((unit) => (
                <div key={unit.id} className="bg-white border border-gray-200 p-4 rounded">
                  <p><strong>Unit:</strong> {unit.unit_number}</p>
                  <p><strong>ID:</strong> {unit.id}</p>
                  <p><strong>Floor:</strong> {unit.floor || 'N/A'}</p>
                  <p><strong>Type:</strong> {unit.type || 'N/A'}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-yellow-100 border border-yellow-200 p-4 rounded">
              <p>No units found</p>
              {unitsError && (
                <p className="text-red-600 mt-2">Error: {unitsError.message}</p>
              )}
            </div>
          )}
        </div>
        
        <div>
          <h2 className="text-xl font-semibold mb-2">Debug Info</h2>
          <div className="bg-blue-100 p-4 rounded text-sm">
            <p><strong>Building ID:</strong> {buildingId}</p>
            <p><strong>Units Count:</strong> {units?.length || 0}</p>
            <p><strong>Building Error:</strong> {buildingError ? 'Yes' : 'No'}</p>
            <p><strong>Units Error:</strong> {unitsError ? 'Yes' : 'No'}</p>
          </div>
        </div>
      </div>
    </div>
  )
} 