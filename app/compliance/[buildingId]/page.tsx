import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import LayoutWithSidebar from '@/components/LayoutWithSidebar'

export default async function CompliancePage({ params }: { params: Promise<{ buildingId: string }> }) {
  try {
    const { buildingId } = await params
    const supabase = createClient(cookies())

    if (!buildingId) {
      return (
        <LayoutWithSidebar>
          <div className="p-6 space-y-4">
            <h1 className="text-2xl font-semibold">Compliance</h1>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-600">Missing building ID.</p>
              <p className="text-red-500 text-sm mt-2">Please provide a valid building ID in the URL.</p>
            </div>
          </div>
        </LayoutWithSidebar>
      )
    }

    const { data: sessionData } = await supabase.auth.getSession()
    if (!sessionData?.session) redirect('/login')

    // Fetch building data
    const { data: building, error: buildingError } = await supabase
      .from('buildings')
      .select('id, name')
      .eq('id', buildingId)
      .maybeSingle()

    if (buildingError) {
      console.error('Building fetch error:', buildingError.message)
      return (
        <LayoutWithSidebar>
          <div className="p-6 space-y-4">
            <h1 className="text-2xl font-semibold">Compliance</h1>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-600">Could not load building information.</p>
              <p className="text-red-500 text-sm mt-2">Error: {buildingError.message}</p>
            </div>
          </div>
        </LayoutWithSidebar>
      )
    }

    if (!building) {
      return (
        <LayoutWithSidebar>
          <div className="p-6 space-y-4">
            <h1 className="text-2xl font-semibold">Compliance</h1>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-600">Building not found.</p>
              <p className="text-red-500 text-sm mt-2">Building ID: {buildingId}</p>
            </div>
          </div>
        </LayoutWithSidebar>
      )
    }

    // Query building compliance assets with related data
    const { data: complianceAssets, error: assetsError } = await supabase
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
      .eq('building_id', parseInt(buildingId, 10))

    if (assetsError) {
      console.error('Compliance assets fetch error:', assetsError.message)
      return (
        <LayoutWithSidebar>
          <div className="p-6 space-y-4">
            <h1 className="text-2xl font-semibold">Compliance</h1>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-600">Could not load compliance data.</p>
              <p className="text-red-500 text-sm mt-2">Error: {assetsError.message}</p>
            </div>
          </div>
        </LayoutWithSidebar>
      )
    }

    // Helper function to format date
    const formatDate = (dateString: string | null): string => {
      if (!dateString) return 'Not set'
      return new Date(dateString).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      })
    }

    // Helper function to get status badge variant
    const getStatusBadgeVariant = (status: string | null): "default" | "destructive" | "warning" | "outline" => {
      if (!status) return 'outline'
      
      switch (status.toLowerCase()) {
        case 'compliant':
          return 'default'
        case 'overdue':
          return 'destructive'
        case 'due soon':
        case 'missing':
          return 'warning'
        default:
          return 'outline'
      }
    }

    // Helper function to determine status
    const getStatus = (asset: any): string => {
      return asset.status || 'Not Started'
    }

    return (
      <LayoutWithSidebar>
        <div className="p-6 space-y-4">
          <h1 className="text-2xl font-semibold">Compliance</h1>
          <p className="text-sm text-gray-600">Building: <strong>{building.name}</strong></p>

        {complianceAssets && complianceAssets.length > 0 ? (
          <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b bg-gray-50">
              <h2 className="text-lg font-medium">Compliance Assets</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Asset Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Due Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {complianceAssets.map((asset) => {
                    const complianceAsset = Array.isArray(asset.compliance_assets) 
                      ? asset.compliance_assets[0] 
                      : asset.compliance_assets
                    const status = getStatus(asset)
                    
                    return (
                      <tr key={asset.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {complianceAsset?.name || 'Unknown Asset'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge variant={getStatusBadgeVariant(status)}>
                            {status}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(asset.last_updated)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {complianceAsset?.category || 'Unknown'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-yellow-800">
              <strong>No compliance records for this building.</strong>
            </p>
            <p className="text-yellow-700 text-sm mt-2">
              Compliance assets need to be set up for this building. Contact your administrator to configure compliance requirements.
            </p>
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-blue-800 text-sm">
            <strong>Note:</strong> This page shows compliance assets for building {building.name}. 
            Status is determined based on due dates and current compliance state.
          </p>
        </div>
        </div>
      </LayoutWithSidebar>
    )
  } catch (err) {
    console.error('Compliance page crash:', err)
    return (
      <LayoutWithSidebar>
        <div className="p-6 space-y-4">
          <h1 className="text-2xl font-semibold">Compliance</h1>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-600">An unexpected error occurred.</p>
            <p className="text-red-500 text-sm mt-2">Error details: {err instanceof Error ? err.message : String(err)}</p>
          </div>
        </div>
      </LayoutWithSidebar>
    )
  }
} 