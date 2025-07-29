import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { Building2, AlertTriangle, CheckCircle, Clock, Users, Shield, FileText, Mail, Search, Edit3, Save, X, Home, Wrench, Calendar } from 'lucide-react'
import Link from 'next/link'
import UnitsSearch from './components/UnitsSearch'

interface BuildingDetailPageProps {
  params: {
    buildingId: string
  }
}

// Type definitions for better type safety
interface Building {
  id: string
  name: string
  address: string | null
  unit_count: number | null
  notes: string | null
  is_hrb: boolean | null
  created_at: string
  updated_at: string
}

interface BuildingSetup {
  id: string
  building_id: string
  structure_type: 'Freehold' | 'RMC' | 'Tripartite' | null
  operational_notes: string | null
  client_type: string | null
  client_name: string | null
  client_contact: string | null
  client_email: string | null
}

interface Unit {
  id: string
  unit_number: string
  type: string | null
  floor: string | null
  building_id: string
  leaseholder_id: string | null
  created_at: string | null
  leaseholders?: {
    id: string
    name: string | null
    email: string | null
    phone: string | null
    is_director: boolean | null
    director_since: string | null
    director_notes: string | null
  } | null
}

interface ComplianceAsset {
  id: string
  status: string
  due_date: string | null
  priority: string | null
  notes: string | null
  compliance_assets?: {
    id: string
    category: string
    title: string
    description: string | null
    frequency_months: number | null
  } | null
}

interface ComplianceSummary {
  total: number
  compliant: number
  pending: number
  overdue: number
}

