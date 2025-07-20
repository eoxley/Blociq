import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import LayoutWithSidebar from '@/components/LayoutWithSidebar'
import ComplianceSetupWizard from './ComplianceSetupWizard'

export default async function ComplianceSetupPage() {
  const supabase = createClient(cookies())
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  try {
    // Fetch all buildings
    const { data: buildings, error: buildingsError } = await supabase
      .from('buildings')
      .select('id, name, address, unit_count')
      .order('name', { ascending: true })

    if (buildingsError) {
      console.error('Error fetching buildings:', buildingsError)
      return (
        <LayoutWithSidebar>
          <div className="p-6">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-600">Error loading buildings: {buildingsError.message}</p>
            </div>
          </div>
        </LayoutWithSidebar>
      )
    }

    // Fetch all compliance assets (no limit)
    const { data: complianceAssets, error: assetsError } = await supabase
      .from('compliance_assets')
      .select('*')
      .order('category', { ascending: true })
      .order('name', { ascending: true })

    if (assetsError) {
      console.error('Error fetching compliance assets:', assetsError)
      return (
        <LayoutWithSidebar>
          <div className="p-6">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-600">Error loading compliance assets: {assetsError.message}</p>
            </div>
          </div>
        </LayoutWithSidebar>
      )
    }

    // Check which buildings already have compliance setup
    const { data: existingCompliance, error: existingError } = await supabase
      .from('building_compliance_assets')
      .select('building_id, asset_id')

    if (existingError) {
      console.error('Error fetching existing compliance:', existingError)
    }

    // Create a map of buildings that already have compliance setup
    const buildingsWithCompliance = new Set<string>()
    existingCompliance?.forEach(item => {
      buildingsWithCompliance.add(String(item.building_id))
    })

    return (
      <LayoutWithSidebar>
        <div className="p-6">
          <div className="max-w-4xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Compliance Setup Wizard</h1>
              <p className="text-gray-600">
                Configure compliance tracking for your buildings. This wizard will help you set up which compliance requirements apply to each building in your portfolio.
              </p>
              
              {/* Asset Count Display */}
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Total compliance assets loaded:</strong> {complianceAssets?.length || 0}
                </p>
                {complianceAssets && complianceAssets.length === 0 && (
                  <p className="text-sm text-red-600 mt-1">
                    ⚠️ No compliance assets found. Please check your database setup.
                  </p>
                )}
              </div>
            </div>

            <ComplianceSetupWizard 
              buildings={buildings || []}
              complianceAssets={(complianceAssets as any[]) || []}
              buildingsWithCompliance={Array.from(buildingsWithCompliance)}
            />
          </div>
        </div>
      </LayoutWithSidebar>
    )
  } catch (error) {
    console.error('Error in compliance setup page:', error)
    return (
      <LayoutWithSidebar>
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-600">An unexpected error occurred. Please try refreshing the page.</p>
          </div>
        </div>
      </LayoutWithSidebar>
    )
  }
} 