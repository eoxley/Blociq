import React from 'react'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import LayoutWithSidebar from '@/components/LayoutWithSidebar'
import BuildingComplianceClient from './BuildingComplianceClient'
import ErrorBoundary from '@/components/ErrorBoundary'

export default async function BuildingCompliancePage({ 
  params 
}: { 
  params: Promise<{ buildingId: string }> 
}) {
  try {
    const { buildingId } = await params
    const cookieStore = cookies()
    const supabase = createServerComponentClient({ cookies: () => cookieStore })
    
    // Secure the route using Supabase Auth
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      redirect('/login')
    }

    // Validate buildingId
    if (!buildingId) {
      console.error('No building ID provided')
      redirect('/buildings')
    }

    console.log('🔍 Fetching building compliance for ID:', buildingId)

    // Fetch building details with safe column selection - only use columns that definitely exist
    const { data: building, error: buildingError } = await supabase
      .from('buildings')
      .select(`
        id, 
        name, 
        address,
        unit_count
      `)
      .eq('id', buildingId)
      .maybeSingle()

    if (buildingError) {
      console.error('Building fetch error:', buildingError.message)
      return (
        <ErrorBoundary>
          <LayoutWithSidebar>
            <div className="p-6 space-y-4">
              <h1 className="text-2xl font-semibold text-[#333333]">Compliance</h1>
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="text-red-600">Could not load building information.</p>
                <p className="text-red-500 text-sm mt-2">Error: {buildingError.message}</p>
              </div>
            </div>
          </LayoutWithSidebar>
        </ErrorBoundary>
      )
    }

    if (!building) {
      return (
        <ErrorBoundary>
          <LayoutWithSidebar>
            <div className="p-6 space-y-4">
              <h1 className="text-2xl font-semibold text-[#333333]">Compliance</h1>
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="text-red-600">Building not found.</p>
                <p className="text-red-500 text-sm mt-2">Building ID: {buildingId}</p>
              </div>
            </div>
          </LayoutWithSidebar>
        </ErrorBoundary>
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
        <ErrorBoundary>
          <LayoutWithSidebar>
            <div className="p-6 space-y-4">
              <h1 className="text-2xl font-semibold text-[#333333]">Compliance</h1>
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="text-red-600">Could not load compliance assets.</p>
                <p className="text-red-500 text-sm mt-2">Error: {assetsError.message}</p>
              </div>
            </div>
          </LayoutWithSidebar>
        </ErrorBoundary>
      )
    }

    // Fetch building compliance status
    const { data: buildingAssets, error: buildingAssetsError } = await supabase
      .from('building_compliance_assets')
      .select('*')
      .eq('building_id', buildingId)

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
      .eq('building_id', buildingId)
      .order('created_at', { ascending: false })

    if (documentsError) {
      console.error('Compliance documents fetch error:', documentsError.message)
    }

    // Handle missing data gracefully
    const safeBuildingAssets = buildingAssets || []
    const safeComplianceDocuments = complianceDocuments || []

    // Create status map and dates map
    const statusMap: Record<string, string> = {}
    const statusDatesMap: Record<string, string> = {}
    const notesMap: Record<string, string> = {}
    
    safeBuildingAssets.forEach((buildingAsset: any) => {
      statusMap[buildingAsset.asset_id] = buildingAsset.status || 'Not Tracked'
      statusDatesMap[buildingAsset.asset_id] = buildingAsset.next_due_date || ''
      notesMap[buildingAsset.asset_id] = buildingAsset.notes || ''
    })

    // Calculate compliance statistics
    const totalAssets = assets?.length || 0
    const trackedAssets = safeBuildingAssets.length || 0
    const compliantAssets = safeBuildingAssets.filter((asset: any) => 
      asset.status === 'Compliant' || 
      (asset.next_due_date && new Date(asset.next_due_date) > new Date())
    ).length || 0
    const overdueAssets = safeBuildingAssets.filter((asset: any) => 
      asset.status === 'Overdue' || 
      (asset.next_due_date && new Date(asset.next_due_date) < new Date())
    ).length || 0
    const dueSoonAssets = safeBuildingAssets.filter((asset: any) => {
      if (!asset.next_due_date) return false
      const dueDate = new Date(asset.next_due_date)
      const today = new Date()
      const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      return daysUntilDue <= 30 && daysUntilDue > 0
    }).length || 0

    // Prepare building data with safe defaults for missing columns
    const buildingData = {
      ...building,
      total_floors: null,
      lift_available: null,
      fire_safety_status: null,
      asbestos_status: null,
      energy_rating: null,
      building_insurance_provider: null,
      building_insurance_expiry: null
    }

    const complianceData = {
      building: buildingData,
      assets: assets || [],
      buildingAssets: safeBuildingAssets,
      complianceDocuments: safeComplianceDocuments,
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

    console.log('✅ Building compliance data prepared successfully')

    return (
      <ErrorBoundary>
        <LayoutWithSidebar>
          <BuildingComplianceClient complianceData={complianceData} />
        </LayoutWithSidebar>
      </ErrorBoundary>
    )
  } catch (error) {
    console.error('❌ Unexpected error in building compliance page:', error)
    redirect('/buildings')
  }
}