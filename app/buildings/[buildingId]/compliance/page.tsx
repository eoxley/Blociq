import React from 'react'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { Shield } from 'lucide-react'
import LayoutWithSidebar from '@/components/LayoutWithSidebar'
import ComplianceTrackerClient from './ComplianceTrackerClient'
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

    console.log('🔍 Fetching building compliance tracker for ID:', buildingId)

    // Fetch building details
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
              <h1 className="text-2xl font-semibold text-[#333333]">Compliance Tracker</h1>
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
              <h1 className="text-2xl font-semibold text-[#333333]">Compliance Tracker</h1>
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="text-red-600">Building not found.</p>
                <p className="text-red-500 text-sm mt-2">Building ID: {buildingId}</p>
              </div>
            </div>
          </LayoutWithSidebar>
        </ErrorBoundary>
      )
    }

    // Fetch active building compliance assets with compliance asset details
    const { data: buildingAssets, error: buildingAssetsError } = await supabase
      .from('building_compliance_assets')
      .select(`
        *,
        compliance_assets (
          id,
          name,
          description,
          category
        )
      `)
      .eq('building_id', buildingId)
      .eq('status', 'active')

    if (buildingAssetsError) {
      console.error('Building compliance assets fetch error:', buildingAssetsError.message)
      return (
        <ErrorBoundary>
          <LayoutWithSidebar>
            <div className="p-6 space-y-4">
              <h1 className="text-2xl font-semibold text-[#333333]">Compliance Tracker</h1>
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="text-red-600">Could not load compliance assets.</p>
                <p className="text-red-500 text-sm mt-2">Error: {buildingAssetsError.message}</p>
              </div>
            </div>
          </LayoutWithSidebar>
        </ErrorBoundary>
      )
    }

    // Fetch compliance documents for this building
    const { data: complianceDocuments, error: documentsError } = await supabase
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

    if (documentsError) {
      console.error('Compliance documents fetch error:', documentsError.message)
    }

    // Handle missing data gracefully
    const safeBuildingAssets = buildingAssets || []
    const safeComplianceDocuments = complianceDocuments || []

    // If no active assets exist, show a message to run the setup
    if (safeBuildingAssets.length === 0) {
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
                    No Compliance Assets Configured
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
                      onClick={() => window.history.back()}
                      className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-semibold transition-colors duration-200"
                    >
                      Go Back
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
    const missingDocuments = safeBuildingAssets.filter((asset: any) => {
      // Check if there's a document for this asset
      const assetDocuments = safeComplianceDocuments.filter((doc: any) => 
        doc.doc_type?.toLowerCase().includes(asset.compliance_assets?.name?.toLowerCase() || '') ||
        asset.compliance_assets?.name?.toLowerCase().includes(doc.doc_type?.toLowerCase() || '')
      )
      return assetDocuments.length === 0
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
        dueSoon: dueSoonAssets,
        missingDocuments
      }
    }

    console.log('✅ Building compliance tracker data prepared successfully')

    return (
      <ErrorBoundary>
        <LayoutWithSidebar>
          <ComplianceTrackerClient complianceData={complianceData} />
        </LayoutWithSidebar>
      </ErrorBoundary>
    )
  } catch (error) {
    console.error('❌ Unexpected error in building compliance tracker page:', error)
    redirect('/buildings')
  }
}