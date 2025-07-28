import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { notFound } from 'next/navigation'
import LayoutWithSidebar from '@/components/LayoutWithSidebar'
import BuildingOverview from './components/BuildingOverview'
import UnitLeaseholderList from './components/UnitLeaseholderList'
import RMCDirectorsSection from './components/RMCDirectorsSection'
import ComplianceSection from './components/ComplianceSection'
import { Building2, AlertTriangle, CheckCircle, Clock, Users, Shield, FileText } from 'lucide-react'

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
    // Fetch building with all details
    const { data: building, error: buildingError } = await supabase
      .from('buildings')
      .select(`
        *,
        building_setup (
          structure_type,
          operational_notes,
          client_type,
          client_name,
          client_contact,
          client_email,
          assigned_manager
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

    // Fetch units with leaseholder information
    const { data: units, error: unitsError } = await supabase
      .from('units')
      .select(`
        *,
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

    // Fetch compliance assets
    const { data: complianceAssets, error: complianceAssetsError } = await supabase
      .from('building_compliance_assets')
      .select(`
        *,
        compliance_assets (
          id,
          category,
          title,
          description,
          frequency_months
        )
      `)
      .eq('building_id', params.buildingId)

    if (complianceAssetsError) {
      console.error('Error fetching compliance assets:', complianceAssetsError)
    }

    // Fetch compliance documents
    const { data: complianceDocuments, error: complianceDocsError } = await supabase
      .from('compliance_documents')
      .select('*')
      .eq('building_id', params.buildingId)

    if (complianceDocsError) {
      console.error('Error fetching compliance documents:', complianceDocsError)
    }

    // Fetch incoming emails for correspondence
    const { data: incomingEmails, error: emailsError } = await supabase
      .from('incoming_emails')
      .select('*')
      .eq('building_id', params.buildingId)
      .order('received_at', { ascending: false })
      .limit(50)

    if (emailsError) {
      console.error('Error fetching incoming emails:', emailsError)
    }

    // Fetch communications log
    const { data: communicationsLog, error: commsError } = await supabase
      .from('communications')
      .select('*')
      .eq('building_id', params.buildingId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (commsError) {
      console.error('Error fetching communications log:', commsError)
    }

    // Calculate statistics
    const totalUnits = units?.length || 0
    const totalLeaseholders = units?.filter(unit => unit.leaseholders).length || 0
    const directors = units?.filter(unit => unit.leaseholders?.is_director).length || 0
    const totalCompliance = complianceAssets?.length || 0
    const compliantCount = complianceAssets?.filter(asset => asset.status === 'compliant').length || 0
    const overdueCount = complianceAssets?.filter(asset => asset.status === 'overdue').length || 0

    return (
      <LayoutWithSidebar 
        title={building.name || 'Building Details'} 
        subtitle="Comprehensive building management overview"
        showSearch={true}
      >
        <div className="space-y-8">
          {/* Building Overview Section */}
          <BuildingOverview 
            building={building} 
            buildingSetup={building.building_setup}
          />

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Units</p>
                  <p className="text-2xl font-bold text-gray-900">{totalUnits}</p>
                </div>
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Building2 className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Leaseholders</p>
                  <p className="text-2xl font-bold text-gray-900">{totalLeaseholders}</p>
                </div>
                <div className="p-2 bg-green-100 rounded-lg">
                  <Users className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">RMC Directors</p>
                  <p className="text-2xl font-bold text-gray-900">{directors}</p>
                </div>
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Shield className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Compliance Items</p>
                  <p className="text-2xl font-bold text-gray-900">{totalCompliance}</p>
                </div>
                <div className="p-2 bg-orange-100 rounded-lg">
                  <FileText className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column */}
            <div className="space-y-8">
              {/* Units & Leaseholders Section */}
              <UnitLeaseholderList 
                units={units || []}
                buildingId={params.buildingId}
                incomingEmails={incomingEmails || []}
                communicationsLog={communicationsLog || []}
              />

              {/* RMC Directors Section */}
              <RMCDirectorsSection 
                units={units || []}
                buildingId={params.buildingId}
              />
            </div>

            {/* Right Column */}
            <div className="space-y-8">
              {/* Compliance Section */}
              <ComplianceSection 
                complianceAssets={complianceAssets || []}
                complianceDocuments={complianceDocuments || []}
                buildingId={params.buildingId}
              />
            </div>
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