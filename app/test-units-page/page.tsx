import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export default async function TestUnitsPage() {
  const cookieStore = cookies()
  const supabase = createServerComponentClient({ cookies: () => cookieStore })
  
  // Test with the known building ID from the database
  const testBuildingId = '2beeec1d-a94e-4058-b881-213d74cc6830'
  
  console.log('=== TEST UNITS PAGE ===')
  console.log('Testing with building ID:', testBuildingId)
  
  // Fetch building
  const { data: building, error: buildingError } = await supabase
    .from('buildings')
    .select('*')
    .eq('id', testBuildingId)
    .single()
  
  console.log('Building:', building)
  console.log('Building error:', buildingError)
  
  // Fetch units
  const { data: units, error: unitsError } = await supabase
    .from('units')
    .select('id, unit_number, floor, type, building_id')
    .eq('building_id', testBuildingId)
    .order('unit_number')
  
  console.log('Units:', units)
  console.log('Units error:', unitsError)
  console.log('Units count:', units?.length || 0)
  
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Test Units Page</h1>
      
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Building</h2>
          <pre className="bg-gray-100 p-2 rounded text-sm">
            {JSON.stringify(building, null, 2)}
          </pre>
        </div>
        
        <div>
          <h2 className="text-lg font-semibold">Units ({units?.length || 0})</h2>
          <pre className="bg-gray-100 p-2 rounded text-sm max-h-96 overflow-auto">
            {JSON.stringify(units, null, 2)}
          </pre>
        </div>
        
        <div>
          <h2 className="text-lg font-semibold">Errors</h2>
          <div className="space-y-2">
            <div>
              <strong>Building Error:</strong>
              <pre className="bg-red-100 p-2 rounded text-sm">
                {JSON.stringify(buildingError, null, 2)}
              </pre>
            </div>
            <div>
              <strong>Units Error:</strong>
              <pre className="bg-red-100 p-2 rounded text-sm">
                {JSON.stringify(unitsError, null, 2)}
              </pre>
            </div>
          </div>
        </div>
        
        <div>
          <h2 className="text-lg font-semibold">Test Links</h2>
          <div className="space-y-2">
            <a 
              href={`/buildings/${testBuildingId}/units`}
              className="block text-blue-600 hover:underline"
            >
              Go to actual units page
            </a>
            <a 
              href={`/api/test-units?buildingId=${testBuildingId}`}
              className="block text-blue-600 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Test API endpoint
            </a>
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h3 className="text-sm font-medium text-yellow-800 mb-2">Direct URL to Test:</h3>
              <p className="text-sm text-yellow-700 font-mono break-all">
                http://localhost:3003/buildings/{testBuildingId}/units
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 