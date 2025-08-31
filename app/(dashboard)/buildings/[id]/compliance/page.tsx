'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
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
  Sparkles,
  Settings,
  ChevronDown,
  ChevronRight,
  ToggleLeft,
  ToggleRight,
  Upload,
  X,
  ChevronLeft
} from 'lucide-react'
import AskBlocIQ from '@/components/AskBlocIQ'
import AssetManagementModal from '@/components/compliance/AssetManagementModal'

// Types
interface ComplianceAsset {
  id: string
  name: string
  category: string
  description: string
  frequency_months: number
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
  compliance_assets: ComplianceAsset | null
  compliance_documents: {
    id: string
    document_url: string
    created_at: string
  } | null
}

interface Building {
  id: string
  name: string
  is_hrb: boolean
  address?: string
  total_floors?: number
  construction_type?: string
}

interface ComplianceSummary {
  total_assets: number
  compliant_count: number
  overdue_count: number
  upcoming_count: number
  not_applied_count: number
  compliance_percentage: number
}

export default function BuildingCompliancePage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClientComponentClient()
  const buildingId = params.id as string
  
  const [building, setBuilding] = useState<Building | null>(null)
  const [complianceData, setComplianceData] = useState<BuildingComplianceAsset[]>([])
  const [allComplianceAssets, setAllComplianceAssets] = useState<ComplianceAsset[]>([])
  const [summary, setSummary] = useState<ComplianceSummary>({
    total_assets: 0,
    compliant_count: 0,
    overdue_count: 0,
    upcoming_count: 0,
    not_applied_count: 0,
    compliance_percentage: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showAssetModal, setShowAssetModal] = useState(false)
  const [updatingAssets, setUpdatingAssets] = useState(false)

  useEffect(() => {
    if (buildingId) {
      fetchBuildingData()
      fetchComplianceData()
      fetchAllComplianceAssets()
    }
  }, [buildingId])

  const fetchBuildingData = async () => {
    try {
      const { data, error } = await supabase
        .from('buildings')
        .select('id, name, is_hrb, address, total_floors, construction_type')
        .eq('id', buildingId)
        .single()

      if (error) throw error
      setBuilding(data)
    } catch (err) {
      console.error('Error fetching building data:', err)
    }
  }

  const fetchComplianceData = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from('building_compliance_assets')
        .select(`
          *,
          compliance_assets (id, name, category, description, frequency_months),
          compliance_documents (id, document_url, created_at)
        `)
        .eq('building_id', buildingId)
        .order('next_due_date', { ascending: true })

      if (error) throw error

      setComplianceData(data || [])
      calculateSummary(data || [])
    } catch (err) {
      console.error('Error fetching compliance data:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch compliance data')
    } finally {
      setLoading(false)
    }
  }

  const fetchAllComplianceAssets = async () => {
    try {
      const { data, error } = await supabase
        .from('compliance_assets')
        .select('*')
        .order('category')
        .order('title')

      if (error) throw error
      setAllComplianceAssets(data || [])
    } catch (err) {
      console.error('Error fetching all compliance assets:', err)
    }
  }

  const calculateSummary = (data: BuildingComplianceAsset[]) => {
    const total = data.length
    const compliant = data.filter(item => item.status === 'compliant').length
    const overdue = data.filter(item => item.status === 'overdue').length
    const upcoming = data.filter(item => item.status === 'upcoming').length
    const notApplied = data.filter(item => item.status === 'not_applied').length
    
    setSummary({
      total_assets: total,
      compliant_count: compliant,
      overdue_count: overdue,
      upcoming_count: upcoming,
      not_applied_count: notApplied,
      compliance_percentage: total > 0 ? Math.round((compliant / total) * 100) : 0
    })
  }

  const autoToggleHRBAssets = async () => {
    if (!building?.is_hrb) return

    try {
      setUpdatingAssets(true)
      
      // Get HRB-related assets
      const hrbAssets = allComplianceAssets.filter(asset => 
        asset.name.toLowerCase().includes('fire') ||
        asset.name.toLowerCase().includes('safety') ||
        asset.name.toLowerCase().includes('fraew') ||
        asset.name.toLowerCase().includes('safety case')
      )

      // Get current applied assets
      const currentAssetIds = complianceData.map(item => item.compliance_asset_id)
      
      // Add missing HRB assets
      const assetsToAdd = hrbAssets.filter(asset => !currentAssetIds.includes(asset.id))
      
      if (assetsToAdd.length > 0) {
        const { error } = await supabase
          .from('building_compliance_assets')
          .insert(
            assetsToAdd.map(asset => ({
              building_id: buildingId,
              compliance_asset_id: asset.id,
              status: 'not_applied',
              next_due_date: null
            }))
          )

        if (error) throw error
      }

      // Refresh data
      await fetchComplianceData()
      alert(`Auto-added ${assetsToAdd.length} HRB-related compliance assets`)
    } catch (err) {
      console.error('Error auto-toggling HRB assets:', err)
      alert('Failed to auto-add HRB assets. Please try again.')
    } finally {
      setUpdatingAssets(false)
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

  const getCategoryColor = (category: string | undefined) => {
    if (!category) return 'bg-gray-100 text-gray-800'
    
    const colors: Record<string, string> = {
      'Fire Safety': 'bg-red-100 text-red-800',
      'Electrical Safety': 'bg-yellow-100 text-yellow-800',
      'Gas Safety': 'bg-orange-100 text-orange-800',
      'Water Safety': 'bg-blue-100 text-blue-800',
      'Structural Safety': 'bg-purple-100 text-purple-800',
      'Accessibility': 'bg-green-100 text-green-800',
      'Environmental': 'bg-teal-100 text-teal-800'
    }
    
    return colors[category] || 'bg-gray-100 text-gray-800'
  }

  const filteredComplianceData = complianceData.filter(item => {
    const matchesCategory = filterCategory === 'all' || item.compliance_assets?.category === filterCategory
    const matchesStatus = filterStatus === 'all' || item.status === filterStatus
    const matchesSearch = searchQuery === '' || 
      item.compliance_assets?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.compliance_assets?.description?.toLowerCase().includes(searchQuery.toLowerCase())
    
    return matchesCategory && matchesStatus && matchesSearch
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-12 w-12 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading compliance data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 mb-4">Error loading compliance data</p>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchComplianceData}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.back()}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {building?.name || 'Building'} Compliance
                </h1>
                <p className="text-gray-600">
                  Manage compliance assets and track inspection schedules
                </p>
                {building?.is_hrb && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200 mt-2">
                    🏢 High-Risk Building (HRB)
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Refresh Button */}
              <button
                onClick={fetchComplianceData}
                className="p-3 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                title="Refresh compliance data"
              >
                <RefreshCw className="h-5 w-5" />
              </button>
              
              {/* Set Up Compliance Button - Links to Setup Wizard */}
              <button
                onClick={() => router.push(`/buildings/${buildingId}/compliance/setup`)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#004AAD] to-[#7209B7] text-white rounded-lg hover:from-[#003A8C] hover:to-[#5A078F] transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                <Plus className="h-5 w-5" />
                Set Up Compliance
              </button>
              
              {/* AI Assistant Button */}
              <AskBlocIQ
                buildingId={buildingId}
                buildingName={building?.name || 'Building'}
                context="compliance"
                placeholder="Ask about compliance requirements, inspection schedules, or regulatory updates..."
                className="inline-flex items-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              />
              
              {/* HRB Auto-Asset Button */}
              {building?.is_hrb && (
                <button
                  onClick={autoToggleHRBAssets}
                  disabled={updatingAssets}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                  title="Automatically add required HRB compliance assets"
                >
                  {updatingAssets ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Shield className="h-4 w-4" />
                  )}
                  Auto-Add HRB Assets
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* Compliance Summary Bar */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-500" />
            Building Compliance Status
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
          
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Overall Compliance</span>
              <span className="text-sm font-medium text-gray-700">{summary.compliance_percentage}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${summary.compliance_percentage}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-4 flex-1">
              {/* Category Filter */}
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-500" />
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Categories</option>
                  <option value="Fire Safety">Fire Safety</option>
                  <option value="Electrical Safety">Electrical Safety</option>
                  <option value="Gas Safety">Gas Safety</option>
                  <option value="Water Safety">Water Safety</option>
                  <option value="Structural Safety">Structural Safety</option>
                  <option value="Accessibility">Accessibility</option>
                  <option value="Environmental">Environmental</option>
                </select>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-gray-500" />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Statuses</option>
                  <option value="compliant">Compliant</option>
                  <option value="overdue">Overdue</option>
                  <option value="upcoming">Upcoming</option>
                  <option value="not_applied">Not Applied</option>
                </select>
              </div>
            </div>

            {/* Search */}
            <div className="flex items-center gap-2 w-full lg:w-auto">
              <Search className="h-4 w-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search compliance assets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent flex-1 lg:w-64"
              />
            </div>
          </div>
        </div>

        {/* Compliance Assets List */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-500" />
              Compliance Assets ({filteredComplianceData.length})
            </h2>
          </div>

          <div className="divide-y divide-gray-100">
            {filteredComplianceData.length === 0 ? (
              <div className="p-12 text-center">
                <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No compliance assets found</h3>
                <p className="text-gray-600 mb-6">
                  {searchQuery || filterCategory !== 'all' || filterStatus !== 'all' 
                    ? 'Try adjusting your filters or search terms.'
                    : 'This building has no compliance assets configured yet.'
                  }
                </p>
                <button
                  onClick={() => router.push(`/buildings/${buildingId}/compliance/setup`)}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#004AAD] to-[#7209B7] text-white rounded-lg hover:from-[#003A8C] hover:to-[#5A078F] transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  <Plus className="h-5 w-5" />
                  Set Up Compliance
                </button>
                
                <div className="text-sm text-gray-500">or</div>
                
                <button
                  onClick={() => setShowAssetModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Quick Add Assets
                </button>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredComplianceData.map(item => (
                  <div key={item.id} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          {getStatusIcon(item.status)}
                                                  <h3 className="text-lg font-medium text-gray-900">
                          {item.compliance_assets?.name || 'Unknown Asset'}
                        </h3>
                          {getStatusBadge(item.status)}
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getCategoryColor(item.compliance_assets?.category)}`}>
                            {item.compliance_assets?.category || 'Unknown'}
                          </span>
                          
                          {item.next_due_date && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              Due: {new Date(item.next_due_date).toLocaleDateString()}
                            </span>
                          )}
                          
                          {item.compliance_assets?.frequency_months && (
                            <span className="text-gray-500">
                              Every {item.compliance_assets.frequency_months} months
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
                        
                        {item.contractor && (
                          <div className="text-sm text-gray-600">
                            <strong>Contractor:</strong> {item.contractor}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 ml-4">
                        {item.compliance_documents && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                            <FileText className="h-3 w-3" />
                            Document
                          </span>
                        )}
                        
                        <button
                          onClick={() => setShowAssetModal(true)}
                          className="inline-flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 text-sm rounded-lg hover:bg-blue-100 transition-colors"
                        >
                          <Settings className="h-4 w-4" />
                          Edit
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Asset Management Modal */}
      {showAssetModal && building && (
        <AssetManagementModal
          building={building}
          isOpen={showAssetModal}
          onClose={() => setShowAssetModal(false)}
          onAssetsUpdated={fetchComplianceData}
        />
      )}
    </div>
  )
}
