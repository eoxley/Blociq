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
import { BlocIQButton } from '@/components/ui/blociq-button'

// Types
interface ComplianceAsset {
  id: string
  title: string
  category: string
  description: string
  frequency_months: number
  is_required: boolean
  is_hrb_related?: boolean
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
          compliance_assets (id, title, category, description, frequency_months, is_required),
          building_documents (id, file_url, uploaded_at)
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

  const toggleComplianceAsset = async (assetId: string, isOn: boolean) => {
    try {
      if (isOn) {
        // Insert new compliance asset
        const { error } = await supabase
          .from('building_compliance_assets')
          .insert({
            building_id: buildingId,
            compliance_asset_id: assetId,
            status: 'not_applied',
            next_due_date: null
          })

        if (error) throw error
      } else {
        // Delete compliance asset
        const { error } = await supabase
          .from('building_compliance_assets')
          .delete()
          .eq('building_id', buildingId)
          .eq('compliance_asset_id', assetId)

        if (error) throw error
      }

      // Refresh data
      await fetchComplianceData()
    } catch (err) {
      console.error('Error toggling compliance asset:', err)
      alert('Failed to update compliance asset. Please try again.')
    }
  }

  const autoToggleHRBAssets = async () => {
    if (!building?.is_hrb) return

    try {
      setUpdatingAssets(true)
      
      // Get HRB-related assets
      const hrbAssets = allComplianceAssets.filter(asset => 
        asset.is_hrb_related || 
        asset.title.toLowerCase().includes('fire') ||
        asset.title.toLowerCase().includes('safety') ||
        asset.title.toLowerCase().includes('fraew') ||
        asset.title.toLowerCase().includes('safety case')
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

  const filteredComplianceData = complianceData.filter(item => {
    if (filterCategory !== 'all' && item.compliance_assets?.category !== filterCategory) return false
    if (filterStatus !== 'all' && item.status !== filterStatus) return false
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const assetTitle = item.compliance_assets?.title?.toLowerCase() || ''
      const assetDescription = item.compliance_assets?.description?.toLowerCase() || ''
      
      if (!assetTitle.includes(query) && !assetDescription.includes(query)) {
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
              <p className="text-gray-600">Loading building compliance data...</p>
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
              <button
                onClick={() => router.push(`/buildings/${buildingId}`)}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-all duration-200"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-r from-[#004AAD] via-[#3B82F6] to-[#7209B7] rounded-2xl flex items-center justify-center shadow-lg">
                  <Shield className="h-6 w-6 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full animate-pulse"></div>
                <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-cyan-400 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
              </div>
              
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-[#004AAD] to-[#7209B7] bg-clip-text text-transparent">
                  {building?.name} Compliance
                </h1>
                <div className="flex items-center gap-4 mt-2">
                  <p className="text-sm text-gray-600 flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    {building?.address || 'No address'}
                  </p>
                  {building?.is_hrb && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
                      🏢 High-Risk Building (HRB)
                    </span>
                  )}
                </div>
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
              
              <button
                onClick={() => setShowAssetModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#004AAD] to-[#7209B7] text-white rounded-xl hover:from-[#003A8C] hover:to-[#5A078F] transition-all duration-200"
              >
                <Settings className="h-4 w-4" />
                Manage Assets
              </button>
              
              {building?.is_hrb && (
                <button
                  onClick={autoToggleHRBAssets}
                  disabled={updatingAssets}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all duration-200 disabled:opacity-50"
                >
                  {updatingAssets ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Shield className="h-4 w-4" />
                  )}
                  Auto-Add HRB Assets
                </button>
              )}
              
              <BlocIQButton
                buildingId={buildingId}
                buildingName={building?.name || 'Building'}
                context="compliance"
                placeholder="Ask about compliance requirements for this building..."
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
          
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-500" />
                <span className="text-sm font-medium text-gray-700">Building Compliance Rate</span>
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
                  placeholder="Search compliance assets..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            
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

        {/* Compliance Assets List */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Compliance Assets ({filteredComplianceData.length})</h2>
          </div>
          
          {filteredComplianceData.length === 0 ? (
            <div className="p-12 text-center">
              <Shield className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No compliance assets found</h3>
              <p className="text-gray-500 mb-4">
                {searchQuery || filterCategory !== 'all' || filterStatus !== 'all'
                  ? 'Try adjusting your filters or search terms'
                  : 'Get started by adding compliance assets to this building'
                }
              </p>
              {!searchQuery && filterCategory === 'all' && filterStatus === 'all' && (
                <button
                  onClick={() => setShowAssetModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#004AAD] to-[#7209B7] text-white rounded-lg hover:from-[#003A8C] hover:to-[#5A078F] transition-all duration-200"
                >
                  <Plus className="h-4 w-4" />
                  Add Compliance Assets
                </button>
              )}
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
                          {item.compliance_assets?.title || 'Unknown Asset'}
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
                      {item.building_documents && (
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

      {/* Asset Management Modal */}
      {showAssetModal && (
        <AssetToggleModal
          building={building}
          allAssets={allComplianceAssets}
          appliedAssets={complianceData}
          onToggle={toggleComplianceAsset}
          onClose={() => setShowAssetModal(false)}
        />
      )}
    </div>
  )
}

// Asset Toggle Modal Component
interface AssetToggleModalProps {
  building: Building | null
  allAssets: ComplianceAsset[]
  appliedAssets: BuildingComplianceAsset[]
  onToggle: (assetId: string, isOn: boolean) => Promise<void>
  onClose: () => void
}

function AssetToggleModal({ building, allAssets, appliedAssets, onToggle, onClose }: AssetToggleModalProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [updating, setUpdating] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const appliedAssetIds = new Set(appliedAssets.map(item => item.compliance_asset_id))
  
  const categories = [...new Set(allAssets.map(asset => asset.category))]
  const filteredAssets = allAssets.filter(asset => 
    asset.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    asset.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    asset.category.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(category)) {
      newExpanded.delete(category)
    } else {
      newExpanded.add(category)
    }
    setExpandedCategories(newExpanded)
  }

  const handleToggle = async (assetId: string, isOn: boolean) => {
    setUpdating(true)
    try {
      await onToggle(assetId, isOn)
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Manage Compliance Assets</h2>
            <p className="text-gray-600 mt-1">
              {building?.name} • {building?.is_hrb ? 'High-Risk Building' : 'Standard Building'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Search */}
        <div className="p-6 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search compliance assets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Asset List */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            {categories.map(category => {
              const categoryAssets = filteredAssets.filter(asset => asset.category === category)
              if (categoryAssets.length === 0) return null
              
              const isExpanded = expandedCategories.has(category)
              const appliedCount = categoryAssets.filter(asset => appliedAssetIds.has(asset.id)).length
              
              return (
                <div key={category} className="border border-gray-200 rounded-xl overflow-hidden">
                  <button
                    onClick={() => toggleCategory(category)}
                    className="w-full p-4 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-semibold text-gray-900">{category}</span>
                      <span className="text-sm text-gray-500">
                        {appliedCount} of {categoryAssets.length} applied
                      </span>
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="h-5 w-5 text-gray-500" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-gray-500" />
                    )}
                  </button>
                  
                  {isExpanded && (
                    <div className="p-4 space-y-3">
                      {categoryAssets.map(asset => {
                        const isApplied = appliedAssetIds.has(asset.id)
                        const isRequired = asset.is_required
                        
                        return (
                          <div key={asset.id} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-medium text-gray-900">{asset.title}</h4>
                                {isRequired && (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                    Required
                                  </span>
                                )}
                                {asset.is_hrb_related && (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                    HRB
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-600">{asset.description}</p>
                              {asset.frequency_months && (
                                <p className="text-xs text-gray-500 mt-1">
                                  Frequency: Every {asset.frequency_months} months
                                </p>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-3 ml-4">
                              <button
                                onClick={() => handleToggle(asset.id, !isApplied)}
                                disabled={updating}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                                  isApplied
                                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                              >
                                {isApplied ? (
                                  <>
                                    <ToggleRight className="h-4 w-4" />
                                    Applied
                                  </>
                                ) : (
                                  <>
                                    <ToggleLeft className="h-4 w-4" />
                                    Not Applied
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {appliedAssetIds.size} of {allAssets.length} assets applied
            </div>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
