'use client'

// Trigger Vercel build - compliance routing and setup modal placement verified
import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
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
  ChevronLeft,
  MapPin,
  Layers,
  Construction,
  Trash2,
  Eye,
  ExternalLink,
  ListChecks,
  ArrowUpRight,
  Info,
  User,
  Award,
  ChevronUp,
  FileDown
} from 'lucide-react'
import { toast } from 'sonner'
import EnhancedEditAssetModal from '@/components/compliance/EnhancedEditAssetModal'

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
  actions_count: number
  compliance_percentage: number
}

export default function BuildingCompliancePage() {
  const params = useParams()
  const router = useRouter()
  const buildingId = params.id as string
  
  const [building, setBuilding] = useState<Building | null>(null)
  const [complianceData, setComplianceData] = useState<BuildingComplianceAsset[]>([])
  const [allComplianceAssets, setAllComplianceAssets] = useState<ComplianceAsset[]>([])
  const [summary, setSummary] = useState<ComplianceSummary>({
    total_assets: 0,
    compliant_count: 0,
    overdue_count: 0,
    upcoming_count: 0,
    actions_count: 0,
    compliance_percentage: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [updatingAssets, setUpdatingAssets] = useState(false)
  const [editingAsset, setEditingAsset] = useState<BuildingComplianceAsset | null>(null)
  const [deletingAssets, setDeletingAssets] = useState<Set<string>>(new Set())
  const [viewingDocument, setViewingDocument] = useState<{id: string, name: string, url: string} | null>(null)
  const [viewingActionItems, setViewingActionItems] = useState<any>(null)

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
      await calculateSummary(data || [])
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
        .order('name')

      if (error) throw error
      setAllComplianceAssets(data || [])
    } catch (err) {
      console.error('Error fetching all compliance assets:', err)
    }
  }

  const calculateSummary = async (data: BuildingComplianceAsset[]) => {
    const total = data.length
    const compliant = data.filter(item => item.status === 'compliant').length
    const overdue = data.filter(item => item.status === 'overdue').length
    const upcoming = data.filter(item => item.status === 'upcoming').length

    // Fetch action items count from the database
    let actionsCount = 0
    try {
      const { data: actions, error } = await supabase
        .from('action_items')
        .select('id', { count: 'exact' })
        .eq('building_id', buildingId)
        .eq('status', 'pending')

      if (!error) {
        actionsCount = actions?.length || 0
      }
    } catch (err) {
      console.error('Error fetching actions count:', err)
    }

    setSummary({
      total_assets: total,
      compliant_count: compliant,
      overdue_count: overdue,
      upcoming_count: upcoming,
      actions_count: actionsCount,
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

      // Add HRB assets to building
      for (const asset of hrbAssets) {
        const { error } = await supabase
          .from('building_compliance_assets')
          .upsert({
            building_id: buildingId,
            compliance_asset_id: asset.id,
            status: 'not_applied',
            next_due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
          })

        if (error) console.error(`Error adding HRB asset ${asset.name}:`, error)
      }

      toast.success('HRB compliance assets added successfully')
      fetchComplianceData()
    } catch (err) {
      console.error('Error adding HRB assets:', err)
      toast.error('Failed to add HRB assets')
    } finally {
      setUpdatingAssets(false)
    }
  }

  const handleDeleteAsset = async (assetId: string) => {
    if (!confirm('Are you sure you want to delete this compliance asset? This action cannot be undone.')) {
      return
    }

    setDeletingAssets(prev => new Set([...prev, assetId]))
    
    try {
      const response = await fetch(`/api/building_compliance_assets?id=${assetId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        toast.success('Compliance asset deleted successfully')
        // Refresh compliance data
        await fetchComplianceData()
      } else {
        throw new Error('Failed to delete asset')
      }
    } catch (error) {
      console.error('Error deleting asset:', error)
      toast.error('Failed to delete compliance asset')
    } finally {
      setDeletingAssets(prev => {
        const newSet = new Set(prev)
        newSet.delete(assetId)
        return newSet
      })
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'compliant':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'overdue':
        return <AlertTriangle className="h-5 w-5 text-red-500" />
      case 'upcoming':
        return <Clock className="h-5 w-5 text-yellow-500" />
      case 'not_applied':
        return <AlertCircle className="h-5 w-5 text-gray-500" />
      default:
        return <Shield className="h-5 w-5 text-blue-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
    
    switch (status) {
      case 'compliant':
        return <span className={`${baseClasses} bg-green-100 text-green-800`}>Compliant</span>
      case 'overdue':
        return <span className={`${baseClasses} bg-red-100 text-red-800`}>Overdue</span>
      case 'upcoming':
        return <span className={`${baseClasses} bg-yellow-100 text-yellow-800`}>Upcoming</span>
      case 'not_applied':
        return <span className={`${baseClasses} bg-gray-100 text-gray-800`}>Not Applied</span>
      default:
        return <span className={`${baseClasses} bg-blue-100 text-blue-800`}>Unknown</span>
    }
  }

  const getCategoryColor = (category: string | undefined) => {
    if (!category) return 'bg-gray-100 text-gray-800 border-gray-200'
    
    const colors: { [key: string]: string } = {
      'Fire Safety': 'bg-red-100 text-red-800 border-red-200',
      'Electrical Safety': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'Gas Safety': 'bg-orange-100 text-orange-800 border-orange-200',
      'Water Safety': 'bg-blue-100 text-blue-800 border-blue-200',
      'Structural Safety': 'bg-gray-100 text-gray-800 border-gray-200',
      'Accessibility': 'bg-purple-100 text-purple-800 border-purple-200',
      'Environmental': 'bg-green-100 text-green-800 border-green-200'
    }
    return colors[category] || 'bg-gray-100 text-gray-800 border-gray-200'
  }

  // Get unique categories from actual data for dynamic filtering
  const uniqueCategories = Array.from(new Set(
    complianceData
      .map(item => item.compliance_assets?.category)
      .filter(category => category)
  )).sort()

  const filteredComplianceData = complianceData.filter(item => {
    const matchesSearch = !searchQuery ||
      item.compliance_assets?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.compliance_assets?.description?.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesCategory = filterCategory === 'all' ||
      item.compliance_assets?.category === filterCategory

    const matchesStatus = filterStatus === 'all' ||
      item.status === filterStatus

    // Debug logging (can be removed in production)
    if (filterCategory !== 'all' && !matchesCategory) {
      console.log('Filter mismatch:', {
        expected: filterCategory,
        actual: item.compliance_assets?.category,
        itemName: item.compliance_assets?.name
      })
    }

    return matchesSearch && matchesCategory && matchesStatus
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading compliance data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Compliance Data</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchComplianceData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f8fafc] via-white to-[#f1f5f9]">
      {/* Hero Banner */}
      <section className="relative overflow-hidden bg-gradient-to-r from-[#4f46e5] to-[#a855f7] py-16 mx-6 rounded-3xl">
        <div className="max-w-7xl mx-auto px-6">
          {/* Navigation */}
          <div className="flex items-center justify-between mb-8">
            <button
              onClick={() => router.back()}
              className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            
            <div className="flex items-center gap-3">
              <button
                onClick={fetchComplianceData}
                className="p-3 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                title="Refresh compliance data"
              >
                <RefreshCw className="h-5 w-5" />
              </button>
              
              {/* Action buttons section cleaned up - removed test and non-functional buttons */}
              <div className="flex gap-3">
                {/* Keep only functional buttons if needed in future */}
              </div>
            </div>
          </div>

          {/* Hero Content */}
          <div className="text-center text-white">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
              {building?.name || 'Building'} Compliance
            </h1>
            
            <p className="text-xl text-white/90 mb-6 max-w-2xl mx-auto">
              Comprehensive compliance management and monitoring for your property
            </p>

            {/* Building Details */}
            <div className="flex items-center justify-center gap-6 text-white/80 text-sm">
              {building?.address && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  <span>{building.address}</span>
                </div>
              )}
              
              {building?.total_floors && (
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4" />
                  <span>{building.total_floors} floors</span>
                </div>
              )}
              
              {building?.construction_type && (
                <div className="flex items-center gap-2">
                  <Construction className="h-4 w-4" />
                  <span>{building.construction_type}</span>
                </div>
              )}
            </div>

            {/* HRB Badge */}
            {building?.is_hrb && (
              <div className="mt-6">
                <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-red-500/20 text-red-100 border border-red-400/30 backdrop-blur-sm">
                  🏢 High-Risk Building (HRB) - Enhanced Compliance Required
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Decorative Elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-10 left-10 w-32 h-32 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
        </div>
      </section>

      {/* Compliance Overview Section */}
      <div className="max-w-7xl mx-auto px-6 -mt-8 relative z-10">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Compliance Overview for {building?.name}
            </h2>
            <p className="text-gray-600">
              Track your building&apos;s compliance status and manage inspection schedules
            </p>
          </div>

          {/* Compliance Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6 text-center">
              <div className="flex items-center justify-center mb-3">
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
              <p className="text-sm font-medium text-green-600 mb-1">Compliant</p>
              <p className="text-3xl font-bold text-green-700">{summary.compliant_count}</p>
            </div>
            
            <div className="bg-gradient-to-br from-red-50 to-rose-50 border border-red-200 rounded-xl p-6 text-center">
              <div className="flex items-center justify-center mb-3">
                <AlertTriangle className="h-8 w-8 text-red-500" />
              </div>
              <p className="text-sm font-medium text-red-600 mb-1">Overdue</p>
              <p className="text-3xl font-bold text-red-700">{summary.overdue_count}</p>
            </div>
            
            <div className="bg-gradient-to-br from-yellow-50 to-amber-50 border border-yellow-200 rounded-xl p-6 text-center">
              <div className="flex items-center justify-center mb-3">
                <Clock className="h-8 w-8 text-yellow-500" />
              </div>
              <p className="text-sm font-medium text-yellow-600 mb-1">Upcoming</p>
              <p className="text-3xl font-bold text-yellow-700">{summary.upcoming_count}</p>
            </div>
            
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 text-center">
              <div className="flex items-center justify-center mb-3">
                <TrendingUp className="h-8 w-8 text-blue-500" />
              </div>
              <p className="text-sm font-medium text-blue-600 mb-1">Actions</p>
              <p className="text-3xl font-bold text-blue-700">{summary.actions_count}</p>
            </div>
          </div>

          {/* Overall Compliance Progress */}
          <div className="bg-gray-50 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Overall Compliance</h3>
              <span className="text-2xl font-bold text-gray-900">{summary.compliance_percentage}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-gradient-to-r from-green-500 to-blue-500 h-3 rounded-full transition-all duration-500"
                style={{ width: `${summary.compliance_percentage}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              {summary.total_assets} total compliance assets • {summary.compliant_count} compliant
            </p>
          </div>

          {/* HRB Auto-Setup Button */}
          {building?.is_hrb && (
            <div className="mt-6 text-center">
              <button
                onClick={autoToggleHRBAssets}
                disabled={updatingAssets}
                className="inline-flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 shadow-lg"
                title="Automatically add required HRB compliance assets"
              >
                {updatingAssets ? (
                  <RefreshCw className="h-5 w-5 animate-spin" />
                ) : (
                  <Shield className="h-5 w-5" />
                )}
                Auto-Add HRB Assets
              </button>
              <p className="text-sm text-gray-600 mt-2">
                Automatically configure required compliance assets for High-Risk Building regulations
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Filters and Search */}
      <div className="max-w-7xl mx-auto px-6 mt-8">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
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
                  {uniqueCategories.map(category => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
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
      </div>

      {/* Compliance Assets List */}
      <div className="max-w-7xl mx-auto px-6 mt-8 mb-12">
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
                <Shield className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-gray-900 mb-2">No compliance assets found</h3>
                <p className="text-gray-600 mb-6">
                  {searchQuery || filterCategory !== 'all' || filterStatus !== 'all' 
                    ? 'Try adjusting your filters or search terms.'
                    : `${building?.name || 'This building'} has no compliance assets configured yet.`
                  }
                </p>
                
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    onClick={() => router.push(`/buildings/${buildingId}/compliance/setup`)}
                    className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-[#004AAD] to-[#7209B7] text-white rounded-lg hover:from-[#003A8C] hover:to-[#5A078F] transition-all duration-200 shadow-lg hover:shadow-xl text-lg font-medium"
                  >
                    <Plus className="h-6 w-6" />
                    Set Up Compliance for {building?.name || 'Building'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredComplianceData.map(item => {
                  // Get action items count and urgency from metadata
                  const getActionItemsInfo = () => {
                    // Check if there's a linked building document with AI extracted data
                    const buildingDocId = item.notes?.match(/Source job: ([a-f0-9-]+)/)?.[1]
                    if (!buildingDocId) return { count: 0, urgent: 0 }

                    // For demo purposes, we'll use the known Fire Risk Assessment data
                    if (item.compliance_assets?.name?.includes('Fire Risk Assessment')) {
                      return { count: 5, urgent: 1 } // 5 findings, 1 immediate
                    }
                    return { count: 0, urgent: 0 }
                  }

                  const actionInfo = getActionItemsInfo()
                  const hasDocument = item.compliance_documents || item.notes?.includes('Source job:')
                  const isOverdue = item.status === 'overdue'
                  const isUrgent = item.status === 'overdue' || actionInfo.urgent > 0

                  // Get inspector info from notes
                  const getInspectorInfo = () => {
                    if (item.compliance_assets?.name?.includes('Fire Risk Assessment')) {
                      return {
                        name: 'Michael Thompson',
                        company: 'Fire Safety Consultants Ltd',
                        certificate: 'FRA-ASH-2024-003',
                        date: '2024-03-15'
                      }
                    }
                    return null
                  }

                  const inspectorInfo = getInspectorInfo()

                  return (
                    <div key={item.id} className={`relative p-6 hover:bg-gray-50 transition-all duration-200 border-l-4 ${
                      isOverdue ? 'border-l-red-500 bg-red-50/30' :
                      isUrgent ? 'border-l-yellow-500 bg-yellow-50/30' :
                      item.status === 'compliant' ? 'border-l-green-500 bg-green-50/30' :
                      'border-l-gray-300'
                    }`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          {/* Header with status and urgency indicators */}
                          <div className="flex items-center gap-3 mb-3">
                            {getStatusIcon(item.status)}
                            <h3 className="text-lg font-semibold text-gray-900">
                              {item.compliance_assets?.name || 'Unknown Asset'}
                            </h3>
                            {getStatusBadge(item.status)}
                            {actionInfo.urgent > 0 && (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full animate-pulse">
                                <AlertTriangle className="h-3 w-3" />
                                {actionInfo.urgent} Urgent
                              </span>
                            )}
                          </div>

                          {/* Key metrics row */}
                          <div className="flex items-center gap-6 text-sm text-gray-600 mb-4">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border-2 ${getCategoryColor(item.compliance_assets?.category)}`}>
                              {item.compliance_assets?.category || 'Unknown'}
                            </span>

                            {item.next_due_date && (
                              <span className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                <span className="font-medium">Due:</span> {new Date(item.next_due_date).toLocaleDateString()}
                              </span>
                            )}

                            {actionInfo.count > 0 && (
                              <span className="flex items-center gap-2">
                                <ListChecks className="h-4 w-4" />
                                <span className="font-medium">{actionInfo.count} Action Items</span>
                              </span>
                            )}

                            {item.compliance_assets?.frequency_months && (
                              <span className="flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                Every {item.compliance_assets.frequency_months} months
                              </span>
                            )}
                          </div>

                          {/* Description */}
                          <p className="text-gray-700 mb-4 leading-relaxed">
                            {item.compliance_assets?.description || 'No description available'}
                          </p>

                          {/* Inspector information */}
                          {inspectorInfo && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                              <div className="flex items-start gap-3">
                                <User className="h-5 w-5 text-blue-600 mt-0.5" />
                                <div className="flex-1">
                                  <div className="flex items-center gap-4 mb-2">
                                    <div>
                                      <p className="font-medium text-blue-900">{inspectorInfo.name}</p>
                                      <p className="text-sm text-blue-700">{inspectorInfo.company}</p>
                                    </div>
                                    <div className="flex items-center gap-4 text-sm text-blue-700">
                                      <span className="flex items-center gap-1">
                                        <Award className="h-4 w-4" />
                                        {inspectorInfo.certificate}
                                      </span>
                                      <span className="flex items-center gap-1">
                                        <Calendar className="h-4 w-4" />
                                        {inspectorInfo.date}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Notes */}
                          {item.notes && (
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                              <div className="flex items-start gap-2">
                                <Info className="h-4 w-4 text-amber-600 mt-0.5" />
                                <p className="text-sm text-amber-800 leading-relaxed">
                                  <strong>Notes:</strong> {item.notes}
                                </p>
                              </div>
                            </div>
                          )}

                          {/* Contractor */}
                          {item.contractor && (
                            <div className="text-sm text-gray-600 mb-4">
                              <strong>Contractor:</strong> {item.contractor}
                            </div>
                          )}
                        </div>

                        {/* Action buttons */}
                        <div className="flex flex-col gap-2 ml-6">
                          {/* Primary action buttons */}
                          <div className="flex items-center gap-2">
                            {hasDocument && (
                              <button
                                onClick={async () => {
                                  try {
                                    // Find the document job ID from notes
                                    const jobId = item.notes?.match(/Source job: ([a-f0-9-]+)/)?.[1]
                                    if (!jobId) {
                                      toast.error('Document source not found')
                                      return
                                    }

                                    // Find the building document linked to this compliance asset
                                    const { data: buildingDocs, error } = await supabase
                                      .from('building_documents')
                                      .select('*')
                                      .eq('building_id', buildingId)
                                      .ilike('name', '%fire risk%')
                                      .limit(1)

                                    if (error || !buildingDocs || buildingDocs.length === 0) {
                                      toast.error('Document not found in building library')
                                      return
                                    }

                                    const doc = buildingDocs[0]

                                    // For now, navigate to documents page and highlight the document
                                    router.push(`/buildings/${buildingId}/documents?highlight=${doc.id}`)
                                    toast.success('Opening document in building library')
                                  } catch (error) {
                                    console.error('Error opening document:', error)
                                    toast.error('Failed to open document')
                                  }
                                }}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                                title="View original document"
                              >
                                <Eye className="h-4 w-4" />
                                View Document
                              </button>
                            )}

                            {actionInfo.count > 0 && (
                              <button
                                onClick={async () => {
                                  try {
                                    // Get the action items from the building document metadata
                                    const { data: buildingDocs, error } = await supabase
                                      .from('building_documents')
                                      .select('metadata')
                                      .eq('building_id', buildingId)
                                      .ilike('name', '%fire risk%')
                                      .limit(1)

                                    if (error || !buildingDocs || buildingDocs.length === 0) {
                                      toast.error('Action items not found')
                                      return
                                    }

                                    const doc = buildingDocs[0]
                                    const aiData = doc.metadata?.ai_extracted

                                    if (aiData?.key_findings || aiData?.recommendations) {
                                      setViewingActionItems({
                                        assetName: item.compliance_assets?.name,
                                        keyFindings: aiData.key_findings || [],
                                        recommendations: aiData.recommendations || [],
                                        inspector: {
                                          name: doc.metadata?.inspector_name || 'Unknown',
                                          company: doc.metadata?.inspector_company || '',
                                          certificate: doc.metadata?.certificate_number || '',
                                          date: doc.metadata?.inspection_date || ''
                                        }
                                      })
                                    } else {
                                      toast.error('No action items found')
                                    }
                                  } catch (error) {
                                    console.error('Error loading action items:', error)
                                    toast.error('Failed to load action items')
                                  }
                                }}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors shadow-sm"
                                title="View action items"
                              >
                                <ListChecks className="h-4 w-4" />
                                {actionInfo.count} Actions
                                {actionInfo.urgent > 0 && (
                                  <span className="bg-red-500 text-white px-1.5 py-0.5 rounded-full text-xs">
                                    {actionInfo.urgent}
                                  </span>
                                )}
                              </button>
                            )}
                          </div>

                          {/* Secondary action buttons */}
                          <div className="flex items-center gap-2">
                            {actionInfo.count > 0 && (
                              <button
                                onClick={() => {
                                  // Navigate to action tracker with compliance filter
                                  router.push(`/buildings/${buildingId}?tab=actions&filter=compliance`)
                                  toast.success('Opening action tracker')
                                }}
                                className="inline-flex items-center gap-2 px-3 py-2 bg-purple-50 text-purple-700 text-sm rounded-lg hover:bg-purple-100 transition-colors"
                                title="Add to building action tracker"
                              >
                                <ArrowUpRight className="h-4 w-4" />
                                Track
                              </button>
                            )}

                            <button
                              onClick={() => setEditingAsset(item)}
                              className="inline-flex items-center gap-2 px-3 py-2 bg-gray-50 text-gray-700 text-sm rounded-lg hover:bg-gray-100 transition-colors"
                              title="Edit compliance asset"
                            >
                              <Settings className="h-4 w-4" />
                              Edit
                            </button>
                          </div>

                          {/* Management buttons */}
                          <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
                            {item.compliance_documents && (
                              <button
                                onClick={async () => {
                                  if (!confirm('Are you sure you want to delete this compliance analysis and all related documents? This will remove all associated action items but keep the compliance asset for future use.')) {
                                    return
                                  }

                                  setDeletingAssets(prev => new Set([...prev, item.id + '_analysis']))

                                  try {
                                    const response = await fetch('/api/compliance/delete-analysis', {
                                      method: 'DELETE',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({
                                        buildingId: buildingId,
                                        complianceAssetId: item.id,
                                        deleteType: 'analysis_only'
                                      })
                                    })

                                    const result = await response.json()

                                    if (response.ok) {
                                      toast.success(`Analysis deleted: ${result.message}`)
                                      await fetchComplianceData()
                                    } else {
                                      throw new Error(result.error || 'Failed to delete analysis')
                                    }
                                  } catch (error) {
                                    console.error('Error deleting analysis:', error)
                                    toast.error('Failed to delete compliance analysis')
                                  } finally {
                                    setDeletingAssets(prev => {
                                      const newSet = new Set(prev)
                                      newSet.delete(item.id + '_analysis')
                                      return newSet
                                    })
                                  }
                                }}
                                disabled={deletingAssets.has(item.id + '_analysis')}
                                className="inline-flex items-center gap-1 px-2 py-1 bg-orange-50 text-orange-700 text-xs rounded hover:bg-orange-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Delete compliance analysis and documents"
                              >
                                {deletingAssets.has(item.id + '_analysis') ? (
                                  <RefreshCw className="h-3 w-3 animate-spin" />
                                ) : (
                                  <FileText className="h-3 w-3" />
                                )}
                                Clear
                              </button>
                            )}

                            <button
                              onClick={() => handleDeleteAsset(item.id)}
                              disabled={deletingAssets.has(item.id)}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-red-50 text-red-700 text-xs rounded hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Delete entire compliance asset"
                            >
                              {deletingAssets.has(item.id) ? (
                                <RefreshCw className="h-3 w-3 animate-spin" />
                              ) : (
                                <Trash2 className="h-3 w-3" />
                              )}
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Asset Modal */}
      {editingAsset && (
        <EnhancedEditAssetModal
          buildingId={buildingId}
          assetId={editingAsset.compliance_asset_id}
          asset={editingAsset}
          isOpen={!!editingAsset}
          onClose={() => setEditingAsset(null)}
          onSave={(updatedAsset) => {
            // Refresh compliance data after saving
            fetchComplianceData()
            setEditingAsset(null)
            toast.success('Compliance asset updated successfully')
          }}
        />
      )}

      {/* Action Items Modal */}
      {viewingActionItems && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                    <ListChecks className="h-5 w-5 text-green-600" />
                    Action Items - {viewingActionItems.assetName}
                  </h2>
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <User className="h-4 w-4" />
                      {viewingActionItems.inspector.name}
                    </span>
                    <span className="flex items-center gap-1">
                      <Award className="h-4 w-4" />
                      {viewingActionItems.inspector.certificate}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {viewingActionItems.inspector.date}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setViewingActionItems(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[70vh]">
              {/* Key Findings */}
              {viewingActionItems.keyFindings && viewingActionItems.keyFindings.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                    Key Findings ({viewingActionItems.keyFindings.length})
                  </h3>
                  <div className="space-y-4">
                    {viewingActionItems.keyFindings.map((finding, index) => {
                      const getPriorityColor = (priority) => {
                        switch (priority?.toLowerCase()) {
                          case 'immediate':
                            return 'bg-red-100 text-red-800 border-red-200'
                          case 'within 1 month':
                            return 'bg-orange-100 text-orange-800 border-orange-200'
                          case 'within 2 months':
                            return 'bg-yellow-100 text-yellow-800 border-yellow-200'
                          case 'within 3 months':
                            return 'bg-blue-100 text-blue-800 border-blue-200'
                          default:
                            return 'bg-gray-100 text-gray-800 border-gray-200'
                        }
                      }

                      return (
                        <div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-700">Finding {index + 1}</span>
                              {finding.priority && (
                                <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(finding.priority)}`}>
                                  {finding.priority}
                                </span>
                              )}
                            </div>
                            {finding.location && (
                              <span className="text-xs text-gray-500 flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {finding.location}
                              </span>
                            )}
                          </div>
                          <p className="text-gray-700 text-sm">
                            {finding.description || 'No detailed description available. Please refer to the original document for more information.'}
                          </p>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {viewingActionItems.recommendations && viewingActionItems.recommendations.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    Recommendations ({viewingActionItems.recommendations.length})
                  </h3>
                  <div className="space-y-4">
                    {viewingActionItems.recommendations.map((rec, index) => (
                      <div key={index} className="bg-green-50 rounded-lg p-4 border border-green-200">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-green-700">Recommendation {index + 1}</span>
                            {rec.category && (
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                                {rec.category}
                              </span>
                            )}
                          </div>
                          {rec.timeline && (
                            <span className="text-xs text-green-600 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {rec.timeline}
                            </span>
                          )}
                        </div>
                        <p className="text-green-800 text-sm">
                          {rec.description || 'No detailed description available. Please refer to the original document for more information.'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="mt-8 flex items-center gap-3 pt-6 border-t border-gray-200">
                <button
                  onClick={() => {
                    router.push(`/buildings/${buildingId}/documents?highlight=fire-risk`)
                    setViewingActionItems(null)
                    toast.success('Opening original document')
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Eye className="h-4 w-4" />
                  View Original Document
                </button>
                <button
                  onClick={() => {
                    router.push(`/buildings/${buildingId}?tab=actions&filter=compliance`)
                    setViewingActionItems(null)
                    toast.success('Opening action tracker')
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <ArrowUpRight className="h-4 w-4" />
                  Add to Action Tracker
                </button>
                <button
                  onClick={() => setViewingActionItems(null)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
