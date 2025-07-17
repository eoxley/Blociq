import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export default async function CompliancePage({ params }: { params: Promise<{ buildingId: string }> }) {
  try {
    const resolvedParams = await params
    console.log('Debug - Received params:', resolvedParams)
    
    const { buildingId } = resolvedParams
    console.log('Debug - Building ID:', buildingId)
    
    const supabase = createClient(cookies())

    if (!buildingId) {
      console.log('Debug - Building ID is missing or empty')
      return (
        <div className="p-6 space-y-4">
          <h1 className="text-2xl font-semibold">Debug Info</h1>
          <p>Params received: {JSON.stringify(resolvedParams)}</p>
          <p>Building ID: {buildingId || 'undefined'}</p>
          <p className="text-red-500">Missing building ID.</p>
        </div>
      )
    }

    const { data: sessionData } = await supabase.auth.getSession()
    if (!sessionData?.session) redirect('/login')

    // Fetch building by UUID
    const { data: building, error } = await supabase
      .from('buildings')
      .select('name')
      .eq('id', buildingId)
      .maybeSingle()

    if (error) {
      console.error('Building fetch error:', error.message)
      return <div className="p-6 text-red-500">Could not load building.</div>
    }

    if (!building) {
      return <div className="p-6 text-red-500">Building not found.</div>
    }

    return (
      <div className="p-6 space-y-4">
        <h1 className="text-2xl font-semibold">Compliance Tracker</h1>
        <p>Building: <strong>{building.name || 'Unknown'}</strong></p>
        <p className="text-sm text-gray-600">Building ID: {buildingId}</p>

        <div className="border p-4 rounded-lg bg-white space-y-1">
          <p><strong>Fire Risk Assessment</strong></p>
          <p>Status: <span className="text-yellow-600">Missing</span></p>
        </div>
      </div>
    )
  } catch (err) {
    console.error('Compliance page crash:', err)
    return (
      <div className="p-6 space-y-4">
        <h1 className="text-2xl font-semibold">Error Debug</h1>
        <p className="text-red-500">Unexpected error occurred.</p>
        <p>Error details: {err instanceof Error ? err.message : String(err)}</p>
      </div>
    )
  }
} 