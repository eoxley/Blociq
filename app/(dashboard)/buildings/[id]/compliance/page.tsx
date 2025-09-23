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
  Trash2
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
  not_applied_count: number
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
    not_applied_count: 0,
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
        .order('name')

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

  const filteredComplianceData = complianceData.filter(item => {
    const matchesSearch = !searchQuery || 
      item.compliance_assets?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.compliance_assets?.description?.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesCategory = filterCategory === 'all' || 
      item.compliance_assets?.category === filterCategory
    
    const matchesStatus = filterStatus === 'all' || 
      item.status === filterStatus
    
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
              
              <div className="flex gap-3">
                <button
                  onClick={async () => {
                    try {
                      const response = await fetch('/api/compliance/setup', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ buildingId })
                      });
                      const result = await response.json();
                      if (result.success) {
                        toast.success(`Setup complete! Created ${result.assetsCreated} assets`);
                        fetchComplianceData();
                      } else {
                        toast.error('Setup failed: ' + result.error);
                      }
                    } catch (err) {
                      toast.error('Setup failed');
                    }
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-green-600/90 backdrop-blur-sm text-white rounded-lg hover:bg-green-700 transition-all duration-200 text-sm"
                >
                  <Settings className="h-4 w-4" />
                  Quick Setup
                </button>

                <button
                  onClick={async () => {
                    if (!confirm('Are you sure you want to delete ALL compliance analysis data for this building? This will remove all documents, analysis, and action items but keep the compliance assets for future use.')) {
                      return
                    }

                    try {
                      const response = await fetch('/api/compliance/delete-analysis', {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          buildingId: buildingId,
                          deleteType: 'analysis_only'
                        })
                      })

                      const result = await response.json()

                      if (response.ok) {
                        toast.success(`All analysis cleared: ${result.message}`)
                        fetchComplianceData()
                      } else {
                        throw new Error(result.error || 'Failed to clear analysis')
                      }
                    } catch (err) {
                      toast.error('Failed to clear analysis: ' + err.message)
                    }
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600/90 backdrop-blur-sm text-white rounded-lg hover:bg-orange-700 transition-all duration-200 text-sm"
                >
                  <X className="h-4 w-4" />
                  Clear All Analysis
                </button>

                <button
                  onClick={async () => {
                    try {
                      const fireRiskData = {
                        document_type: "Fire Risk Assessment",
                        compliance_status: "Requires-Action",
                        property_details: {
                          address: "42 Ashwood Gardens, London, SW19 8JR",
                          description: "Residential House (HMO)",
                          client: "Ashwood Property Management Ltd"
                        },
                        inspection_details: {
                          inspection_date: "2024-03-15",
                          next_inspection_due: "2025-03-15",
                          inspector: "Michael Thompson",
                          company: "Fire Safety Consultants Ltd",
                          certificate_number: "FRA-ASH-2024-003"
                        },
                        key_findings: [
                          {
                            priority: "High",
                            urgency: "IMMEDIATE",
                            description: "Smoke detector in hallway not functioning",
                            location: "Ground Floor",
                            action: "Replace faulty smoke detector immediately"
                          },
                          {
                            priority: "Medium",
                            urgency: "WITHIN 1 MONTH",
                            description: "Emergency lighting unit requires battery replacement",
                            location: "Stairwell",
                            action: "Replace emergency lighting battery"
                          },
                          {
                            priority: "Medium",
                            urgency: "WITHIN 2 MONTHS",
                            description: "Fire extinguisher requires annual service",
                            location: "Kitchen",
                            action: "Arrange professional service"
                          },
                          {
                            priority: "Low",
                            urgency: "WITHIN 3 MONTHS",
                            description: "Fire door closer requires adjustment",
                            location: "Bedroom 3",
                            action: "Adjust door closer mechanism"
                          }
                        ],
                        recommendations: [
                          {
                            description: "Replace faulty smoke detector in ground floor hallway",
                            reason: "Faulty smoke detector poses immediate fire risk",
                            timeframe: "Within 24 hours",
                            reference: "Regulatory Reform (Fire Safety) Order 2005"
                          },
                          {
                            description: "Replace emergency lighting battery in main stairwell",
                            reason: "Non-functional emergency lighting poses risk in case of fire",
                            timeframe: "Within 1 month",
                            reference: "Regulatory Reform (Fire Safety) Order 2005"
                          }
                        ],
                        risk_assessment: {
                          overall_risk: "MEDIUM",
                          immediate_hazards: ["Faulty smoke detector in ground floor hallway"]
                        },
                        regulatory_compliance: {
                          meets_current_standards: false,
                          relevant_regulations: "Regulatory Reform (Fire Safety) Order 2005"
                        },
                        expiry_date: "2025-03-15"
                      };

                      const response = await fetch('/api/compliance/create-from-analysis', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          buildingId: buildingId,
                          analysisData: fireRiskData,
                          documentJobId: 'test-fra-' + Date.now()
                        })
                      });

                      const result = await response.json();
                      if (result.success) {
                        toast.success(`Fire Risk Assessment processed! Created ${result.actions_created} action items`);
                        fetchComplianceData();
                      } else {
                        toast.error('Processing failed: ' + result.error);
                      }
                    } catch (err) {
                      toast.error('Processing failed: ' + err.message);
                    }
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-red-600/90 backdrop-blur-sm text-white rounded-lg hover:bg-red-700 transition-all duration-200 text-sm"
                >
                  <Shield className="h-4 w-4" />
                  Test Fire Assessment
                </button>
                
                <button
                  onClick={() => router.push('/documents/compliance')}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-white/20 backdrop-blur-sm text-white rounded-lg hover:bg-white/30 transition-all duration-200 border border-white/30"
                >
                  <Upload className="h-5 w-5" />
                  Upload Document
                </button>
                
                <button
                  onClick={() => router.push(`/buildings/${buildingId}/compliance/setup`)}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-white/20 backdrop-blur-sm text-white rounded-lg hover:bg-white/30 transition-all duration-200 border border-white/30"
                >
                  <Plus className="h-5 w-5" />
                  Set Up Compliance
                </button>
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
            
            <div className="bg-gradient-to-br from-gray-50 to-slate-50 border border-gray-200 rounded-xl p-6 text-center">
              <div className="flex items-center justify-center mb-3">
                <AlertCircle className="h-8 w-8 text-gray-500" />
              </div>
              <p className="text-sm font-medium text-gray-600 mb-1">Not Applied</p>
              <p className="text-3xl font-bold text-gray-700">{summary.not_applied_count}</p>
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
                        
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setEditingAsset(item)}
                            className="inline-flex items-center gap-2 px-3 py-2 bg-green-50 text-green-700 text-sm rounded-lg hover:bg-green-100 transition-colors"
                            title="Edit compliance asset"
                          >
                            <Settings className="h-4 w-4" />
                            Edit
                          </button>

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
                              className="inline-flex items-center gap-2 px-3 py-2 bg-orange-50 text-orange-700 text-sm rounded-lg hover:bg-orange-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Delete compliance analysis and documents"
                            >
                              {deletingAssets.has(item.id + '_analysis') ? (
                                <RefreshCw className="h-4 w-4 animate-spin" />
                              ) : (
                                <FileText className="h-4 w-4" />
                              )}
                              Clear Analysis
                            </button>
                          )}

                          <button
                            onClick={() => handleDeleteAsset(item.id)}
                            disabled={deletingAssets.has(item.id)}
                            className="inline-flex items-center gap-2 px-3 py-2 bg-red-50 text-red-700 text-sm rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Delete entire compliance asset"
                          >
                            {deletingAssets.has(item.id) ? (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                            Delete Asset
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
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

    </div>
  )
}
