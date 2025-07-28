import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { notFound } from 'next/navigation'
import LayoutWithSidebar from '@/components/LayoutWithSidebar'
import BuildingSummary from './components/BuildingSummary'
import UnitList from './components/UnitList'
import ComplianceTracker from './components/ComplianceTracker'
import PropertyEvents from './components/PropertyEvents'
import AISummaryButton from './components/AISummaryButton'
import { Building2, AlertTriangle, CheckCircle, Clock } from 'lucide-react'

interface BuildingDetailPageProps {
  params: {
    buildingId: string
  }
}

export default async function BuildingDetailPage({ params }: BuildingDetailPageProps) {
  const supabase = createClient(cookies())
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  try {
    // First, fetch the building with basic information
    const { data: building, error: buildingError } = await supabase
      .from('buildings')
      .select('*')
      .eq('id', params.buildingId)
      .maybeSingle()

    if (buildingError) {
      console.error('Error fetching building:', buildingError)
      throw buildingError
    }

    if (!building) {
      notFound()
    }

    // Fetch units separately to avoid relationship issues
    const { data: units, error: unitsError } = await supabase
      .from('units')
      .select('*')
      .eq('building_id', parseInt(params.buildingId))

    if (unitsError) {
      console.error('Error fetching units:', unitsError)
    }

    // Fetch leaseholders for units
    const leaseholderIds = units?.map(unit => unit.leaseholder_id).filter(Boolean) || []
    const { data: leaseholders, error: leaseholdersError } = await supabase
      .from('leaseholders')
      .select('id, name, email, phone')
      .in('id', leaseholderIds)

    if (leaseholdersError) {
      console.error('Error fetching leaseholders:', leaseholdersError)
    }

    // Fetch compliance assets separately
    const { data: complianceAssets, error: complianceAssetsError } = await supabase
      .from('building_compliance_assets')
      .select('*')
      .eq('building_id', parseInt(params.buildingId))

    if (complianceAssetsError) {
      console.error('Error fetching compliance assets:', complianceAssetsError)
    }

    // Fetch compliance documents
    const { data: complianceDocuments, error: complianceDocsError } = await supabase
      .from('compliance_documents')
      .select('*')
      .eq('building_id', parseInt(params.buildingId))

    if (complianceDocsError) {
      console.error('Error fetching compliance documents:', complianceDocsError)
    }

    // Fetch property events
    const { data: propertyEvents, error: propertyEventsError } = await supabase
      .from('property_events')
      .select('*')
      .eq('building_id', parseInt(params.buildingId))

    if (propertyEventsError) {
      console.error('Error fetching property events:', propertyEventsError)
    }

    // Calculate compliance statistics
    const totalCompliance = complianceAssets?.length || 0
    const compliantCount = complianceAssets?.filter(asset => asset.status === 'compliant').length || 0
    const overdueCount = complianceAssets?.filter(asset => asset.status === 'overdue').length || 0
    const missingCount = complianceAssets?.filter(asset => asset.status === 'missing').length || 0

    return (
      <LayoutWithSidebar 
        title={building.name || 'Building Details'} 
        subtitle="Comprehensive building management overview"
        showSearch={true}
      >
        <div className="space-y-6">
          {/* Building Summary */}
          <BuildingSummary building={building} />

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Units</p>
                  <p className="text-2xl font-bold text-gray-900">{units?.length || 0}</p>
                </div>
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Building2 className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Compliance Items</p>
                  <p className="text-2xl font-bold text-gray-900">{totalCompliance}</p>
                </div>
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Overdue</p>
                  <p className="text-2xl font-bold text-red-600">{overdueCount}</p>
                </div>
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Property Events</p>
                  <p className="text-2xl font-bold text-gray-900">{propertyEvents?.length || 0}</p>
                </div>
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Clock className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-6">
              {/* Units List */}
              <div className="bg-white rounded-lg border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Units & Leaseholders</h2>
                  <p className="text-sm text-gray-600 mt-1">Manage units and leaseholder information</p>
                </div>
                <UnitList 
                  units={units || []} 
                  leaseholders={leaseholders || []}
                  buildingId={params.buildingId}
                />
              </div>

              {/* Compliance Tracker */}
              <div className="bg-white rounded-lg border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Compliance Tracker</h2>
                  <p className="text-sm text-gray-600 mt-1">Track building compliance requirements</p>
                </div>
                <ComplianceTracker 
                  complianceAssets={complianceAssets || []}
                  complianceDocuments={complianceDocuments || []}
                  buildingId={params.buildingId}
                />
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Property Events */}
              <div className="bg-white rounded-lg border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Property Events</h2>
                  <p className="text-sm text-gray-600 mt-1">Upcoming and historic property events</p>
                </div>
                <PropertyEvents 
                  propertyEvents={propertyEvents || []}
                  manualEvents={[]} // No manual_events table in current schema
                  buildingId={params.buildingId}
                />
              </div>

              {/* Placeholder for Major Works (when table is available) */}
              <div className="bg-white rounded-lg border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Major Works</h2>
                  <p className="text-sm text-gray-600 mt-1">Track ongoing and planned major works projects</p>
                </div>
                <div className="p-6 text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Clock className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Major Works Coming Soon</h3>
                  <p className="text-gray-600">
                    Major works functionality will be available once the database schema is updated.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* AI Summary Button */}
          <div className="flex justify-center">
            <AISummaryButton buildingId={params.buildingId} buildingName={building.name} />
          </div>
        </div>
      </LayoutWithSidebar>
    )
  } catch (error) {
    console.error('Error in building detail page:', error)
    return (
      <LayoutWithSidebar>
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-600">Error loading building details.</p>
            <p className="text-red-500 text-sm mt-2">Please try refreshing the page or contact support if the issue persists.</p>
          </div>
        </div>
      </LayoutWithSidebar>
    )
  }
} 