import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import BuildingStructureCard from '@/components/BuildingStructureCard'

interface PageProps {
  params: {
    id: string
  }
}

export default async function BuildingStructurePage({ params }: PageProps) {
  const supabase = createClient(cookies())

  try {
    // Check authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    
    if (authError) {
      console.error('Auth error:', authError)
      throw new Error('Authentication failed')
    }
    
    if (!session) {
      redirect('/login')
    }

    // Verify building exists and user has access
    const { data: building, error: buildingError } = await supabase
      .from('buildings')
      .select('id, name')
      .eq('id', params.id)
      .single()

    if (buildingError || !building) {
      console.error('Building not found:', buildingError)
      redirect('/dashboard/buildings')
    }

    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Building Structure</h1>
                <p className="text-gray-600 mt-1">{building.name}</p>
              </div>
              <div className="flex items-center space-x-4">
                <a
                  href={`/dashboard/buildings/${params.id}`}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  ← Back to Building
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-6">
            <BuildingStructureCard buildingId={params.id} />
          </div>
        </div>
      </div>
    )

  } catch (error) {
    console.error('Error in BuildingStructurePage:', error)
    
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Failed to load building structure</h2>
          <p className="text-gray-600 mb-4">
            {error instanceof Error ? error.message : 'An unexpected error occurred'}
          </p>
          <a
            href="/dashboard/buildings"
            className="bg-gradient-to-r from-[#008C8F] to-[#7645ED] text-white px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
          >
            Back to Buildings
          </a>
        </div>
      </div>
    )
  }
} 