'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Building2,
  RefreshCw,
  AlertCircle,
  Plus,
  Search,
  Filter,
  Calendar,
  FileText,
  TrendingUp,
  Users,
  Sparkles
} from 'lucide-react'
import { BlocIQButton } from '@/components/ui/blociq-button'

// Types
interface ComplianceAsset {
  id: string
  title: string
  category: string
  description: string
  frequency_months: number
  is_required: boolean
}

interface BuildingComplianceAsset {
  id: string
  building_id: string
  compliance_asset_id: string
  due_date: string | null
  document_id: string | null
  status: 'compliant' | 'overdue' | 'upcoming' | 'not_applied'
  last_renewed_date: string | null
  next_due_date: string | null
  notes: string | null
  contractor: string | null
  created_at: string
  updated_at: string
  buildings: {
    id: string
    name: string
    is_hrb: boolean
  } | null
  compliance_assets: ComplianceAsset | null
  building_documents: {
    id: string
    file_url: string
    uploaded_at: string
  } | null
}

interface Building {
  id: string
  name: string
  is_hrb: boolean
  compliance_assets_count: number
  compliant_count: number
  overdue_count: number
  upcoming_count: number
  not_applied_count: number
}

interface ComplianceSummary {
  total_buildings: number
  total_assets: number
  compliant_count: number
  overdue_count: number
  upcoming_count: number
  not_applied_count: number
  compliance_percentage: number
}