export default async function BuildingDetailPage({ params }: BuildingDetailPageProps) {
  const supabase = createClient(cookies())
  
  try {
    // Check authentication first
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) redirect('/login')

    // Validate building ID format
    if (!params.buildingId || typeof params.buildingId !== 'string') {
      console.error('Invalid building ID:', params.buildingId)
      notFound()
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(params.buildingId)) {
      console.error('Invalid UUID format for building ID:', params.buildingId)
      notFound()
    }

    // Fetch building with all required fields
    const { data: building, error: buildingError } = await supabase
      .from('buildings')
      .select('id, name, address, unit_count, notes, is_hrb, created_at, updated_at')
      .eq('id', params.buildingId)
      .maybeSingle()

    if (buildingError) {
      console.error('Error fetching building:', buildingError)
      throw buildingError
    }

    if (!building) {
      notFound()
    }

    // Fetch building setup for structure type
    const { data: buildingSetup } = await supabase
      .from('building_setup')
      .select('structure_type, operational_notes, client_type, client_name, client_contact, client_email')
      .eq('building_id', params.buildingId)
      .maybeSingle()

    // Fetch units
    const { data: units = [], error: unitsError } = await supabase
      .from('units')
      .select(`
        id,
        unit_number,
        type,
        floor,
        building_id,
        leaseholder_id,
        created_at,
        leaseholders (
          id,
          name,
          email,
          phone,
          is_director,
          director_since,
          director_notes
        )
      `)
      .eq('building_id', params.buildingId)
      .order('unit_number')

    if (unitsError) {
      console.error('Error fetching units:', unitsError)
    }

    // Fetch compliance assets and calculate summary
    const { data: complianceAssets = [], error: complianceError } = await supabase
      .from('building_compliance_assets')
      .select(`
        id,
        status,
        due_date,
        priority,
        notes,
        compliance_assets (
          id,
          category,
          title,
          description,
          frequency_months
        )
      `)
      .eq('building_id', params.buildingId)

    if (complianceError) {
      console.error('Error fetching compliance assets:', complianceError)
    }

    // Calculate compliance summary
    const complianceSummary: ComplianceSummary = {
      total: (complianceAssets || []).length,
      compliant: (complianceAssets || []).filter(asset => asset.status === 'compliant').length,
      pending: (complianceAssets || []).filter(asset => asset.status === 'pending').length,
      overdue: (complianceAssets || []).filter(asset => asset.status === 'overdue').length
    }

    return (
      <div className="min-h-screen bg-gray-50">
        {/* TOP: Building Header with BlocIQ Gradient */}
        <div className="bg-gradient-to-r from-[#008C8F] to-[#7645ED] text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                  <Building2 className="h-8 w-8" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold">{building.name}</h1>
                  <p className="text-white/80 text-lg">{building.address}</p>
                  <div className="flex items-center space-x-3 mt-2">
                    {buildingSetup?.structure_type && (
                      <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-medium">
                        {buildingSetup.structure_type}
                      </span>
                    )}
                    {building.is_hrb && (
                      <span className="bg-red-500/20 px-3 py-1 rounded-full text-sm font-medium flex items-center">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        HRB
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-white/60 text-sm">Building ID</p>
                <p className="text-white/80 font-mono text-sm">{building.id.slice(0, 8)}...</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Column */}
            <div className="lg:col-span-2 space-y-8">
              
              {/* SECTION 1: Building Information */}
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Building Information</h2>
                  <button className="bg-gradient-to-r from-[#008C8F] to-[#7645ED] text-white px-4 py-2 rounded-lg hover:opacity-90 transition-opacity flex items-center">
                    <Edit3 className="h-4 w-4 mr-2" />
                    Edit
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Structure Type</label>
                      <p className="text-gray-900 font-medium">
                        {buildingSetup?.structure_type || 'Not specified'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Active
                      </span>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Total Units</label>
                      <p className="text-gray-900 font-medium">
                        {(units || []).length} units
                      </p>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                    <div className="bg-gray-50 rounded-lg p-3 min-h-[100px]">
                      <p className="text-gray-700 text-sm">
                        {building.notes || 'No notes added yet. Click Edit to add building notes.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 2: Compliance Overview */}
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Compliance Overview</h2>
                  <Link 
                    href={`/buildings/${params.buildingId}/compliance`}
                    className="bg-gradient-to-r from-[#008C8F] to-[#7645ED] text-white px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
                  >
                    View All
                  </Link>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gray-50 rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-gray-900">{complianceSummary.total}</div>
                    <div className="text-sm text-gray-600">Total Items</div>
                  </div>
                  <div className="bg-green-50 rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-green-600">{complianceSummary.compliant}</div>
                    <div className="text-sm text-green-600">Compliant</div>
                  </div>
                  <div className="bg-yellow-50 rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-yellow-600">{complianceSummary.pending}</div>
                    <div className="text-sm text-yellow-600">Pending</div>
                  </div>
                  <div className="bg-red-50 rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-red-600">{complianceSummary.overdue}</div>
                    <div className="text-sm text-red-600">Overdue</div>
                  </div>
                </div>
              </div>

              {/* SECTION 3: Major Works */}
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Major Works</h2>
                  <Link 
                    href={`/buildings/${params.buildingId}/major-works`}
                    className="bg-gradient-to-r from-[#008C8F] to-[#7645ED] text-white px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
                  >
                    View All
                  </Link>
                </div>
                
                <div className="text-center py-12">
                  <Wrench className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No major works recorded yet</h3>
                  <p className="text-gray-600 mb-4">
                    This section will track upcoming projects and historic works.
                  </p>
                  <button className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors">
                    Add Major Work
                  </button>
                </div>
              </div>

              {/* SECTION 4: Units */}
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <UnitsSearch units={units} buildingId={params.buildingId} />
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-8">
              
              {/* Quick Actions */}
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  <Link
                    href={`/buildings/${params.buildingId}/compliance/setup`}
                    className="flex items-center p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <Shield className="h-5 w-5 text-[#008C8F] mr-3" />
                    <span className="text-gray-700">Setup Compliance</span>
                  </Link>
                  <Link
                    href={`/buildings/${params.buildingId}/communications`}
                    className="flex items-center p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <FileText className="h-5 w-5 text-[#008C8F] mr-3" />
                    <span className="text-gray-700">Send Communication</span>
                  </Link>
                  <Link
                    href={`/buildings/${params.buildingId}/major-works`}
                    className="flex items-center p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <Wrench className="h-5 w-5 text-[#008C8F] mr-3" />
                    <span className="text-gray-700">Major Works</span>
                  </Link>
                  <Link
                    href={`/buildings/${params.buildingId}/calendar`}
                    className="flex items-center p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <Calendar className="h-5 w-5 text-[#008C8F] mr-3" />
                    <span className="text-gray-700">Calendar</span>
                  </Link>
                </div>
              </div>

              {/* Building Stats */}
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Building Stats</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Total Units</span>
                    <span className="font-semibold text-gray-900">{(units || []).length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Leaseholders</span>
                    <span className="font-semibold text-gray-900">
                      {(units || []).filter(u => u.leaseholders).length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">RMC Directors</span>
                    <span className="font-semibold text-gray-900">
                      {(units || []).filter(u => u.leaseholders?.is_director).length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Compliance Items</span>
                    <span className="font-semibold text-gray-900">{complianceSummary.total}</span>
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Recent Activity</h3>
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-[#008C8F] rounded-full mt-2"></div>
                    <div>
                      <p className="text-sm text-gray-900">Building information updated</p>
                      <p className="text-xs text-gray-500">2 hours ago</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-[#7645ED] rounded-full mt-2"></div>
                    <div>
                      <p className="text-sm text-gray-900">New unit added</p>
                      <p className="text-xs text-gray-500">1 day ago</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                    <div>
                      <p className="text-sm text-gray-900">Compliance check completed</p>
                      <p className="text-xs text-gray-500">3 days ago</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )

  } catch (error) {
    console.error('❌ Error in BuildingDetailPage:', error)
    
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error loading building</h2>
          <p className="text-gray-600 mb-4">
            {error instanceof Error ? error.message : 'An unexpected error occurred'}
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-gradient-to-r from-[#008C8F] to-[#7645ED] text-white px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }
} 