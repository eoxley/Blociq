import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export default async function CompliancePage({ params }: { params: Promise<{ buildingId: string }> }) {
  try {
    const { buildingId } = await params
    const supabase = createClient(cookies())

    if (!buildingId) {
      return (
        <div className="p-6 space-y-4">
          <h1 className="text-2xl font-semibold">Compliance</h1>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-600">Missing building ID.</p>
            <p className="text-red-500 text-sm mt-2">Please provide a valid building ID in the URL.</p>
          </div>
        </div>
      )
    }

    const { data: sessionData } = await supabase.auth.getSession()
    if (!sessionData?.session) redirect('/login')

    // Fetch building data
    const { data: building, error: buildingError } = await supabase
      .from('buildings')
      .select('name')
      .eq('id', buildingId)
      .maybeSingle()

    if (buildingError) {
      console.error('Building fetch error:', buildingError.message)
      return (
        <div className="p-6 space-y-4">
          <h1 className="text-2xl font-semibold">Compliance</h1>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-600">Could not load building information.</p>
            <p className="text-red-500 text-sm mt-2">Error: {buildingError.message}</p>
          </div>
        </div>
      )
    }

    if (!building) {
      return (
        <div className="p-6 space-y-4">
          <h1 className="text-2xl font-semibold">Compliance</h1>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-600">Building not found.</p>
            <p className="text-red-500 text-sm mt-2">Building ID: {buildingId}</p>
          </div>
        </div>
      )
    }

    return (
      <div className="p-6 space-y-4">
        <h1 className="text-2xl font-semibold">Compliance</h1>
        <p>Building: <strong>{building.name || 'Unknown'}</strong></p>
        <p className="text-sm text-gray-600">Building ID: {buildingId}</p>

        {/* Placeholder area for compliance content */}
        <div className="bg-white border rounded-lg p-6 shadow-sm">
          <h2 className="text-lg font-medium mb-4">Compliance Overview</h2>
          <div className="space-y-4">
            <div className="border p-4 rounded-lg">
              <h3 className="font-medium mb-2">Fire Risk Assessment</h3>
              <p className="text-sm text-gray-600">Status: <span className="text-yellow-600">Pending</span></p>
            </div>
            
            <div className="border p-4 rounded-lg">
              <h3 className="font-medium mb-2">Electrical Installation Condition Report (EICR)</h3>
              <p className="text-sm text-gray-600">Status: <span className="text-yellow-600">Pending</span></p>
            </div>
            
            <div className="border p-4 rounded-lg">
              <h3 className="font-medium mb-2">Gas Safety Certificate</h3>
              <p className="text-sm text-gray-600">Status: <span className="text-yellow-600">Pending</span></p>
            </div>
            
            <div className="border p-4 rounded-lg">
              <h3 className="font-medium mb-2">Energy Performance Certificate (EPC)</h3>
              <p className="text-sm text-gray-600">Status: <span className="text-yellow-600">Pending</span></p>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-blue-800 text-sm">
            <strong>Note:</strong> This is a placeholder compliance page for building {building.name}. 
            Full compliance tracking functionality will be implemented here.
          </p>
        </div>
      </div>
    )
  } catch (err) {
    console.error('Compliance page crash:', err)
    return (
      <div className="p-6 space-y-4">
        <h1 className="text-2xl font-semibold">Compliance</h1>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">An unexpected error occurred.</p>
          <p className="text-red-500 text-sm mt-2">Error details: {err instanceof Error ? err.message : String(err)}</p>
        </div>
      </div>
    )
  }
} 