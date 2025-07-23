import { cookies } from 'next/headers'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { redirect } from 'next/navigation'
import BuildingComplianceClient from './BuildingComplianceClient'

export default async function BuildingCompliancePage({ 
  params 
}: { 
  params: Promise<{ buildingId: string }> 
}) {
  try {
    const { buildingId } = await params
    const cookieStore = cookies()
    const supabase = createServerComponentClient({ cookies: () => cookieStore })

    if (!buildingId) {
      return (
        <div className="p-6 space-y-4">
          <h1 className="text-2xl font-semibold text-[#333333]">Compliance</h1>
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-red-600">Missing building ID.</p>
            <p className="text-red-500 text-sm mt-2">Please provide a valid building ID in the URL.</p>
          </div>
        </div>
      )
    }

    const { data: sessionData } = await supabase.auth.getSession()
    if (!sessionData?.session) redirect('/login')

    // Fetch building data with enhanced information
    const { data: building, error: buildingError } = await supabase
      .from('buildings')
      .select(`
        id, 
        name, 
        address,
        unit_count,
        construction_type,
        total_floors,
        lift_available,
        fire_safety_status,
        asbestos_status,
        energy_rating,
        building_insurance_provider,
        building_insurance_expiry
      `)
      .eq('id', buildingId)
      .maybeSingle()

    if (buildingError) {
      console.error('Building fetch error:', buildingError.message)
      return (
        <div className="p-6 space-y-4">
          <h1 className="text-2xl font-semibold text-[#333333]">Compliance</h1>
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-red-600">Could not load building information.</p>
            <p className="text-red-500 text-sm mt-2">Error: {buildingError.message}</p>
          </div>
        </div>
      )
    }

    if (!building) {
      return (
        <div className="p-6 space-y-4">
          <h1 className="text-2xl font-semibold text-[#333333]">Compliance</h1>
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-red-600">Building not found.</p>
            <p className="text-red-500 text-sm mt-2">Building ID: {buildingId}</p>
          </div>
        </div>
      )
    }

    // Fetch all compliance assets with enhanced data
    const { data: assets, error: assetsError } = await supabase
      .from('compliance_assets')
      .select('*')
      .order('category', { ascending: true })

    if (assetsError) {
      console.error('Compliance assets fetch error:', assetsError.message)
      return (
        <div className="p-6 space-y-4">
          <h1 className="text-2xl font-semibold text-[#333333]">Compliance</h1>
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-red-600">Could not load compliance assets.</p>
            <p className="text-red-500 text-sm mt-2">Error: {assetsError.message}</p>
          </div>
        </div>
      )
    }

    // Fetch building compliance status
    const { data: buildingAssets, error: buildingAssetsError } = await supabase
      .from('building_compliance_assets')
      .select('*')
      .eq('building_id', parseInt(buildingId, 10))

    if (buildingAssetsError) {
      console.error('Building compliance assets fetch error:', buildingAssetsError.message)
    }

    // Fetch compliance documents for this building
    const { data: complianceDocuments, error: documentsError } = await supabase
      .from('building_documents')
      .select(`
        id,
        file_name,
        file_url,
        type,
        created_at,
        classification,
        summary,
        extracted_text
      `)
      .eq('building_id', parseInt(buildingId, 10))
      .order('created_at', { ascending: false })

    if (documentsError) {
      console.error('Compliance documents fetch error:', documentsError.message)
    }

    // Create status map and dates map
    const statusMap: Record<string, string> = {}
    const statusDatesMap: Record<string, string> = {}
    const notesMap: Record<string, string> = {}
    
    buildingAssets?.forEach((buildingAsset: any) => {
      statusMap[buildingAsset.asset_id] = buildingAsset.status || 'Not Tracked'
      statusDatesMap[buildingAsset.asset_id] = buildingAsset.next_due_date || ''
      notesMap[buildingAsset.asset_id] = buildingAsset.notes || ''
    })

    // Calculate compliance statistics
    const totalAssets = assets?.length || 0
    const trackedAssets = buildingAssets?.length || 0
    const compliantAssets = buildingAssets?.filter((asset: any) => 
      asset.status === 'Compliant' || 
      (asset.next_due_date && new Date(asset.next_due_date) > new Date())
    ).length || 0
    const overdueAssets = buildingAssets?.filter((asset: any) => 
      asset.status === 'Overdue' || 
      (asset.next_due_date && new Date(asset.next_due_date) < new Date())
    ).length || 0
    const dueSoonAssets = buildingAssets?.filter((asset: any) => {
      if (!asset.next_due_date) return false
      const dueDate = new Date(asset.next_due_date)
      const today = new Date()
      const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      return daysUntilDue <= 30 && daysUntilDue > 0
    }).length || 0

    const complianceData = {
      building,
      assets: assets || [],
      buildingAssets: buildingAssets || [],
      complianceDocuments: complianceDocuments || [],
      statusMap,
      statusDatesMap,
      notesMap,
      statistics: {
        total: totalAssets,
        tracked: trackedAssets,
        compliant: compliantAssets,
        overdue: overdueAssets,
        dueSoon: dueSoonAssets
      }
    }

    return <BuildingComplianceClient complianceData={complianceData} />

  } catch (err) {
    console.error('Compliance page crash:', err)
    return (
      <div className="p-6 space-y-4">
        <h1 className="text-2xl font-semibold text-[#333333]">Compliance</h1>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-red-600">An unexpected error occurred.</p>
          <p className="text-red-500 text-sm mt-2">Error details: {err instanceof Error ? err.message : String(err)}</p>
        </div>
      </div>
    )
  }
} 