import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { notFound } from 'next/navigation'
import LayoutWithSidebar from '@/components/LayoutWithSidebar'
import BuildingSummary from './components/BuildingSummary'
import UnitList from './components/UnitList'
import ComplianceTracker from './components/ComplianceTracker'
import MajorWorksOverview from './components/MajorWorksOverview'
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
    // Fetch building with all related data
    const { data: building, error: buildingError } = await supabase
      .from('buildings')
      .select(`
        *,
        units (
          id,
          unit_number,
          type,
          floor,
          leaseholder_email,
          leaseholder_id,
          created_at,
          updated_at
        ),
        building_compliance_assets (
          id,
          name,
          category,
          status,
          next_due_date,
          last_updated,
          created_at
        ),
        major_works_projects (
          id,
          title,
          type,
          start_date,
          end_date,
          status,
          percentage_complete,
          created_at
        ),
        property_events (
          id,
          title,
          description,
          event_type,
          start_date,
          end_date,
          responsible_party,
          outlook_event_id,
          created_at
        ),
        manual_events (
          id,
          title,
          description,
          event_type,
          start_date,
          end_date,
          responsible_party,
          created_at
        )
      `)
      .eq('id', params.buildingId)
      .maybeSingle()

    if (buildingError) {
      console.error('Error fetching building:', buildingError)
      throw buildingError
    }

    if (!building) {
      notFound()
    }

    // Fetch leaseholders for units
    const { data: leaseholders, error: leaseholdersError } = await supabase
      .from('leaseholders')
      .select('id, name, email, phone')
      .in('id', building.units?.map(unit => unit.leaseholder_id).filter(Boolean) || [])

    if (leaseholdersError) {
      console.error('Error fetching leaseholders:', leaseholdersError)
    }

    // Fetch compliance documents
    const { data: complianceDocuments, error: complianceDocsError } = await supabase
      .from('compliance_documents')
      .select('*')
      .eq('building_id', params.buildingId)

    if (complianceDocsError) {
      console.error('Error fetching compliance documents:', complianceDocsError)
    }

    // Fetch major works timeline events
    const { data: timelineEvents, error: timelineError } = await supabase
      .from('major_works_timeline_events')
      .select('*')
      .in('project_id', building.major_works_projects?.map(project => project.id) || [])

    if (timelineError) {
      console.error('Error fetching timeline events:', timelineError)
    }

    // Fetch major works documents
    const { data: majorWorksDocuments, error: majorWorksDocsError } = await supabase
      .from('major_works_documents')
      .select('*')
      .in('project_id', building.major_works_projects?.map(project => project.id) || [])

    if (majorWorksDocsError) {
      console.error('Error fetching major works documents:', majorWorksDocsError)
    }

    // Calculate compliance statistics
    const complianceAssets = building.building_compliance_assets || []
    const totalCompliance = complianceAssets.length
    const compliantCount = complianceAssets.filter(asset => asset.status === 'compliant').length
    const overdueCount = complianceAssets.filter(asset => asset.status === 'overdue').length
    const missingCount = complianceAssets.filter(asset => asset.status === 'missing').length

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
                  <p className="text-2xl font-bold text-gray-900">{building.units?.length || 0}</p>
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
                  <p className="text-sm font-medium text-gray-600">Major Works</p>
                  <p className="text-2xl font-bold text-gray-900">{building.major_works_projects?.length || 0}</p>
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
                  units={building.units || []} 
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
                  complianceAssets={building.building_compliance_assets || []}
                  complianceDocuments={complianceDocuments || []}
                  buildingId={params.buildingId}
                />
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Major Works Overview */}
              <div className="bg-white rounded-lg border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Major Works</h2>
                  <p className="text-sm text-gray-600 mt-1">Track ongoing and planned major works projects</p>
                </div>
                <MajorWorksOverview 
                  projects={building.major_works_projects || []}
                  timelineEvents={timelineEvents || []}
                  documents={majorWorksDocuments || []}
                  buildingId={params.buildingId}
                />
              </div>

              {/* Property Events */}
              <div className="bg-white rounded-lg border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Property Events</h2>
                  <p className="text-sm text-gray-600 mt-1">Upcoming and historic property events</p>
                </div>
                <PropertyEvents 
                  propertyEvents={building.property_events || []}
                  manualEvents={building.manual_events || []}
                  buildingId={params.buildingId}
                />
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