export default function CompliancePage() {
  const router = useRouter()
  const supabase = createClientComponentClient()
  
  const [buildings, setBuildings] = useState<Building[]>([])
  const [complianceData, setComplianceData] = useState<BuildingComplianceAsset[]>([])
  const [summary, setSummary] = useState<ComplianceSummary>({
    total_buildings: 0,
    total_assets: 0,
    compliant_count: 0,
    overdue_count: 0,
    upcoming_count: 0,
    not_applied_count: 0,
    compliance_percentage: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterBuilding, setFilterBuilding] = useState<string>('all')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchComplianceData()
  }, [])

  const fetchComplianceData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Check authentication
      const { data: { session }, error: authError } = await supabase.auth.getSession()
      if (authError || !session) {
        throw new Error('Authentication required. Please log in.')
      }

      console.log('🔐 User authenticated:', session.user.id)

      // Fetch all buildings the user manages
      const { data: buildingsData, error: buildingsError } = await supabase
        .from('buildings')
        .select('id, name, is_hrb')
        .order('name')

      if (buildingsError) {
        console.error('❌ Buildings query error:', buildingsError)
        throw buildingsError
      }

      const userBuildings = buildingsData || []
      console.log('✅ Buildings fetched:', userBuildings.length)

      // Fetch compliance data for all buildings
      const { data, error } = await supabase
        .from('building_compliance_assets')
        .select(`
          *,
          buildings (id, name, is_hrb),
          compliance_assets (id, title, category, description, frequency_months, is_required),
          building_documents (id, file_url, uploaded_at)
        `)
        .in('building_id', userBuildings.map(b => b.id))
        .order('next_due_date', { ascending: true })

      if (error) {
        console.error('❌ Compliance data query error:', error)
        throw error
      }

      console.log('✅ Compliance data fetched:', data?.length || 0, 'items')
      setComplianceData(data || [])

      // Process data to create building summaries
      const buildingSummaries = userBuildings.map(building => {
        const buildingAssets = data?.filter(item => item.building_id === building.id) || []
        const compliant = buildingAssets.filter(item => item.status === 'compliant').length
        const overdue = buildingAssets.filter(item => item.status === 'overdue').length
        const upcoming = buildingAssets.filter(item => item.status === 'upcoming').length
        const notApplied = buildingAssets.filter(item => item.status === 'not_applied').length

        return {
          ...building,
          compliance_assets_count: buildingAssets.length,
          compliant_count: compliant,
          overdue_count: overdue,
          upcoming_count: upcoming,
          not_applied_count: notApplied
        }
      })

      setBuildings(buildingSummaries)

      // Calculate overall summary
      const totalAssets = data?.length || 0
      const compliant = data?.filter(item => item.status === 'compliant').length || 0
      const overdue = data?.filter(item => item.status === 'overdue').length || 0
      const upcoming = data?.filter(item => item.status === 'upcoming').length || 0
      const notApplied = data?.filter(item => item.status === 'not_applied').length || 0

      setSummary({
        total_buildings: userBuildings.length,
        total_assets: totalAssets,
        compliant_count: compliant,
        overdue_count: overdue,
        upcoming_count: upcoming,
        not_applied_count: notApplied,
        compliance_percentage: totalAssets > 0 ? Math.round((compliant / totalAssets) * 100) : 0
      })

    } catch (err) {
      console.error('❌ Error fetching compliance data:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch compliance data')
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'compliant':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'upcoming':
        return <Clock className="h-5 w-5 text-yellow-500" />
      case 'overdue':
        return <AlertTriangle className="h-5 w-5 text-red-500" />
      case 'not_applied':
        return <AlertCircle className="h-5 w-5 text-gray-500" />
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
    
    switch (status) {
      case 'compliant':
        return <span className={`${baseClasses} bg-green-100 text-green-800`}>✅ Compliant</span>
      case 'upcoming':
        return <span className={`${baseClasses} bg-yellow-100 text-yellow-800`}>⏳ Upcoming</span>
      case 'overdue':
        return <span className={`${baseClasses} bg-red-100 text-red-800`}>❌ Overdue</span>
      case 'not_applied':
        return <span className={`${baseClasses} bg-gray-100 text-gray-800`}>🚫 Not Applied</span>
      default:
        return <span className={`${baseClasses} bg-gray-100 text-gray-800`}>❓ Unknown</span>
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category?.toLowerCase()) {
      case 'safety':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'legal':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'operational':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'structural':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const filteredBuildings = buildings.filter(building => {
    if (filterBuilding !== 'all' && building.id !== filterBuilding) return false
    return true
  })

  const filteredComplianceData = complianceData.filter(item => {
    if (filterBuilding !== 'all' && item.building_id !== filterBuilding) return false
    if (filterCategory !== 'all' && item.compliance_assets?.category !== filterCategory) return false
    if (filterStatus !== 'all' && item.status !== filterStatus) return false
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const buildingName = item.buildings?.name?.toLowerCase() || ''
      const assetTitle = item.compliance_assets?.title?.toLowerCase() || ''
      const assetDescription = item.compliance_assets?.description?.toLowerCase() || ''
      
      if (!buildingName.includes(query) && !assetTitle.includes(query) && !assetDescription.includes(query)) {
        return false
      }
    }
    return true
  })

  const categories = [...new Set(complianceData.map(item => item.compliance_assets?.category).filter(Boolean))]

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <RefreshCw className="h-12 w-12 text-blue-500 animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Loading compliance data...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-red-800 mb-2">Error Loading Compliance Data</h2>
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={fetchComplianceData}
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-6 shadow-sm">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-r from-[#004AAD] via-[#3B82F6] to-[#7209B7] rounded-2xl flex items-center justify-center shadow-lg">
                  <Shield className="h-6 w-6 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full animate-pulse"></div>
                <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-cyan-400 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-[#004AAD] to-[#7209B7] bg-clip-text text-transparent">
                  Compliance Overview
                </h1>
                <p className="text-sm text-gray-600 flex items-center gap-2 mt-2">
                  <Building2 className="h-4 w-4" />
                  {summary.total_buildings} buildings • {summary.total_assets} compliance assets
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={fetchComplianceData}
                className="p-3 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-all duration-200 hover:scale-110"
                title="Refresh data"
              >
                <RefreshCw className="h-5 w-5" />
              </button>
              
              <BlocIQButton
                buildingId={null}
                buildingName="Compliance System"
                context="compliance"
                placeholder="Ask about compliance requirements..."
                className="bg-gradient-to-r from-[#004AAD] to-[#7209B7] hover:from-[#003A8C] hover:to-[#5A078F]"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* Compliance Summary Bar */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-500" />
            Overall Compliance Status
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600">Compliant</p>
                  <p className="text-2xl font-bold text-green-700">{summary.compliant_count}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-red-50 to-rose-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-red-600">Overdue</p>
                  <p className="text-2xl font-bold text-red-700">{summary.overdue_count}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-500" />
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-yellow-600">Upcoming</p>
                  <p className="text-2xl font-bold text-yellow-700">{summary.upcoming_count}</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-500" />
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-gray-50 to-slate-50 border border-gray-200 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Not Applied</p>
                  <p className="text-2xl font-bold text-gray-700">{summary.not_applied_count}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-gray-500" />
              </div>
            </div>
          </div>
          
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-500" />
                <span className="text-sm font-medium text-gray-700">Overall Compliance Rate</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${summary.compliance_percentage}%` }}
                  ></div>
                </div>
                <span className="text-lg font-bold text-gray-900">{summary.compliance_percentage}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search buildings, assets, or descriptions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <select
              value={filterBuilding}
              onChange={(e) => setFilterBuilding(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Buildings</option>
              {buildings.map(building => (
                <option key={building.id} value={building.id}>
                  {building.name}
                </option>
              ))}
            </select>
            
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Statuses</option>
              <option value="compliant">Compliant</option>
              <option value="overdue">Overdue</option>
              <option value="upcoming">Upcoming</option>
              <option value="not_applied">Not Applied</option>
            </select>
          </div>
        </div>

        {/* Buildings Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredBuildings.map(building => (
            <div key={building.id} className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{building.name}</h3>
                      {building.is_hrb && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
                          🏢 HRB
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">
                      {building.compliance_assets_count} compliance assets
                    </p>
                  </div>
                  
                  <button
                    onClick={() => router.push(`/dashboard/buildings/${building.id}/compliance`)}
                    className="inline-flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-[#004AAD] to-[#7209B7] text-white text-sm rounded-lg hover:from-[#003A8C] hover:to-[#5A078F] transition-all duration-200 transform hover:scale-105"
                  >
                    <Shield className="h-4 w-4" />
                    View Details
                  </button>
                </div>
                
                {/* Building Compliance Summary */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-green-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-green-600 font-medium">Compliant</p>
                    <p className="text-lg font-bold text-green-700">{building.compliant_count}</p>
                  </div>
                  
                  <div className="bg-red-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-red-600 font-medium">Overdue</p>
                    <p className="text-lg font-bold text-red-700">{building.overdue_count}</p>
                  </div>
                  
                  <div className="bg-yellow-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-yellow-600 font-medium">Upcoming</p>
                    <p className="text-lg font-bold text-yellow-700">{building.upcoming_count}</p>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-gray-600 font-medium">Not Applied</p>
                    <p className="text-lg font-bold text-gray-700">{building.not_applied_count}</p>
                  </div>
                </div>
                
                {/* Quick Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => router.push(`/dashboard/buildings/${building.id}/compliance`)}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 text-sm rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    Manage Assets
                  </button>
                  
                  <button
                    onClick={() => router.push(`/dashboard/buildings/${building.id}`)}
                    className="inline-flex items-center justify-center gap-2 px-3 py-2 bg-gray-50 text-gray-700 text-sm rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <Building2 className="h-4 w-4" />
                    Building
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Compliance Assets List */}
        {filteredComplianceData.length > 0 && (
          <div className="mt-8">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">All Compliance Assets</h2>
              </div>
              
              <div className="divide-y divide-gray-100">
                {filteredComplianceData.map(item => (
                  <div key={item.id} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          {getStatusIcon(item.status)}
                          <h3 className="text-lg font-medium text-gray-900">
                            {item.compliance_assets?.title || 'Unknown Asset'}
                          </h3>
                          {getStatusBadge(item.status)}
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                          <span className="flex items-center gap-1">
                            <Building2 className="h-4 w-4" />
                            {item.buildings?.name || 'Unknown Building'}
                          </span>
                          
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getCategoryColor(item.compliance_assets?.category)}`}>
                            {item.compliance_assets?.category || 'Unknown'}
                          </span>
                          
                          {item.next_due_date && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              Due: {new Date(item.next_due_date).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        
                        <p className="text-gray-700 mb-3">
                          {item.compliance_assets?.description || 'No description available'}
                        </p>
                        
                        {item.notes && (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                            <p className="text-sm text-blue-800">
                              <strong>Notes:</strong> {item.notes}
                            </p>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 ml-4">
                        {item.building_documents && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                            <FileText className="h-3 w-3" />
                            Document
                          </span>
                        )}
                        
                        <button
                          onClick={() => router.push(`/dashboard/buildings/${item.building_id}/compliance`)}
                          className="inline-flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 text-sm rounded-lg hover:bg-blue-100 transition-colors"
                        >
                          <Shield className="h-4 w-4" />
                          Manage
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {filteredComplianceData.length === 0 && !loading && (
          <div className="text-center py-12">
            <Shield className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No compliance assets found</h3>
            <p className="text-gray-500 mb-4">
              {searchQuery || filterBuilding !== 'all' || filterCategory !== 'all' || filterStatus !== 'all'
                ? 'Try adjusting your filters or search terms'
                : 'Get started by adding compliance assets to your buildings'
              }
            </p>
            {!searchQuery && filterBuilding === 'all' && filterCategory === 'all' && filterStatus === 'all' && (
              <button
                onClick={() => router.push('/dashboard/buildings')}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#004AAD] to-[#7209B7] text-white rounded-lg hover:from-[#003A8C] hover:to-[#5A078F] transition-all duration-200"
              >
                <Plus className="h-4 w-4" />
                Add Compliance Assets
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
