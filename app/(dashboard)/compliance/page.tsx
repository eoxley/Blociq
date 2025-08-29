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
import AssetManagementModal from '@/components/compliance/AssetManagementModal'
import AskBlocIQ from '@/components/AskBlocIQ'

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
  const [assetManagementOpen, setAssetManagementOpen] = useState(false)
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null)

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
        id: building.building_id,
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

      // For now, set empty compliance data since we're using the overview API
      setComplianceData([])

    } catch (err) {
      console.error('❌ Error fetching compliance data:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch compliance data')
    } finally {
      setLoading(false)
    }
  }

  const openAssetManagement = (building: Building) => {
    setSelectedBuilding(building)
    setAssetManagementOpen(true)
  }

  const handleAssetsUpdated = () => {
    fetchComplianceData()
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

  // Show empty state when no buildings or compliance data
  if (!loading && !error && (buildings.length === 0 || summary.total_assets === 0)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
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
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-[#004AAD] to-[#7209B7] bg-clip-text text-transparent">
                    Compliance Overview
                  </h1>
                  <p className="text-sm text-gray-600 flex items-center gap-2 mt-2">
                    <Building2 className="h-4 w-4" />
                    No compliance data available
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
                
                <AskBlocIQ
                  buildingId={undefined}
                  buildingName="Compliance System"
                  context="compliance"
                  placeholder="Ask about compliance requirements..."
                  className="bg-gradient-to-r from-[#004AAD] to-[#7209B7] hover:from-[#003A8C] hover:to-[#5A078F]"
                />
              </div>
            </div>
          </div>

          {/* Empty State */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-12 text-center">
            <Shield className="h-24 w-24 text-gray-300 mx-auto mb-6" />
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">No Compliance Data Available</h2>
            <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
              {buildings.length === 0 
                ? "You don't have any buildings set up yet, or there was an issue loading your building data. The system is working correctly but needs buildings to display compliance information."
                : "No compliance assets have been added to your buildings yet. This is normal for new accounts or when compliance tracking hasn't been set up."
              }
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {buildings.length === 0 ? (
                <button
                  onClick={() => router.push('/buildings')}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#004AAD] to-[#7209B7] text-white rounded-lg hover:from-[#003A8C] hover:to-[#5A078F] transition-all duration-200"
                >
                  <Building2 className="h-5 w-5" />
                  Set Up Buildings
                </button>
              ) : (
                <button
                  onClick={() => {
                    // Navigate to first building's compliance page for setup
                    if (buildings.length > 0) {
                      router.push(`/buildings/${buildings[0].id}/compliance`);
                    } else {
                      router.push('/buildings');
                    }
                  }}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#004AAD] to-[#7209B7] text-white rounded-lg hover:from-[#003A8C] hover:to-[#5A078F] transition-all duration-200"
                >
                  <Shield className="h-5 w-5" />
                  Setup Compliance
                </button>
              )}
              
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
                <strong>Note:</strong> The compliance system is working correctly. If you're seeing this message, it means either no buildings are set up yet, or no compliance assets have been added to your buildings.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f8fafc] via-white to-[#f1f5f9]">
      {/* Hero Banner with Master Brand Kit */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#14b8a6] via-[#3b82f6] to-[#8b5cf6] py-24 mx-6 mt-6 rounded-3xl shadow-2xl">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 right-20 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 left-20 w-80 h-80 bg-[#14b8a6]/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-[#8b5cf6]/5 rounded-full blur-2xl animate-pulse" style={{animationDelay: '2s'}}></div>
          
          {/* Floating Icons */}
          <div className="absolute top-32 left-32 w-8 h-8 text-white/20 animate-bounce" style={{animationDelay: '0.5s'}}>
            <Shield className="w-full h-full" />
          </div>
          <div className="absolute top-40 right-40 w-6 h-6 text-white/15 animate-bounce" style={{animationDelay: '1.5s'}}>
            <CheckCircle className="w-full h-full" />
          </div>
          <div className="absolute bottom-32 left-1/4 w-7 h-7 text-white/10 animate-bounce" style={{animationDelay: '2.5s'}}>
            <AlertTriangle className="w-full h-full" />
          </div>
        </div>
        
        <div className="max-w-7xl mx-auto px-8 relative z-10">
          <div className="text-center">
            {/* Hero Icon with Enhanced Animation */}
            <div className="relative w-24 h-24 mx-auto mb-8">
              <div className="absolute inset-0 bg-gradient-to-r from-white/30 to-white/20 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/40 animate-pulse"></div>
              <div className="relative w-full h-full bg-gradient-to-br from-white/25 to-white/15 backdrop-blur-sm rounded-3xl flex items-center justify-center shadow-xl border border-white/30">
                <Shield className="h-12 w-12 text-white drop-shadow-lg" />
              </div>
              {/* Rotating ring */}
              <div className="absolute -inset-2 border-2 border-white/20 rounded-3xl animate-spin" style={{animationDuration: '8s'}}></div>
            </div>
            
            {/* Hero Title with Enhanced Typography */}
            <h1 className="text-5xl md:text-7xl font-black text-white mb-6 tracking-tight drop-shadow-2xl">
              <span className="bg-gradient-to-r from-white via-white/95 to-white/90 bg-clip-text text-transparent">
                Compliance
              </span>
              <br />
              <span className="bg-gradient-to-r from-white/90 via-white/95 to-white bg-clip-text text-transparent">
                Dashboard
              </span>
            </h1>
            
            {/* Hero Subtitle */}
            <p className="text-xl md:text-2xl text-white/95 max-w-4xl mx-auto leading-relaxed mb-10 drop-shadow-lg font-medium">
              Intelligent compliance monitoring, automated tracking, and comprehensive risk management for your entire property portfolio.
            </p>
            
            {/* Enhanced Hero Stats */}
            {summary.total_buildings > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-5xl mx-auto mb-10">
                <div className="group bg-white/15 backdrop-blur-lg rounded-2xl p-6 border border-white/30 hover:bg-white/20 transition-all duration-300 hover:scale-105 shadow-xl">
                  <div className="flex items-center justify-between mb-2">
                    <Building2 className="h-8 w-8 text-white/80" />
                    <div className="w-3 h-3 bg-emerald-400 rounded-full animate-pulse"></div>
                  </div>
                  <p className="text-white/90 text-sm font-semibold mb-1">Properties</p>
                  <p className="text-3xl font-black text-white">{summary.total_buildings}</p>
                </div>
                <div className="group bg-white/15 backdrop-blur-lg rounded-2xl p-6 border border-white/30 hover:bg-white/20 transition-all duration-300 hover:scale-105 shadow-xl">
                  <div className="flex items-center justify-between mb-2">
                    <Shield className="h-8 w-8 text-white/80" />
                    <div className="w-3 h-3 bg-blue-400 rounded-full animate-pulse" style={{animationDelay: '0.5s'}}></div>
                  </div>
                  <p className="text-white/90 text-sm font-semibold mb-1">Assets</p>
                  <p className="text-3xl font-black text-white">{summary.total_assets}</p>
                </div>
                <div className="group bg-white/15 backdrop-blur-lg rounded-2xl p-6 border border-white/30 hover:bg-white/20 transition-all duration-300 hover:scale-105 shadow-xl">
                  <div className="flex items-center justify-between mb-2">
                    <CheckCircle className="h-8 w-8 text-white/80" />
                    <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse" style={{animationDelay: '1s'}}></div>
                  </div>
                  <p className="text-white/90 text-sm font-semibold mb-1">Compliant</p>
                  <p className="text-3xl font-black text-white">{summary.compliant_count}</p>
                </div>
                <div className="group bg-white/15 backdrop-blur-lg rounded-2xl p-6 border border-white/30 hover:bg-white/20 transition-all duration-300 hover:scale-105 shadow-xl">
                  <div className="flex items-center justify-between mb-2">
                    <TrendingUp className="h-8 w-8 text-white/80" />
                    <div className="w-3 h-3 bg-purple-400 rounded-full animate-pulse" style={{animationDelay: '1.5s'}}></div>
                  </div>
                  <p className="text-white/90 text-sm font-semibold mb-1">Success Rate</p>
                  <p className="text-3xl font-black text-white">{summary.compliance_percentage}%</p>
                </div>
              </div>
            )}
            
            {/* Enhanced Hero Actions */}
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <button
                onClick={() => {
                  if (buildings.length > 0) {
                    router.push(`/buildings/${buildings[0].id}/compliance`);
                  } else {
                    router.push('/buildings');
                  }
                }}
                className="group bg-white/20 backdrop-blur-lg hover:bg-white/30 text-white px-10 py-5 rounded-2xl font-bold shadow-2xl hover:shadow-3xl transition-all duration-300 border border-white/40 hover:border-white/60 transform hover:scale-105 hover:-translate-y-1"
              >
                <div className="flex items-center justify-center gap-3">
                  <Shield className="h-6 w-6 group-hover:animate-pulse" />
                  <span className="text-lg">Setup Compliance</span>
                </div>
              </button>
              <button 
                onClick={fetchComplianceData}
                className="group bg-white/20 backdrop-blur-lg hover:bg-white/30 text-white px-10 py-5 rounded-2xl font-bold shadow-2xl hover:shadow-3xl transition-all duration-300 border border-white/40 hover:border-white/60 transform hover:scale-105 hover:-translate-y-1"
              >
                <div className="flex items-center justify-center gap-3">
                  <RefreshCw className="h-6 w-6 group-hover:animate-spin" />
                  <span className="text-lg">Refresh Data</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Section */}
      <div className="max-w-7xl mx-auto px-6 py-16">
        {/* AI Compliance Assistant Section - Complete Redesign */}
        <div className="relative bg-white rounded-3xl shadow-2xl border-0 overflow-hidden mb-12">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-5">
            <svg className="w-full h-full" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                  <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#14b8a6" strokeWidth="0.5"/>
                </pattern>
              </defs>
              <rect width="100" height="100" fill="url(#grid)" />
            </svg>
          </div>
          
          {/* AI Section Header */}
          <div className="relative bg-gradient-to-br from-[#14b8a6]/10 via-[#3b82f6]/5 to-[#8b5cf6]/10 p-10">
            <div className="text-center mb-10">
              {/* Animated AI Icon */}
              <div className="relative w-20 h-20 mx-auto mb-8">
                <div className="absolute inset-0 bg-gradient-to-br from-[#14b8a6] to-[#8b5cf6] rounded-3xl shadow-2xl animate-pulse"></div>
                <div className="relative w-full h-full bg-gradient-to-br from-[#14b8a6] via-[#3b82f6] to-[#8b5cf6] rounded-3xl flex items-center justify-center shadow-xl">
                  <Sparkles className="h-10 w-10 text-white animate-pulse" />
                </div>
                {/* Orbiting elements */}
                <div className="absolute -top-2 -right-2 w-4 h-4 bg-gradient-to-r from-[#14b8a6] to-[#3b82f6] rounded-full animate-bounce shadow-lg" style={{animationDelay: '0s'}}></div>
                <div className="absolute -bottom-2 -left-2 w-3 h-3 bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6] rounded-full animate-bounce shadow-lg" style={{animationDelay: '1s'}}></div>
                <div className="absolute top-1/2 -right-3 w-2 h-2 bg-gradient-to-r from-[#8b5cf6] to-[#14b8a6] rounded-full animate-bounce shadow-lg" style={{animationDelay: '0.5s'}}></div>
              </div>
              
              <h2 className="text-4xl font-black bg-gradient-to-r from-[#14b8a6] via-[#3b82f6] to-[#8b5cf6] bg-clip-text text-transparent mb-4">
                BlocIQ AI Assistant
              </h2>
              <p className="text-xl text-gray-700 max-w-3xl mx-auto font-medium leading-relaxed">
                Your intelligent compliance partner, powered by advanced AI to provide instant insights, predictive analysis, and automated guidance for your property portfolio.
              </p>
            </div>
            
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-white/80 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-[#14b8a6] to-[#3b82f6] rounded-xl flex items-center justify-center shadow-lg">
                    <Shield className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">24/7</p>
                    <p className="text-sm text-gray-600 font-medium">AI Monitoring</p>
                  </div>
                </div>
              </div>
              <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-white/80 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6] rounded-xl flex items-center justify-center shadow-lg">
                    <TrendingUp className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">99%</p>
                    <p className="text-sm text-gray-600 font-medium">Accuracy Rate</p>
                  </div>
                </div>
              </div>
              <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-white/80 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-[#8b5cf6] to-[#14b8a6] rounded-xl flex items-center justify-center shadow-lg">
                    <AlertTriangle className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">Instant</p>
                    <p className="text-sm text-gray-600 font-medium">Risk Alerts</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* AI Content */}
          <div className="relative p-10">
            <div className="grid grid-cols-1 xl:grid-cols-5 gap-10">
              {/* AI Features - Enhanced */}
              <div className="xl:col-span-2 space-y-8">
                <div className="text-center xl:text-left">
                  <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-[#14b8a6] to-[#3b82f6] rounded-lg flex items-center justify-center">
                      <Shield className="h-4 w-4 text-white" />
                    </div>
                    AI-Powered Capabilities
                  </h3>
                </div>
                
                <div className="space-y-6">
                  <div className="group relative bg-gradient-to-br from-[#14b8a6]/5 via-white to-[#3b82f6]/5 p-6 rounded-3xl border-2 border-[#14b8a6]/20 hover:border-[#14b8a6]/40 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl">
                    <div className="flex items-start gap-5">
                      <div className="w-14 h-14 bg-gradient-to-br from-[#14b8a6] to-[#3b82f6] rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg group-hover:shadow-xl transition-all duration-300">
                        <Shield className="h-7 w-7 text-white" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-lg font-bold text-gray-900 mb-2">Real-Time Monitoring</h4>
                        <p className="text-gray-600 leading-relaxed">Continuous AI surveillance of compliance status, automatically tracking deadlines and regulatory changes across your portfolio.</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="group relative bg-gradient-to-br from-[#3b82f6]/5 via-white to-[#8b5cf6]/5 p-6 rounded-3xl border-2 border-[#3b82f6]/20 hover:border-[#3b82f6]/40 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl">
                    <div className="flex items-start gap-5">
                      <div className="w-14 h-14 bg-gradient-to-br from-[#3b82f6] to-[#8b5cf6] rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg group-hover:shadow-xl transition-all duration-300">
                        <AlertTriangle className="h-7 w-7 text-white" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-lg font-bold text-gray-900 mb-2">Predictive Risk Analysis</h4>
                        <p className="text-gray-600 leading-relaxed">Advanced machine learning algorithms identify potential compliance risks before they become issues, keeping you ahead of problems.</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="group relative bg-gradient-to-br from-[#8b5cf6]/5 via-white to-[#14b8a6]/5 p-6 rounded-3xl border-2 border-[#8b5cf6]/20 hover:border-[#8b5cf6]/40 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl">
                    <div className="flex items-start gap-5">
                      <div className="w-14 h-14 bg-gradient-to-br from-[#8b5cf6] to-[#14b8a6] rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg group-hover:shadow-xl transition-all duration-300">
                        <TrendingUp className="h-7 w-7 text-white" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-lg font-bold text-gray-900 mb-2">Intelligent Analytics</h4>
                        <p className="text-gray-600 leading-relaxed">Data-driven insights with comprehensive reporting, trend analysis, and performance optimization recommendations.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* AI Chat Interface - Redesigned */}
              <div className="xl:col-span-3 space-y-8">
                <div className="text-center xl:text-left">
                  <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6] rounded-lg flex items-center justify-center">
                      <Sparkles className="h-4 w-4 text-white" />
                    </div>
                    Interactive AI Chat
                  </h3>
                </div>
                
                {/* Enhanced Chat Container */}
                <div className="relative">
                  {/* Chat Background */}
                  <div className="absolute inset-0 bg-gradient-to-br from-[#14b8a6]/10 via-[#3b82f6]/5 to-[#8b5cf6]/10 rounded-3xl"></div>
                  
                  <div className="relative bg-white/80 backdrop-blur-sm rounded-3xl p-8 border-2 border-white/60 shadow-2xl">
                    {/* Chat Header */}
                    <div className="flex items-center gap-4 mb-6 pb-4 border-b border-gray-200">
                      <div className="w-12 h-12 bg-gradient-to-br from-[#14b8a6] to-[#8b5cf6] rounded-2xl flex items-center justify-center shadow-lg">
                        <Sparkles className="h-6 w-6 text-white animate-pulse" />
                      </div>
                      <div>
                        <h4 className="text-lg font-bold text-gray-900">BlocIQ AI Assistant</h4>
                        <p className="text-sm text-gray-600">● Online • Compliance Expert Mode</p>
                      </div>
                    </div>
                    
                    {/* AI Chat Interface */}
                    <div className="space-y-6">
                      <AskBlocIQ
                        buildingId={undefined}
                        buildingName="Compliance System"
                        context="compliance"
                        placeholder="Ask me about regulations, deadlines, risk assessments, or any compliance questions..."
                        className="bg-gradient-to-br from-[#14b8a6] via-[#3b82f6] to-[#8b5cf6] hover:brightness-110 text-white shadow-xl hover:shadow-2xl border-2 border-white/20 backdrop-blur-sm"
                      />
                      
                      {/* Suggested Prompts */}
                      <div className="space-y-4">
                        <p className="text-sm font-semibold text-gray-700 text-center">✨ Try asking about:</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <button className="text-left p-4 bg-gradient-to-r from-[#14b8a6]/10 to-[#3b82f6]/10 border-2 border-[#14b8a6]/20 hover:border-[#14b8a6]/40 text-gray-700 rounded-2xl hover:bg-[#14b8a6]/20 transition-all duration-300 hover:scale-[1.02] shadow-sm hover:shadow-md">
                            <div className="flex items-center gap-2 mb-1">
                              <Shield className="h-4 w-4 text-[#14b8a6]" />
                              <span className="font-semibold text-sm">Fire Safety Requirements</span>
                            </div>
                            <p className="text-xs text-gray-600">"What fire safety compliance is required for my HRB?"</p>
                          </button>
                          <button className="text-left p-4 bg-gradient-to-r from-[#3b82f6]/10 to-[#8b5cf6]/10 border-2 border-[#3b82f6]/20 hover:border-[#3b82f6]/40 text-gray-700 rounded-2xl hover:bg-[#3b82f6]/20 transition-all duration-300 hover:scale-[1.02] shadow-sm hover:shadow-md">
                            <div className="flex items-center gap-2 mb-1">
                              <AlertTriangle className="h-4 w-4 text-[#3b82f6]" />
                              <span className="font-semibold text-sm">Risk Assessment</span>
                            </div>
                            <p className="text-xs text-gray-600">"Analyze compliance risks for my portfolio"</p>
                          </button>
                          <button className="text-left p-4 bg-gradient-to-r from-[#8b5cf6]/10 to-[#14b8a6]/10 border-2 border-[#8b5cf6]/20 hover:border-[#8b5cf6]/40 text-gray-700 rounded-2xl hover:bg-[#8b5cf6]/20 transition-all duration-300 hover:scale-[1.02] shadow-sm hover:shadow-md">
                            <div className="flex items-center gap-2 mb-1">
                              <Calendar className="h-4 w-4 text-[#8b5cf6]" />
                              <span className="font-semibold text-sm">Upcoming Inspections</span>
                            </div>
                            <p className="text-xs text-gray-600">"Show me all upcoming compliance deadlines"</p>
                          </button>
                          <button className="text-left p-4 bg-gradient-to-r from-[#14b8a6]/10 to-[#8b5cf6]/10 border-2 border-[#14b8a6]/20 hover:border-[#8b5cf6]/40 text-gray-700 rounded-2xl hover:bg-gradient-to-r hover:from-[#14b8a6]/20 hover:to-[#8b5cf6]/20 transition-all duration-300 hover:scale-[1.02] shadow-sm hover:shadow-md">
                            <div className="flex items-center gap-2 mb-1">
                              <TrendingUp className="h-4 w-4 text-[#8b5cf6]" />
                              <span className="font-semibold text-sm">Performance Report</span>
                            </div>
                            <p className="text-xs text-gray-600">"Generate a compliance performance summary"</p>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Compliance Summary with Master Brand Kit */}
        <div className="relative bg-white rounded-3xl shadow-2xl border-0 overflow-hidden mb-12">
          {/* Decorative Background */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-[#14b8a6]/5 to-[#8b5cf6]/5 rounded-full blur-3xl transform translate-x-32 -translate-y-32"></div>
          
          <div className="relative p-10">
            <div className="text-center mb-10">
              <div className="flex items-center justify-center gap-4 mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-[#14b8a6] to-[#8b5cf6] rounded-2xl flex items-center justify-center shadow-xl">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
                <h2 className="text-3xl font-black bg-gradient-to-r from-[#14b8a6] via-[#3b82f6] to-[#8b5cf6] bg-clip-text text-transparent">
                  Portfolio Compliance Overview
                </h2>
              </div>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto font-medium">
                Real-time monitoring and comprehensive status tracking across your entire property portfolio
              </p>
            </div>
            
            {/* Enhanced Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
              <div className="group relative bg-gradient-to-br from-emerald-50 via-white to-green-50 border-2 border-emerald-200/60 rounded-3xl p-8 hover:shadow-2xl transition-all duration-500 hover:scale-105 hover:-translate-y-2">
                <div className="absolute top-4 right-4 w-3 h-3 bg-emerald-400 rounded-full animate-pulse shadow-lg"></div>
                <div className="flex items-start justify-between mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-green-500 rounded-2xl flex items-center justify-center shadow-xl group-hover:shadow-2xl transition-all duration-300">
                    <CheckCircle className="h-8 w-8 text-white" />
                  </div>
                </div>
                <div>
                  <p className="text-sm font-bold text-emerald-600 mb-2 uppercase tracking-wider">Fully Compliant</p>
                  <p className="text-4xl font-black text-emerald-700 mb-2">{summary.compliant_count}</p>
                  <p className="text-xs text-emerald-600/80 font-medium">Assets up to standard</p>
                </div>
                <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-green-500 rounded-b-3xl"></div>
              </div>
              
              <div className="group relative bg-gradient-to-br from-red-50 via-white to-rose-50 border-2 border-red-200/60 rounded-3xl p-8 hover:shadow-2xl transition-all duration-500 hover:scale-105 hover:-translate-y-2">
                <div className="absolute top-4 right-4 w-3 h-3 bg-red-400 rounded-full animate-pulse shadow-lg"></div>
                <div className="flex items-start justify-between mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-rose-500 rounded-2xl flex items-center justify-center shadow-xl group-hover:shadow-2xl transition-all duration-300">
                    <AlertTriangle className="h-8 w-8 text-white" />
                  </div>
                </div>
                <div>
                  <p className="text-sm font-bold text-red-600 mb-2 uppercase tracking-wider">Overdue</p>
                  <p className="text-4xl font-black text-red-700 mb-2">{summary.overdue_count}</p>
                  <p className="text-xs text-red-600/80 font-medium">Require immediate attention</p>
                </div>
                <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-rose-500 rounded-b-3xl"></div>
              </div>
              
              <div className="group relative bg-gradient-to-br from-amber-50 via-white to-yellow-50 border-2 border-amber-200/60 rounded-3xl p-8 hover:shadow-2xl transition-all duration-500 hover:scale-105 hover:-translate-y-2">
                <div className="absolute top-4 right-4 w-3 h-3 bg-amber-400 rounded-full animate-pulse shadow-lg"></div>
                <div className="flex items-start justify-between mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-yellow-500 rounded-2xl flex items-center justify-center shadow-xl group-hover:shadow-2xl transition-all duration-300">
                    <Clock className="h-8 w-8 text-white" />
                  </div>
                </div>
                <div>
                  <p className="text-sm font-bold text-amber-600 mb-2 uppercase tracking-wider">Due Soon</p>
                  <p className="text-4xl font-black text-amber-700 mb-2">{summary.upcoming_count}</p>
                  <p className="text-xs text-amber-600/80 font-medium">Within next 30 days</p>
                </div>
                <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 to-yellow-500 rounded-b-3xl"></div>
              </div>
              
              <div className="group relative bg-gradient-to-br from-slate-50 via-white to-gray-50 border-2 border-slate-200/60 rounded-3xl p-8 hover:shadow-2xl transition-all duration-500 hover:scale-105 hover:-translate-y-2">
                <div className="absolute top-4 right-4 w-3 h-3 bg-slate-400 rounded-full animate-pulse shadow-lg"></div>
                <div className="flex items-start justify-between mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-slate-500 to-gray-500 rounded-2xl flex items-center justify-center shadow-xl group-hover:shadow-2xl transition-all duration-300">
                    <AlertCircle className="h-8 w-8 text-white" />
                  </div>
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-600 mb-2 uppercase tracking-wider">Pending Setup</p>
                  <p className="text-4xl font-black text-slate-700 mb-2">{summary.not_applied_count}</p>
                  <p className="text-xs text-slate-600/80 font-medium">Awaiting configuration</p>
                </div>
                <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-slate-500 to-gray-500 rounded-b-3xl"></div>
              </div>
            </div>
            
            {/* Enhanced Compliance Rate Section */}
            <div className="relative bg-gradient-to-br from-[#14b8a6]/5 via-white to-[#8b5cf6]/5 rounded-3xl p-8 border-2 border-[#14b8a6]/20">
              <div className="text-center mb-8">
                <div className="flex items-center justify-center gap-4 mb-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-[#14b8a6] via-[#3b82f6] to-[#8b5cf6] rounded-2xl flex items-center justify-center shadow-xl">
                    <Shield className="h-7 w-7 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900">Portfolio Compliance Rate</h3>
                </div>
              </div>
              
              <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
                <div className="flex-1 max-w-2xl">
                  {/* Enhanced Progress Bar */}
                  <div className="relative">
                    <div className="w-full bg-gray-200 rounded-2xl h-8 shadow-inner">
                      <div 
                        className="bg-gradient-to-r from-[#14b8a6] via-[#3b82f6] to-[#8b5cf6] h-8 rounded-2xl shadow-2xl transition-all duration-1000 ease-out flex items-center justify-end pr-4"
                        style={{ width: `${summary.compliance_percentage}%` }}
                      >
                        <div className="w-6 h-6 bg-white rounded-full shadow-lg flex items-center justify-center">
                          <div className="w-2 h-2 bg-gradient-to-r from-[#14b8a6] to-[#8b5cf6] rounded-full animate-pulse"></div>
                        </div>
                      </div>
                    </div>
                    {/* Percentage Labels */}
                    <div className="flex justify-between text-xs text-gray-500 mt-2">
                      <span>0%</span>
                      <span>25%</span>
                      <span>50%</span>
                      <span>75%</span>
                      <span>100%</span>
                    </div>
                  </div>
                </div>
                
                <div className="text-center lg:text-right">
                  <p className="text-5xl font-black bg-gradient-to-r from-[#14b8a6] via-[#3b82f6] to-[#8b5cf6] bg-clip-text text-transparent mb-2">
                    {summary.compliance_percentage}%
                  </p>
                  <p className="text-gray-600 font-semibold">Overall Success Rate</p>
                  <div className="flex items-center justify-center lg:justify-end gap-2 mt-2">
                    {summary.compliance_percentage >= 90 ? (
                      <><CheckCircle className="h-4 w-4 text-emerald-500" /><span className="text-sm text-emerald-600 font-semibold">Excellent</span></>
                    ) : summary.compliance_percentage >= 70 ? (
                      <><Clock className="h-4 w-4 text-amber-500" /><span className="text-sm text-amber-600 font-semibold">Good</span></>
                    ) : (
                      <><AlertTriangle className="h-4 w-4 text-red-500" /><span className="text-sm text-red-600 font-semibold">Needs Attention</span></>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-3xl shadow-2xl border-0 overflow-hidden p-8 mb-12">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Filter & Search</h2>
            <p className="text-gray-600">Find specific compliance information across your portfolio</p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-2">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search buildings, assets, or descriptions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#4f46e5] focus:border-[#4f46e5] transition-all duration-300 bg-gray-50 focus:bg-white shadow-sm hover:shadow-md"
                />
              </div>
            </div>
            
            <select
              value={filterBuilding}
              onChange={(e) => setFilterBuilding(e.target.value)}
              className="px-4 py-4 border-2 border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#4f46e5] focus:border-[#4f46e5] transition-all duration-300 bg-gray-50 focus:bg-white shadow-sm hover:shadow-md"
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
              className="px-4 py-4 border-2 border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#4f46e5] focus:border-[#4f46e5] transition-all duration-300 bg-gray-50 focus:bg-white shadow-sm hover:shadow-md"
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
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Building Compliance Overview</h2>
            <p className="text-gray-600">Monitor compliance status across your property portfolio</p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
            {filteredBuildings.map(building => (
              <div key={building.id} className="bg-white rounded-3xl shadow-2xl border-0 overflow-hidden hover:shadow-3xl transition-all duration-300 transform hover:-translate-y-2">
                <div className="p-8">
                  {/* Building Header */}
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-xl font-bold text-gray-900">{building.name}</h3>
                        {building.is_hrb && (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg">
                            🏢 HRB
                          </span>
                        )}
                      </div>
                      <p className="text-gray-600 font-medium">
                        {building.compliance_assets_count} compliance assets
                      </p>
                    </div>
                    
                    <button
                      onClick={() => router.push(`/buildings/${building.id}/compliance`)}
                      className="inline-flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-[#4f46e5] to-[#a855f7] hover:brightness-110 text-white text-sm rounded-2xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                    >
                      <Shield className="h-4 w-4" />
                      View Details
                    </button>
                  </div>
                  
                  {/* Building Compliance Summary */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-4 text-center hover:shadow-lg transition-all duration-300">
                      <p className="text-sm text-green-600 font-semibold mb-1">Compliant</p>
                      <p className="text-2xl font-bold text-green-700">{building.compliant_count}</p>
                    </div>
                    
                    <div className="bg-gradient-to-r from-red-50 to-rose-50 border border-red-200 rounded-2xl p-4 text-center hover:shadow-lg transition-all duration-300">
                      <p className="text-sm text-red-600 font-semibold mb-1">Overdue</p>
                      <p className="text-2xl font-bold text-red-700">{building.overdue_count}</p>
                    </div>
                    
                    <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 rounded-2xl p-4 text-center hover:shadow-lg transition-all duration-300">
                      <p className="text-sm text-yellow-600 font-semibold mb-1">Upcoming</p>
                      <p className="text-2xl font-bold text-yellow-700">{building.upcoming_count}</p>
                    </div>
                    
                    <div className="bg-gradient-to-r from-gray-50 to-slate-50 border border-gray-200 rounded-2xl p-4 text-center hover:shadow-lg transition-all duration-300">
                      <p className="text-sm text-gray-600 font-semibold mb-1">Not Applied</p>
                      <p className="text-2xl font-bold text-gray-700">{building.not_applied_count}</p>
                    </div>
                  </div>
                  
                  {/* Quick Actions */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => openAssetManagement(building)}
                      className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-[#14b8a6] to-[#3b82f6] hover:brightness-110 text-white text-sm rounded-2xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                    >
                      <Plus className="h-4 w-4" />
                      Manage Assets
                    </button>
                    
                    <button
                      onClick={() => router.push(`/buildings/${building.id}`)}
                      className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm rounded-2xl font-semibold transition-all duration-300"
                    >
                      <Building2 className="h-4 w-4" />
                      Building
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
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
                          onClick={() => router.push(`/buildings/${item.building_id}/compliance`)}
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
                onClick={() => {
                  // Navigate to first building's compliance page for setup
                  if (buildings.length > 0) {
                    router.push(`/buildings/${buildings[0].id}/compliance`);
                  } else {
                    router.push('/buildings');
                  }
                }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#004AAD] to-[#7209B7] text-white rounded-lg hover:from-[#003A8C] hover:to-[#5A078F] transition-all duration-200"
              >
                <Plus className="h-4 w-4" />
                Setup Compliance
              </button>
            )}
          </div>
        )}

        {/* Asset Management Modal */}
        {selectedBuilding && (
          <AssetManagementModal
            building={selectedBuilding}
            isOpen={assetManagementOpen}
            onClose={() => {
              setAssetManagementOpen(false)
              setSelectedBuilding(null)
            }}
            onAssetsUpdated={handleAssetsUpdated}
          />
        )}
      </div>
    </div>
  )
}
