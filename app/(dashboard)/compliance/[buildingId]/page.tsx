import { cookies } from 'next/headers'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { redirect } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import LayoutWithSidebar from '@/components/LayoutWithSidebar'
import Link from 'next/link'
import { Shield, Building2, AlertTriangle, CheckCircle, Clock, TrendingUp, ArrowLeft, Calendar, FileText, Users, Settings, BarChart3 } from 'lucide-react'

export default async function CompliancePage({ params }: { params: Promise<{ buildingId: string }> }) {
  try {
    const { buildingId } = await params
    const cookieStore = cookies()
    const supabase = createServerComponentClient({ cookies: () => cookieStore })

    if (!buildingId) {
      return (
        <LayoutWithSidebar>
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-red-100 rounded-lg">
                <Shield className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Building Compliance</h1>
                <p className="text-gray-600">Compliance management for building</p>
              </div>
            </div>
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

    // Fetch building data with more details
    const { data: building, error: buildingError } = await supabase
      .from('buildings')
      .select(`
        id, 
        name,
        address,
        unit_count,
        created_at,
        units (
          id,
          unit_number
        )
      `)
      .eq('id', buildingId)
      .maybeSingle()

    if (buildingError) {
      console.error('Building fetch error:', buildingError.message)
      return (
        <LayoutWithSidebar>
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-red-100 rounded-lg">
                <Shield className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Building Compliance</h1>
                <p className="text-gray-600">Compliance management for building</p>
              </div>
            </div>
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
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-red-100 rounded-lg">
                <Shield className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Building Compliance</h1>
                <p className="text-gray-600">Compliance management for building</p>
              </div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-600">Building not found.</p>
              <p className="text-red-500 text-sm mt-2">Building ID: {buildingId}</p>
            </div>
          </div>
        </LayoutWithSidebar>
      )
    }

    // Calculate actual unit count from units array
    const actualUnitCount = building.units?.length || 0
    const buildingWithActualCount = {
      ...building,
      unit_count: actualUnitCount
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
      .eq('building_id', buildingId)

    if (assetsError) {
      console.error('Compliance assets fetch error:', assetsError.message)
      return (
        <LayoutWithSidebar>
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-red-100 rounded-lg">
                <Shield className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Building Compliance</h1>
                <p className="text-gray-600">Compliance management for building</p>
              </div>
            </div>
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

    // Calculate compliance statistics
    const totalAssets = complianceAssets?.length || 0
    const compliantAssets = complianceAssets?.filter(asset => getStatus(asset) === 'compliant').length || 0
    const overdueAssets = complianceAssets?.filter(asset => getStatus(asset) === 'overdue').length || 0
    const dueSoonAssets = complianceAssets?.filter(asset => getStatus(asset) === 'due soon').length || 0
    const complianceRate = totalAssets > 0 ? Math.round((compliantAssets / totalAssets) * 100) : 0

    // Group assets by category
    const assetsByCategory = complianceAssets?.reduce((acc, asset) => {
      const complianceAsset = Array.isArray(asset.compliance_assets) 
        ? asset.compliance_assets[0] 
        : asset.compliance_assets
      const category = complianceAsset?.category || 'Unknown'
      
      if (!acc[category]) {
        acc[category] = []
      }
      acc[category].push(asset)
      return acc
    }, {} as Record<string, any[]>) || {}

    return (
      <LayoutWithSidebar>
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                href="/compliance"
                className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600" />
              </Link>
              <div className="p-2 bg-teal-100 rounded-lg">
                <Shield className="h-6 w-6 text-teal-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Building Compliance</h1>
                <p className="text-gray-600">{buildingWithActualCount.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href={`/compliance/${buildingId}/setup`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
              >
                <Settings className="h-4 w-4" />
                Setup Compliance
              </Link>
            </div>
          </div>

          {/* Building Info Card */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Building2 className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Building</p>
                  <p className="text-lg font-semibold text-gray-900">{buildingWithActualCount.name}</p>
                  {buildingWithActualCount.address && (
                    <p className="text-sm text-gray-500">{buildingWithActualCount.address}</p>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Users className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Units</p>
                  <p className="text-lg font-semibold text-gray-900">{actualUnitCount}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Calendar className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Added</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {buildingWithActualCount.created_at ? formatDate(buildingWithActualCount.created_at) : 'Unknown'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-100">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Shield className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Assets</p>
                  <p className="text-2xl font-bold text-gray-900">{totalAssets}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-100">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Compliant</p>
                  <p className="text-2xl font-bold text-gray-900">{compliantAssets}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-100">
              <div className="flex items-center">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Overdue</p>
                  <p className="text-2xl font-bold text-gray-900">{overdueAssets}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-100">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Clock className="h-6 w-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Due Soon</p>
                  <p className="text-2xl font-bold text-gray-900">{dueSoonAssets}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Compliance Progress */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Compliance Progress</h2>
              <span className="text-2xl font-bold text-teal-600">{complianceRate}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-teal-600 h-3 rounded-full transition-all duration-500"
                style={{ width: `${complianceRate}%` }}
              ></div>
            </div>
            <div className="flex items-center justify-between mt-2 text-sm text-gray-600">
              <span>{compliantAssets} of {totalAssets} assets compliant</span>
              <span>{totalAssets - compliantAssets} remaining</span>
            </div>
          </div>

          {/* Compliance Assets by Category */}
          {Object.keys(assetsByCategory).length > 0 ? (
            <div className="space-y-6">
              {Object.entries(assetsByCategory).map(([category, assets]) => (
                <div key={category} className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b bg-gray-50">
                    <h3 className="text-lg font-medium text-gray-900">{category}</h3>
                    <p className="text-sm text-gray-600">{assets.length} compliance items</p>
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
                            Last Updated
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Next Due
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {assets.map((asset) => {
                          const complianceAsset = Array.isArray(asset.compliance_assets) 
                            ? asset.compliance_assets[0] 
                            : asset.compliance_assets
                          const status = getStatus(asset)
                          
                          return (
                            <tr key={asset.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div>
                                  <div className="text-sm font-medium text-gray-900">
                                    {complianceAsset?.name || 'Unknown Asset'}
                                  </div>
                                  {complianceAsset?.description && (
                                    <div className="text-sm text-gray-500">
                                      {complianceAsset.description}
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <Badge variant={getStatusBadgeVariant(status)}>
                                  {status}
                                </Badge>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {asset.last_updated ? formatDate(asset.last_updated) : 'Not set'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {formatDate(asset.next_due_date)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <Link
                                  href={`/compliance/${buildingId}/asset/${asset.id}`}
                                  className="text-teal-600 hover:text-teal-900"
                                >
                                  View Details
                                </Link>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
              <Shield className="mx-auto h-12 w-12 text-yellow-500 mb-4" />
              <h3 className="text-lg font-medium text-yellow-800 mb-2">No Compliance Records</h3>
              <p className="text-yellow-700 mb-4">
                Compliance assets need to be set up for this building. Configure compliance requirements to get started.
              </p>
              <Link
                href={`/compliance/${buildingId}/setup`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
              >
                <Settings className="h-4 w-4" />
                Setup Compliance
              </Link>
            </div>
          )}

          {/* Quick Actions */}
          <div className="bg-gradient-to-r from-teal-50 to-blue-50 border border-teal-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link
                href={`/compliance/${buildingId}/setup`}
                className="flex items-center gap-3 p-4 bg-white rounded-lg border border-teal-200 hover:border-teal-300 hover:shadow-md transition-all"
              >
                <div className="p-2 bg-teal-100 rounded-lg">
                  <Settings className="h-5 w-5 text-teal-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Setup Compliance</h3>
                  <p className="text-sm text-gray-600">Configure compliance requirements</p>
                </div>
              </Link>
              
              <Link
                href={`/compliance/${buildingId}/documents`}
                className="flex items-center gap-3 p-4 bg-white rounded-lg border border-teal-200 hover:border-teal-300 hover:shadow-md transition-all"
              >
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FileText className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Upload Documents</h3>
                  <p className="text-sm text-gray-600">Add compliance certificates</p>
                </div>
              </Link>
              
              <Link
                href={`/compliance/${buildingId}/reports`}
                className="flex items-center gap-3 p-4 bg-white rounded-lg border border-teal-200 hover:border-teal-300 hover:shadow-md transition-all"
              >
                <div className="p-2 bg-purple-100 rounded-lg">
                  <BarChart3 className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">View Reports</h3>
                  <p className="text-sm text-gray-600">Compliance status reports</p>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </LayoutWithSidebar>
    )
  } catch (error) {
    console.error('Unexpected error in compliance page:', error)
    return (
      <LayoutWithSidebar>
        <div className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-red-100 rounded-lg">
              <Shield className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Building Compliance</h1>
              <p className="text-gray-600">Compliance management for building</p>
            </div>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-600">An unexpected error occurred while loading compliance data.</p>
            <p className="text-red-500 text-sm mt-2">Please try refreshing the page or contact support if the issue persists.</p>
          </div>
        </div>
      </LayoutWithSidebar>
    )
  }
} 