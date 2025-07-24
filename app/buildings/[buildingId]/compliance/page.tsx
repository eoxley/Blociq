import React from 'react'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { Shield } from 'lucide-react'
import LayoutWithSidebar from '@/components/LayoutWithSidebar'
import BuildingComplianceTracker from './BuildingComplianceTracker'
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
    
    // Validate buildingId immediately
    if (!buildingId || buildingId.trim().length === 0) {
      console.error('❌ No building ID provided or invalid building ID')
      return (
        <ErrorBoundary>
          <LayoutWithSidebar>
            <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
              <div className="max-w-md mx-auto text-center p-8">
                <div className="bg-white rounded-2xl shadow-lg p-8">
                  <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Shield className="h-8 w-8 text-white" />
                  </div>
                  <h2 className="text-2xl font-serif font-bold text-[#333333] mb-4">
                    Invalid Building
                  </h2>
                  <p className="text-gray-600 mb-6">
                    The building ID provided is invalid or missing. Please check the URL and try again.
                  </p>
                  <button
                    onClick={() => window.location.href = '/buildings'}
                    className="w-full bg-[#2BBEB4] hover:bg-[#0F5D5D] text-white px-6 py-3 rounded-lg font-semibold transition-colors duration-200"
                  >
                    View All Buildings
                  </button>
                </div>
              </div>
            </div>
          </LayoutWithSidebar>
        </ErrorBoundary>
      )
    }

    console.log('🔍 Fetching building compliance tracker for ID:', buildingId)
    
    // Secure the route using Supabase Auth
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      redirect('/login')
    }

    // Fetch building details with enhanced error handling
    let building = null
    let buildingError = null
    
    try {
      const buildingResult = await supabase
        .from('buildings')
        .select(`
          id, 
          name, 
          address,
          unit_count
        `)
        .eq('id', buildingId)
        .maybeSingle()
      
      building = buildingResult.data
      buildingError = buildingResult.error
    } catch (error) {
      console.error('❌ Unexpected error fetching building:', error)
      buildingError = error instanceof Error ? error : new Error('Unknown error occurred')
    }

    if (buildingError) {
      console.error('❌ Building fetch error:', buildingError.message)
      return (
        <ErrorBoundary>
          <LayoutWithSidebar>
            <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
              <div className="max-w-md mx-auto text-center p-8">
                <div className="bg-white rounded-2xl shadow-lg p-8">
                  <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Shield className="h-8 w-8 text-white" />
                  </div>
                  <h2 className="text-2xl font-serif font-bold text-[#333333] mb-4">
                    Could Not Load Building
                  </h2>
                  <p className="text-gray-600 mb-6">
                    We encountered an error while loading the building information. Please try again later.
                  </p>
                  <div className="space-y-3">
                    <button
                      onClick={() => window.location.reload()}
                      className="w-full bg-[#2BBEB4] hover:bg-[#0F5D5D] text-white px-6 py-3 rounded-lg font-semibold transition-colors duration-200"
                    >
                      Try Again
                    </button>
                    <button
                      onClick={() => window.location.href = '/buildings'}
                      className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-semibold transition-colors duration-200"
                    >
                      View All Buildings
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </LayoutWithSidebar>
        </ErrorBoundary>
      )
    }

    if (!building) {
      console.error('❌ Building not found for ID:', buildingId)
      return (
        <ErrorBoundary>
          <LayoutWithSidebar>
            <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
              <div className="max-w-md mx-auto text-center p-8">
                <div className="bg-white rounded-2xl shadow-lg p-8">
                  <div className="w-16 h-16 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Shield className="h-8 w-8 text-white" />
                  </div>
                  <h2 className="text-2xl font-serif font-bold text-[#333333] mb-4">
                    Building Not Found
                  </h2>
                  <p className="text-gray-600 mb-6">
                    The building you're looking for doesn't exist or you don't have permission to view it.
                  </p>
                  <button
                    onClick={() => window.location.href = '/buildings'}
                    className="w-full bg-[#2BBEB4] hover:bg-[#0F5D5D] text-white px-6 py-3 rounded-lg font-semibold transition-colors duration-200"
                  >
                    View All Buildings
                  </button>
                </div>
              </div>
            </div>
          </LayoutWithSidebar>
        </ErrorBoundary>
      )
    }

    // 🔧 Supabase Query: Fetch active building compliance assets with enhanced error handling
    let buildingAssets = null
    let buildingAssetsError = null
    
    try {
      const assetsResult = await supabase
        .from('building_compliance_assets')
        .select(`
          *,
          compliance_assets (
            name,
            category,
            description,
            recommended_frequency
          )
        `)
        .eq('building_id', buildingId)
        .eq('status', 'active')
      
      buildingAssets = assetsResult.data
      buildingAssetsError = assetsResult.error
    } catch (error) {
      console.error('❌ Unexpected error fetching building compliance assets:', error)
      buildingAssetsError = error instanceof Error ? error : new Error('Unknown error occurred')
    }

    if (buildingAssetsError) {
      console.error('❌ Building compliance assets fetch error:', buildingAssetsError.message)
      return (
        <ErrorBoundary>
          <LayoutWithSidebar>
            <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
              <div className="max-w-md mx-auto text-center p-8">
                <div className="bg-white rounded-2xl shadow-lg p-8">
                  <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Shield className="h-8 w-8 text-white" />
                  </div>
                  <h2 className="text-2xl font-serif font-bold text-[#333333] mb-4">
                    Could Not Load Compliance Data
                  </h2>
                  <p className="text-gray-600 mb-6">
                    We encountered an error while loading the compliance information for {building.name}. Please try again later.
                  </p>
                  <div className="space-y-3">
                    <button
                      onClick={() => window.location.reload()}
                      className="w-full bg-[#2BBEB4] hover:bg-[#0F5D5D] text-white px-6 py-3 rounded-lg font-semibold transition-colors duration-200"
                    >
                      Try Again
                    </button>
                    <button
                      onClick={() => window.location.href = '/buildings'}
                      className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-semibold transition-colors duration-200"
                    >
                      View All Buildings
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </LayoutWithSidebar>
        </ErrorBoundary>
      )
    }

    // Fetch compliance documents for this building with enhanced error handling
    let complianceDocuments: any[] = []
    let documentsError = null
    
    try {
      const documentsResult = await supabase
        .from('compliance_docs')
        .select(`
          id,
          doc_type,
          doc_url,
          uploaded_at,
          expiry_date,
          building_id
        `)
        .eq('building_id', buildingId)
        .order('uploaded_at', { ascending: false })
      
      complianceDocuments = documentsResult.data || []
      documentsError = documentsResult.error
    } catch (error) {
      console.error('❌ Unexpected error fetching compliance documents:', error)
      documentsError = error instanceof Error ? error : new Error('Unknown error occurred')
    }

    if (documentsError) {
      console.error('❌ Compliance documents fetch error:', documentsError.message)
      // Don't fail the page for document errors, just log them
    }

    // Handle missing data gracefully
    const safeBuildingAssets = buildingAssets || []
    const safeComplianceDocuments = complianceDocuments || []

    // If no active assets exist, show a message to run the setup
    if (safeBuildingAssets.length === 0) {
      console.log('ℹ️ No compliance assets found for building:', buildingId)
      return (
        <ErrorBoundary>
          <LayoutWithSidebar>
            <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
              <div className="max-w-md mx-auto text-center p-8">
                <div className="bg-white rounded-2xl shadow-lg p-8">
                  <div className="w-16 h-16 bg-[#2BBEB4] rounded-full flex items-center justify-center mx-auto mb-6">
                    <Shield className="h-8 w-8 text-white" />
                  </div>
                  <h2 className="text-2xl font-serif font-bold text-[#333333] mb-4">
                    No Compliance Assets Currently Tracked
                  </h2>
                  <p className="text-gray-600 mb-6">
                    This building doesn't have any compliance requirements configured yet. Set up compliance tracking to start monitoring building requirements.
                  </p>
                  <div className="space-y-3">
                    <button
                      onClick={() => window.location.href = `/buildings/${buildingId}/compliance/setup`}
                      className="w-full bg-[#2BBEB4] hover:bg-[#0F5D5D] text-white px-6 py-3 rounded-lg font-semibold transition-colors duration-200"
                    >
                      Setup Compliance
                    </button>
                    <button
                      onClick={() => window.location.href = '/buildings'}
                      className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-semibold transition-colors duration-200"
                    >
                      View All Buildings
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </LayoutWithSidebar>
        </ErrorBoundary>
      )
    }

    // Calculate compliance statistics
    const totalAssets = safeBuildingAssets.length
    const compliantAssets = safeBuildingAssets.filter((asset: any) => {
      if (!asset.next_due_date) return false
      return new Date(asset.next_due_date) > new Date()
    }).length
    const overdueAssets = safeBuildingAssets.filter((asset: any) => {
      if (!asset.next_due_date) return false
      return new Date(asset.next_due_date) < new Date()
    }).length
    const dueSoonAssets = safeBuildingAssets.filter((asset: any) => {
      if (!asset.next_due_date) return false
      const dueDate = new Date(asset.next_due_date)
      const today = new Date()
      const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      return daysUntilDue <= 30 && daysUntilDue > 0
    }).length

    // Group assets by category
    const groupedAssets = safeBuildingAssets.reduce((acc: any, buildingAsset: any) => {
      const category = buildingAsset.compliance_assets?.category || 'Other'
      if (!acc[category]) {
        acc[category] = []
      }
      
      // Find documents for this asset
      const assetDocuments = safeComplianceDocuments.filter((doc: any) => 
        doc.doc_type?.toLowerCase().includes(buildingAsset.compliance_assets?.name?.toLowerCase() || '') ||
        buildingAsset.compliance_assets?.name?.toLowerCase().includes(doc.doc_type?.toLowerCase() || '')
      )
      
      acc[category].push({
        ...buildingAsset,
        documents: assetDocuments
      })
      
      return acc
    }, {})

    const complianceData = {
      building,
      groupedAssets,
      complianceDocuments: safeComplianceDocuments,
      statistics: {
        total: totalAssets,
        compliant: compliantAssets,
        overdue: overdueAssets,
        dueSoon: dueSoonAssets
      }
    }

    console.log('✅ Building compliance tracker data prepared successfully')

    return (
      <ErrorBoundary>
        <LayoutWithSidebar>
          <BuildingComplianceTracker complianceData={complianceData} />
        </LayoutWithSidebar>
      </ErrorBoundary>
    )
  } catch (error) {
    console.error('❌ Unexpected error in building compliance tracker page:', error)
    return (
      <ErrorBoundary>
        <LayoutWithSidebar>
          <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
            <div className="max-w-md mx-auto text-center p-8">
              <div className="bg-white rounded-2xl shadow-lg p-8">
                <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Shield className="h-8 w-8 text-white" />
                </div>
                <h2 className="text-2xl font-serif font-bold text-[#333333] mb-4">
                  Something Went Wrong
                </h2>
                <p className="text-gray-600 mb-6">
                  We encountered an unexpected error while loading the compliance tracker. Please try again later.
                </p>
                <div className="space-y-3">
                  <button
                    onClick={() => window.location.reload()}
                    className="w-full bg-[#2BBEB4] hover:bg-[#0F5D5D] text-white px-6 py-3 rounded-lg font-semibold transition-colors duration-200"
                  >
                    Try Again
                  </button>
                  <button
                    onClick={() => window.location.href = '/buildings'}
                    className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-semibold transition-colors duration-200"
                  >
                    View All Buildings
                  </button>
                </div>
              </div>
            </div>
          </div>
        </LayoutWithSidebar>
      </ErrorBoundary>
    )
  }
}