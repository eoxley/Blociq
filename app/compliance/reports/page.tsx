import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import LayoutWithSidebar from '@/components/LayoutWithSidebar'
import ComplianceReportsClient from './ComplianceReportsClient'

export default async function ComplianceReportsPage() {
  const supabase = createClient(cookies())
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  try {
    // Fetch all buildings with compliance data
    const { data: buildings, error: buildingsError } = await supabase
      .from('buildings')
      .select(`
        id, 
        name,
        address,
        unit_count,
        building_compliance_assets (
          id,
          status,
          next_due_date,
          last_updated,
          compliance_assets (
            id,
            name,
            category
          )
        )
      `)
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

    // Fetch compliance documents for expiry tracking
    const { data: complianceDocs, error: docsError } = await supabase
      .from('compliance_docs')
      .select(`
        id,
        building_id,
        doc_type,
        expiry_date,
        start_date,
        buildings (
          id,
          name
        )
      `)
      .not('expiry_date', 'is', null)

    if (docsError) {
      console.error('Error fetching compliance documents:', docsError)
    }

    // Fetch all compliance assets for reference
    const { data: complianceAssets, error: assetsError } = await supabase
      .from('compliance_assets')
      .select('id, name, category')
      .order('category', { ascending: true })
      .order('name', { ascending: true })

    if (assetsError) {
      console.error('Error fetching compliance assets:', assetsError)
    }

    // Calculate portfolio statistics
    const today = new Date()
    const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)

    let totalComplianceAssets = 0
    let totalBuildingsWithTracking = 0
    let totalOverdueItems = 0
    let totalDueSoonItems = 0

    // Process building compliance data
    buildings?.forEach(building => {
      const buildingAssets = building.building_compliance_assets || []
      if (buildingAssets.length > 0) {
        totalBuildingsWithTracking++
        totalComplianceAssets += buildingAssets.length

        buildingAssets.forEach(asset => {
          if (asset.next_due_date) {
            const dueDate = new Date(asset.next_due_date)
            if (dueDate < today) {
              totalOverdueItems++
            } else if (dueDate <= thirtyDaysFromNow) {
              totalDueSoonItems++
            }
          }
        })
      }
    })

    // Process compliance documents
    complianceDocs?.forEach(doc => {
      if (doc.expiry_date) {
        const expiryDate = new Date(doc.expiry_date)
        if (expiryDate < today) {
          totalOverdueItems++
        } else if (expiryDate <= thirtyDaysFromNow) {
          totalDueSoonItems++
        }
      }
    })

    return (
      <LayoutWithSidebar>
        <div className="p-6">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Compliance Reports</h1>
              <p className="text-gray-600">
                Portfolio-wide compliance analytics and reporting for client presentations and internal audits.
              </p>
            </div>

            <ComplianceReportsClient 
              buildings={buildings || []}
              complianceDocs={complianceDocs || []}
              complianceAssets={complianceAssets || []}
              portfolioStats={{
                totalComplianceAssets,
                totalBuildingsWithTracking,
                totalOverdueItems,
                totalDueSoonItems
              }}
            />
          </div>
        </div>
      </LayoutWithSidebar>
    )
  } catch (error) {
    console.error('Error in compliance reports page:', error)
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