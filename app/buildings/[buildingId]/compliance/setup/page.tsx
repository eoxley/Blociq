import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { Shield } from 'lucide-react'
import LayoutWithSidebar from '@/components/LayoutWithSidebar'
import ComplianceSetupClient from './ComplianceSetupClient'
import { Tables } from '@/lib/database.types'

type ComplianceAsset = Tables<'compliance_assets'> & {
  recommended_frequency?: string
}

type BuildingComplianceAsset = Tables<'building_compliance_assets'>

export default async function ComplianceSetupPage({ 
  params 
}: { 
  params: Promise<{ buildingId: string }> 
}) {
  const { buildingId } = await params
  
  const cookieStore = cookies()
  const supabase = createServerComponentClient({ cookies: () => cookieStore })
  
  // Check if user is authenticated
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // Fetch building data
  const { data: building, error: buildingError } = await supabase
    .from('buildings')
    .select('*')
    .eq('id', buildingId)
    .single()

  if (buildingError || !building) {
    console.error('Building not found:', buildingError)
    redirect('/buildings')
  }

  // Fetch all compliance assets with enhanced data
  const { data: assets, error: assetsError } = await supabase
    .from('compliance_assets')
    .select('*')
    .order('category', { ascending: true })

  if (assetsError) {
    console.error('Compliance assets fetch error:', assetsError.message)
    redirect(`/buildings/${buildingId}/compliance`)
  }

  // If no assets exist, show a message to run the seed script
  if (!assets || assets.length === 0) {
    return (
      <LayoutWithSidebar>
        <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
          <div className="max-w-md mx-auto text-center p-8">
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <div className="w-16 h-16 bg-[#2BBEB4] rounded-full flex items-center justify-center mx-auto mb-6">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-2xl font-serif font-bold text-[#333333] mb-4">
                Compliance Assets Not Found
              </h2>
              <p className="text-gray-600 mb-6">
                The compliance assets database is empty. Please run the seed script to populate the compliance requirements.
              </p>
              <div className="space-y-3 text-sm text-gray-500">
                <p>Run this command to seed the database:</p>
                <code className="bg-gray-100 px-3 py-2 rounded-lg block">
                  npx ts-node scripts/seed-compliance-assets.ts
                </code>
              </div>
              <div className="mt-6">
                <button
                  onClick={() => window.history.back()}
                  className="bg-[#2BBEB4] hover:bg-[#0F5D5D] text-white px-6 py-3 rounded-lg font-semibold transition-colors duration-200"
                >
                  Go Back
                </button>
              </div>
            </div>
          </div>
        </div>
      </LayoutWithSidebar>
    )
  }

  // Fetch existing building compliance assets
  const { data: buildingAssets, error: buildingAssetsError } = await supabase
    .from('building_compliance_assets')
    .select('*')
    .eq('building_id', buildingId)

  if (buildingAssetsError) {
    console.error('Building compliance assets fetch error:', buildingAssetsError.message)
  }

  // Create a set of active asset IDs for quick lookup
  const activeAssetIds = new Set(
    (buildingAssets || []).map(asset => asset.asset_id)
  )

  // Enhance assets with recommended frequency and active status
  const enhancedAssets: (ComplianceAsset & { isActive: boolean })[] = (assets || []).map(asset => {
    // Determine recommended frequency based on asset name and category
    let recommendedFrequency = '1 year' // default
    
    if (asset.name.toLowerCase().includes('fire') || asset.name.toLowerCase().includes('fra')) {
      recommendedFrequency = '1 year'
    } else if (asset.name.toLowerCase().includes('gas')) {
      recommendedFrequency = '1 year'
    } else if (asset.name.toLowerCase().includes('electrical') || asset.name.toLowerCase().includes('eicr')) {
      recommendedFrequency = '5 years'
    } else if (asset.name.toLowerCase().includes('asbestos')) {
      recommendedFrequency = '2 years'
    } else if (asset.name.toLowerCase().includes('lift')) {
      recommendedFrequency = '6 months'
    } else if (asset.name.toLowerCase().includes('insurance')) {
      recommendedFrequency = '1 year'
    } else if (asset.name.toLowerCase().includes('energy') || asset.name.toLowerCase().includes('epc')) {
      recommendedFrequency = '10 years'
    }

    return {
      ...asset,
      recommended_frequency: recommendedFrequency,
      isActive: activeAssetIds.has(asset.id)
    }
  })

  // Group assets by category
  const groupedAssets = enhancedAssets.reduce((acc, asset) => {
    const category = asset.category || 'Other'
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(asset)
    return acc
  }, {} as Record<string, (ComplianceAsset & { isActive: boolean })[]>)

  return (
    <LayoutWithSidebar>
      <ComplianceSetupClient 
        building={building}
        groupedAssets={groupedAssets}
        buildingId={buildingId}
      />
    </LayoutWithSidebar>
  )
} 