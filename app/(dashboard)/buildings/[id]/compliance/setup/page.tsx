import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { AlertTriangle } from 'lucide-react'
import ComplianceSetupClient from './ComplianceSetupClient'
import NotFound from '../../../../../../components/NotFound'

interface ComplianceSetupPageProps {
  params: {
    id: string
  }
}

export default async function ComplianceSetupPage({ params }: ComplianceSetupPageProps) {
  const supabase = createClient(cookies())
  
  try {
    // Check authentication first
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) redirect('/login')

    // Validate building ID format
    if (!params.id || typeof params.id !== 'string') {
      console.error('Invalid building ID:', params.id)
      notFound()
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(params.id)) {
      console.error('Invalid UUID format for building ID:', params.id)
      notFound()
    }

    // Fetch building with all required fields
    const { data: building, error: buildingError } = await supabase
      .from('buildings')
      .select('*')
      .eq('id', params.id)
      .maybeSingle()

    if (buildingError) {
      console.error('Error fetching building:', buildingError)
      throw new Error('Failed to fetch building data')
    }

    if (!building) {
      console.error('Building not found:', params.id)
      return <NotFound title="Building Not Found" message="We couldn't find the building you're looking for." />
    }

    // Fetch building setup to ensure it exists
    const { data: buildingSetup, error: setupError } = await supabase
      .from('building_setup')
      .select('*')
      .eq('building_id', params.id)
      .maybeSingle()

    if (setupError) {
      console.error('Error fetching building setup:', setupError)
    }

    // Fetch existing compliance assets for this building
    const { data: existingAssets, error: assetsError } = await supabase
      .from('building_compliance_assets')
      .select(`
        *,
        compliance_assets (*)
      `)
      .eq('building_id', params.id)

    if (assetsError) {
      console.error('Error fetching existing assets:', assetsError)
    }

    // Fetch all available compliance assets
    const { data: allAssets, error: allAssetsError } = await supabase
      .from('compliance_assets')
      .select('*')
      .order('category')
      .order('name')

    if (allAssetsError) {
      console.error('Error fetching all assets:', allAssetsError)
      throw new Error('Failed to fetch compliance assets')
    }

    return (
      <ComplianceSetupClient
        building={building}
        buildingSetup={buildingSetup}
        existingAssets={existingAssets || []}
        allAssets={allAssets || []}
        buildingId={params.id}
      />
    )

  } catch (error) {
    console.error('❌ Error in ComplianceSetupPage:', error)
    
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error loading compliance setup</h2>
          <p className="text-gray-600 mb-4">
            {error instanceof Error ? error.message : 'An unexpected error occurred'}
          </p>
          <a 
            href={`/buildings/${params.id}`}
            className="bg-gradient-to-r from-[#008C8F] to-[#7645ED] text-white px-4 py-2 rounded-lg hover:opacity-90 transition-opacity inline-block"
          >
            Back to Building
          </a>
        </div>
      </div>
    )
  }
}