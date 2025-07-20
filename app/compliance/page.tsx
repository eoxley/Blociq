import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import LayoutWithSidebar from '@/components/LayoutWithSidebar'
import { Shield, Building2, AlertTriangle, CheckCircle, Clock, TrendingUp, Plus, Search, Filter, Calendar, FileText, Users } from 'lucide-react'

export default async function CompliancePage() {
  const supabase = createClient(cookies())
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  try {
    // Fetch all buildings with compliance data
    const { data: buildings, error } = await supabase
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
          last_updated
        )
      `)
      .order('name', { ascending: true })

    if (error) {
      console.error('Error fetching buildings:', error)
      return (
        <LayoutWithSidebar>
          <div className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-red-100 rounded-lg">
                <Shield className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Compliance Management</h1>
                <p className="text-gray-600">Track and manage building compliance requirements</p>
              </div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-600">Error loading buildings: {error.message}</p>
              <p className="text-red-500 text-sm mt-2">Please try refreshing the page or contact support if the issue persists.</p>
            </div>
          </div>
        </LayoutWithSidebar>
      )
    }

    // Calculate compliance statistics
    const totalBuildings = buildings?.length || 0
    const buildingsWithCompliance = buildings?.filter(b => b.building_compliance_assets && b.building_compliance_assets.length > 0).length || 0
    const overdueCount = buildings?.reduce((count, building) => {
      const overdueAssets = building.building_compliance_assets?.filter(asset => 
        asset.status === 'overdue' || 
        (asset.next_due_date && new Date(asset.next_due_date) < new Date())
      ) || []
      return count + overdueAssets.length
    }, 0) || 0
    const dueSoonCount = buildings?.reduce((count, building) => {
      const dueSoonAssets = building.building_compliance_assets?.filter(asset => {
        if (!asset.next_due_date) return false
        const dueDate = new Date(asset.next_due_date)
        const today = new Date()
        const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        return daysUntilDue <= 30 && daysUntilDue > 0
      }) || []
      return count + dueSoonAssets.length
    }, 0) || 0

    return (
      <LayoutWithSidebar>
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-teal-100 rounded-lg">
                <Shield className="h-6 w-6 text-teal-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Compliance Management</h1>
                <p className="text-gray-600">Track and manage building compliance requirements</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/compliance/setup"
                className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Setup Compliance
              </Link>
            </div>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-100">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Building2 className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Buildings</p>
                  <p className="text-2xl font-bold text-gray-900">{totalBuildings}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-100">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">With Compliance</p>
                  <p className="text-2xl font-bold text-gray-900">{buildingsWithCompliance}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-100">
              <div className="flex items-center">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Overdue Items</p>
                  <p className="text-2xl font-bold text-gray-900">{overdueCount}</p>
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
                  <p className="text-2xl font-bold text-gray-900">{dueSoonCount}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-gradient-to-r from-teal-50 to-blue-50 border border-teal-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link
                href="/compliance/setup"
                className="flex items-center gap-3 p-4 bg-white rounded-lg border border-teal-200 hover:border-teal-300 hover:shadow-md transition-all"
              >
                <div className="p-2 bg-teal-100 rounded-lg">
                  <Plus className="h-5 w-5 text-teal-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Setup Compliance</h3>
                  <p className="text-sm text-gray-600">Configure compliance requirements</p>
                </div>
              </Link>
              
              <Link
                href="/compliance/documents"
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
                href="/compliance/reports"
                className="flex items-center gap-3 p-4 bg-white rounded-lg border border-teal-200 hover:border-teal-300 hover:shadow-md transition-all"
              >
                <div className="p-2 bg-purple-100 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">View Reports</h3>
                  <p className="text-sm text-gray-600">Compliance status reports</p>
                </div>
              </Link>
            </div>
          </div>

          {/* Buildings Grid */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Buildings</h2>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search buildings..."
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
                <select className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent">
                  <option value="all">All Buildings</option>
                  <option value="with-compliance">With Compliance</option>
                  <option value="without-compliance">Without Compliance</option>
                  <option value="overdue">With Overdue Items</option>
                </select>
              </div>
            </div>

            {buildings && buildings.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {buildings.map((building) => {
                  const complianceAssets = building.building_compliance_assets || []
                  const hasCompliance = complianceAssets.length > 0
                  const overdueAssets = complianceAssets.filter(asset => 
                    asset.status === 'overdue' || 
                    (asset.next_due_date && new Date(asset.next_due_date) < new Date())
                  )
                  const dueSoonAssets = complianceAssets.filter(asset => {
                    if (!asset.next_due_date) return false
                    const dueDate = new Date(asset.next_due_date)
                    const today = new Date()
                    const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
                    return daysUntilDue <= 30 && daysUntilDue > 0
                  })

                  return (
                    <Link
                      key={building.id}
                      href={`/compliance/${building.id}`}
                      className="group block bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-lg transition-all duration-200 overflow-hidden"
                    >
                      {/* Status Indicator */}
                      <div className={`h-2 ${overdueAssets.length > 0 ? 'bg-red-500' : dueSoonAssets.length > 0 ? 'bg-yellow-500' : hasCompliance ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                      
                      <div className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-gray-900 group-hover:text-teal-600 transition-colors">
                              {building.name}
                            </h3>
                            {building.address && (
                              <p className="text-sm text-gray-600 mt-1">{building.address}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            {overdueAssets.length > 0 && (
                              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                            )}
                            {dueSoonAssets.length > 0 && overdueAssets.length === 0 && (
                              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                            )}
                          </div>
                        </div>

                        <div className="space-y-3">
                          {/* Compliance Status */}
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Compliance Status</span>
                            <span className={`text-sm font-medium ${
                              overdueAssets.length > 0 ? 'text-red-600' : 
                              dueSoonAssets.length > 0 ? 'text-yellow-600' : 
                              hasCompliance ? 'text-green-600' : 'text-gray-500'
                            }`}>
                              {overdueAssets.length > 0 ? `${overdueAssets.length} Overdue` :
                               dueSoonAssets.length > 0 ? `${dueSoonAssets.length} Due Soon` :
                               hasCompliance ? 'Compliant' : 'Not Setup'}
                            </span>
                          </div>

                          {/* Building Info */}
                          <div className="flex items-center justify-between text-sm text-gray-500">
                            <div className="flex items-center gap-1">
                              <Users className="h-4 w-4" />
                              <span>{building.unit_count || 0} Units</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Shield className="h-4 w-4" />
                              <span>{complianceAssets.length} Assets</span>
                            </div>
                          </div>
                        </div>

                        {/* Action Button */}
                        <div className="mt-4 pt-4 border-t border-gray-100">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-teal-600 font-medium">View Details</span>
                            <div className="w-6 h-6 bg-teal-100 rounded-full flex items-center justify-center group-hover:bg-teal-200 transition-colors">
                              <div className="w-2 h-2 bg-teal-600 rounded-full"></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
                <Shield className="mx-auto h-12 w-12 text-yellow-500 mb-4" />
                <h3 className="text-lg font-medium text-yellow-800 mb-2">No Buildings Found</h3>
                <p className="text-yellow-700 mb-4">
                  Please add buildings to your portfolio to view compliance information.
                </p>
                <Link
                  href="/buildings"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Add Building
                </Link>
              </div>
            )}
          </div>

          {/* Compliance Overview */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Compliance Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium text-gray-900 mb-3">Key Requirements</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    Fire Risk Assessments
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                    Electrical Installation Condition Reports (EICR)
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    Gas Safety Certificates
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    Energy Performance Certificates (EPC)
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    Building Insurance
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="font-medium text-gray-900 mb-3">Benefits</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Automated compliance tracking
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Early warning for due dates
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Document management
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Regulatory compliance
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Risk mitigation
                  </li>
                </ul>
              </div>
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
              <h1 className="text-2xl font-bold text-gray-900">Compliance Management</h1>
              <p className="text-gray-600">Track and manage building compliance requirements</p>
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