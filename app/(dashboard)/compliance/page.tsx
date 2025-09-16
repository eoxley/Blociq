'use client'

// Trigger Vercel build - compliance page updated
import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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
  Settings
} from 'lucide-react'

import { BlocIQButton } from '@/components/ui/blociq-button'
import EnhancedEditAssetModal from '@/components/compliance/EnhancedEditAssetModal'
import { BlocIQCard, BlocIQCardContent, BlocIQCardHeader } from '@/components/ui/blociq-card'
import { BlocIQBadge } from '@/components/ui/blociq-badge'

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
  building_id: number
  asset_id: string
  status: 'compliant' | 'overdue' | 'upcoming' | 'not_applied' | 'pending'
  last_renewed_date: string | null
  next_due_date: string | null
  notes: string | null
  created_at: string
  updated_at: string
  buildings: {
    id: string
    name: string
    is_hrb: boolean
  } | null
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
  const [editingAsset, setEditingAsset] = useState<BuildingComplianceAsset | null>(null)
  const [debugMode, setDebugMode] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncResults, setSyncResults] = useState<any>(null)



  useEffect(() => {
    fetchComplianceData()
  }, [])

  const fetchDetailedComplianceData = async () => {
    try {
      console.log('🔍 Fetching detailed compliance data for all buildings...')
      
      // Get all building compliance assets with full details
      const response = await fetch('/api/portfolio/compliance/detailed')
      if (!response.ok) {
        console.warn('Detailed API not available, skipping asset details')
        return
      }

      const detailedData = await response.json()
      console.log('🔍 Detailed API response:', detailedData)
      
      if (detailedData.success && detailedData.data) {
        console.log('✅ Detailed compliance data fetched:', detailedData.data.length, 'assets')
        
        // Transform the data to ensure proper structure
        const transformedData = detailedData.data.map((asset: any) => ({
          ...asset,
          // Ensure building_id is a string for consistency
          building_id: asset.building_id.toString(),
          // Ensure buildings object exists
          buildings: asset.buildings || {
            id: asset.building_id.toString(),
            name: 'Unknown Building',
            is_hrb: false
          },
          // Ensure compliance_assets object exists
          compliance_assets: asset.compliance_assets || {
            id: asset.asset_id,
            name: 'Unknown Asset',
            category: 'Unknown',
            description: 'No description available',
            frequency_months: 12
          }
        }))
        
        setComplianceData(transformedData)
        console.log('✅ Set compliance data:', transformedData.length, 'assets')
      } else if (detailedData.debug && detailedData.assets) {
        console.log('🔧 Debug mode - processing assets without authentication')
        // Transform debug assets into proper format for display
        const debugAssets = detailedData.assets.map(asset => ({
          ...asset,
          compliance_assets: {
            name: 'Debug Asset',
            category: 'safety',
            description: 'Asset from debug mode'
          },
          buildings: {
            id: asset.building_id.toString(),
            name: detailedData.buildings.find(b => b.id === asset.building_id)?.name || 'Unknown Building'
          }
        }))
        setComplianceData(debugAssets)
        console.log('🔧 Set debug compliance data:', debugAssets.length, 'assets')
      } else {
        console.log('⚠️ No detailed data available, keeping existing compliance data')
        // Don't clear existing data - just skip the update
      }
    } catch (err) {
      console.warn('Could not fetch detailed compliance data:', err)
      // Don't throw error and don't clear existing data - continue with what we have
    }
  }

  const syncToCalendar = async () => {
    try {
      setSyncing(true)
      setSyncResults(null)
      
      const response = await fetch('/api/sync/compliance-to-calendar', { method: 'POST' })
      const data = await response.json()
      
      setSyncResults(data)
      
      if (data.success) {
        // Refresh compliance data to show updated sync status
        await fetchComplianceData()
      }
    } catch (error) {
      setSyncResults({ 
        success: false, 
        error: 'Failed to sync to calendar', 
        details: error 
      })
    } finally {
      setSyncing(false)
    }
  }

  const fetchComplianceData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Check authentication - Safe destructuring to prevent "Right side of assignment cannot be destructured" error
      const sessionResult = await supabase.auth.getSession()
      const sessionData = sessionResult?.data || {}
      const session = sessionData.session || null
      const authError = sessionResult?.error || null
      
      if (authError || !session) {
        throw new Error('Authentication required. Please log in.')
      }

      console.log('🔐 User authenticated:', session.user.id)

      // Use the new compliance overview API endpoint
      const response = await fetch('/api/compliance/overview')
      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ Compliance overview API error:', response.status, errorText)
        throw new Error(`Failed to fetch compliance data: ${response.status}`)
      }

      const apiData = await response.json()
      if (!apiData.success) {
        throw new Error(apiData.error || 'Failed to fetch compliance data')
      }

      const { overview, summary: apiSummary } = apiData.data
      console.log('✅ Compliance overview fetched:', overview?.length || 0, 'buildings')

      // Transform API data to match our component structure
      const buildingSummaries = overview.map((building: any) => ({
        id: building.building_id.toString(),
        name: building.building_name,
        is_hrb: false, // We'll get this from buildings table
        compliance_assets_count: building.total_assets,
        compliant_count: building.compliant_assets,
        overdue_count: building.overdue_assets,
        upcoming_count: building.due_soon_assets,
        not_applied_count: building.pending_assets
      }))

      setBuildings(buildingSummaries)

      // Set summary from API
      setSummary({
        total_buildings: apiSummary.totalBuildings,
        total_assets: apiSummary.totalAssets,
        compliant_count: apiSummary.compliantAssets,
        overdue_count: apiSummary.overdueAssets,
        upcoming_count: apiSummary.dueSoonAssets,
        not_applied_count: apiSummary.pendingAssets,
        compliance_percentage: apiSummary.totalAssets > 0 ? Math.round((apiSummary.compliantAssets / apiSummary.totalAssets) * 100) : 0
      })

      // Fetch detailed compliance data for all buildings
      await fetchDetailedComplianceData()

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

  const getCategoryColor = (category: string | undefined) => {
    if (!category) return 'bg-gray-100 text-gray-800 border-gray-200'
    
    switch (category.toLowerCase()) {
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
    if (filterBuilding !== 'all' && item.building_id.toString() !== filterBuilding) return false
    if (filterCategory !== 'all' && item.compliance_assets?.category !== filterCategory) return false
    if (filterStatus !== 'all' && item.status !== filterStatus) return false
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const buildingName = item.buildings?.name?.toLowerCase() || ''
      const assetTitle = item.compliance_assets?.name?.toLowerCase() || ''
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

  // Show empty state when no buildings or compliance data
  if (!loading && !error && (buildings.length === 0 || summary.total_assets === 0)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f8fafc] via-white to-[#f1f5f9]">
        {/* Hero Banner */}
        <section className="relative overflow-hidden bg-gradient-to-r from-[#4f46e5] to-[#a855f7] py-16 mx-6 rounded-3xl">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center">
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
                Compliance Overview
              </h1>
              <p className="text-xl text-white/90 max-w-3xl mx-auto leading-relaxed">
                Manage your property compliance requirements with confidence
              </p>
            </div>
          </div>

          {/* Decorative Elements */}
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
            <div className="absolute top-10 left-10 w-32 h-32 bg-white/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-10 right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
          </div>
        </section>

        {/* Main Content Section */}
        <div className="max-w-7xl mx-auto px-6 py-16">
          {/* Header */}
          <div className="bg-white border-b border-gray-200 px-6 py-6 shadow-sm rounded-2xl mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="relative">
                  <div className="w-12 h-12 bg-gradient-to-r from-[#004AAD] via-[#3B82F6] to-[#7209B7] rounded-2xl flex items-center justify-center shadow-lg">
                    <Shield className="h-6 w-6 text-white" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full animate-pulse"></div>
                  <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-cyan-400 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
                </div>

              </div>
              
              <div className="flex items-center gap-3">
                <button
                  onClick={syncToCalendar}
                  disabled={syncing}
                  className="p-3 text-blue-500 hover:text-blue-700 hover:bg-blue-100 rounded-xl transition-all duration-200 hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Sync to Outlook calendar"
                >
                  {syncing ? (
                    <RefreshCw className="h-5 w-5 animate-spin" />
                  ) : (
                    <Calendar className="h-5 w-5" />
                  )}
                </button>
                <button
                  onClick={fetchComplianceData}
                  className="p-3 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-all duration-200 hover:scale-110"
                  title="Refresh data"
                >
                  <RefreshCw className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Empty State */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-12 text-center">
            <Shield className="h-24 w-24 text-gray-300 mx-auto mb-6" />
            <h3 className="text-2xl font-semibold text-gray-900 mb-4">No Compliance Data Available</h3>
            <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
              {buildings.length === 0 
                ? "Navigate to the Buildings page to set up your properties"
                : "Navigate to individual building pages to set up compliance assets"
              }
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <div className="text-sm text-gray-600 text-center">
                {buildings.length === 0 
                  ? "Navigate to the Buildings page to set up your properties"
                  : "Navigate to individual building pages to set up compliance assets"
                }
              </div>
              
              <button
                onClick={fetchComplianceData}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <RefreshCw className="h-5 w-5" />
                Refresh Data
              </button>
            </div>
            
            <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg max-w-2xl mx-auto">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> Compliance setup is managed at the individual building level. Use the Buildings page to manage your properties.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* Hero Banner */}
      <section className="relative overflow-hidden bg-gradient-to-r from-[#4f46e5] to-[#a855f7] py-16 mx-6 rounded-3xl">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Compliance Dashboard
            </h1>
            <p className="text-xl text-white/90 max-w-3xl mx-auto leading-relaxed">
              Monitor compliance status across your property portfolio with intelligent tracking and automated alerts
            </p>
          </div>
        </div>

        {/* Decorative Elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-10 left-10 w-32 h-32 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
        </div>
      </section>


      {/* Main Content Section */}
      <div className="max-w-7xl mx-auto px-6 py-16">
        {/* Compliance Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-all duration-200">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Compliant</p>
                <p className="text-2xl font-bold text-gray-900">{summary.compliant_count}</p>
              </div>
            </div>
            <p className="text-xs text-gray-500">Assets up to standard</p>
          </div>
          
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-all duration-200">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Overdue</p>
                <p className="text-2xl font-bold text-gray-900">{summary.overdue_count}</p>
              </div>
            </div>
            <p className="text-xs text-gray-500">Require immediate attention</p>
          </div>
          
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-all duration-200">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Due Soon</p>
                <p className="text-2xl font-bold text-gray-900">{summary.upcoming_count}</p>
              </div>
            </div>
            <p className="text-xs text-gray-500">Within next 30 days</p>
          </div>
          
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-all duration-200">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-gray-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Not Applied</p>
                <p className="text-2xl font-bold text-gray-900">{summary.not_applied_count}</p>
              </div>
            </div>
            <p className="text-xs text-gray-500">Need setup</p>
          </div>
        </div>




        {/* Search and Filters */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-12">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <div className="lg:col-span-2">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search buildings, assets, or descriptions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4f46e5] focus:border-[#4f46e5] transition-all duration-200 bg-gray-50 focus:bg-white"
                />
              </div>
            </div>
            
            <select
              value={filterBuilding}
              onChange={(e) => setFilterBuilding(e.target.value)}
              className="px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4f46e5] focus:border-[#4f46e5] transition-all duration-200 bg-gray-50 focus:bg-white"
            >
              <option value="all">All Buildings</option>
              {buildings.map(building => (
                <option key={building.id} value={building.id}>
                  {building.name}
                </option>
              ))}
            </select>
            
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4f46e5] focus:border-[#4f46e5] transition-all duration-200 bg-gray-50 focus:bg-white"
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
        <div className="mb-12">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Building Compliance Overview</h2>
            <p className="text-gray-600">Monitor compliance status across your property portfolio</p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredBuildings.map(building => (
              <div key={building.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-all duration-200">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-gray-900">{building.name}</h3>
                      {building.is_hrb && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800">
                          🏢 HRB
                        </span>
                      )}
                    </div>
                    <p className="text-gray-600 text-sm">
                      {building.compliance_assets_count} compliance assets
                    </p>
                  </div>
                  
                  <button
                    onClick={() => router.push(`/buildings/${building.id}/compliance`)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#4f46e5] to-[#a855f7] hover:brightness-110 text-white text-sm rounded-xl font-semibold transition-all duration-200"
                  >
                    <Shield className="h-4 w-4" />
                    View Details
                  </button>
                </div>
                
                {/* Building Compliance Summary */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
                    <p className="text-xs text-green-600 font-semibold mb-1">Compliant</p>
                    <p className="text-lg font-bold text-green-700">{building.compliant_count}</p>
                  </div>
                  
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
                    <p className="text-xs text-red-600 font-semibold mb-1">Overdue</p>
                    <p className="text-lg font-bold text-red-700">{building.overdue_count}</p>
                  </div>
                  
                  <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-center">
                    <p className="text-xs text-yellow-600 font-semibold mb-1">Upcoming</p>
                    <p className="text-lg font-bold text-yellow-700">{building.upcoming_count}</p>
                  </div>
                  
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-center">
                    <p className="text-xs text-gray-600 font-semibold mb-1">Not Applied</p>
                    <p className="text-lg font-bold text-gray-700">{building.not_applied_count}</p>
                  </div>
                </div>
                
                {/* Quick Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => router.push(`/buildings/${building.id}/compliance`)}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#4f46e5] hover:bg-[#4338ca] text-white text-sm rounded-xl font-semibold transition-all duration-200"
                  >
                    <Shield className="h-4 w-4" />
                    View Compliance
                  </button>
                  
                  <button
                    onClick={() => router.push(`/buildings/${building.id}`)}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm rounded-xl font-semibold transition-all duration-200"
                  >
                    <Building2 className="h-4 w-4" />
                    Building
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Compliance Assets List */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">All Compliance Assets</h2>
          
          {filteredComplianceData.length > 0 ? (
            <div className="space-y-4">
              {filteredComplianceData.map(item => (
                <div key={item.id} className="p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {getStatusIcon(item.status)}
                        <h3 className="text-lg font-semibold text-gray-900">
                          {item.compliance_assets?.name || 'Unknown Asset'}
                        </h3>
                        {getStatusBadge(item.status)}
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
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
                      
                      <p className="text-gray-700 text-sm">
                        {item.compliance_assets?.description || 'No description available'}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => setEditingAsset(item)}
                        className="px-3 py-2 bg-[#4f46e5] text-white text-sm rounded-lg hover:bg-[#4338ca] transition-colors"
                        title="Edit compliance asset"
                      >
                        <Settings className="h-4 w-4" />
                      </button>
                      
                      <button
                        onClick={() => router.push(`/buildings/${item.building_id}/compliance`)}
                        className="px-3 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        <Shield className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Shield className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Compliance Assets Found</h3>
              <p className="text-gray-600 mb-6">
                {complianceData.length === 0 
                  ? "No compliance assets have been set up yet. Add some compliance assets to get started."
                  : "No assets match your current filters. Try adjusting your search criteria."
                }
              </p>
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => {
                    setFilterBuilding('all')
                    setFilterCategory('all')
                    setFilterStatus('all')
                    setSearchQuery('')
                  }}
                  className="px-4 py-2 bg-[#4f46e5] text-white rounded-lg hover:bg-[#4338ca] transition-colors"
                >
                  Clear Filters
                </button>
                {complianceData.length === 0 && (
                  <button
                    onClick={() => router.push('/buildings')}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Go to Buildings
                  </button>
                )}
              </div>
            </div>
          )}
        </div>



      </div>

      {/* Edit Asset Modal */}
      {editingAsset && (
        <EnhancedEditAssetModal
          buildingId={editingAsset.building_id}
          assetId={editingAsset.asset_id}
          asset={editingAsset}
          isOpen={!!editingAsset}
          onClose={() => setEditingAsset(null)}
        />
      )}
    </div>
  )
}
