import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { notFound } from 'next/navigation'
import BuildingOverview from './components/BuildingOverview'
import UnifiedUnitsList from './components/UnifiedUnitsList'
import RMCDirectorsSection from './components/RMCDirectorsSection'
import ComplianceSection from './components/ComplianceSection'
import { Building2, AlertTriangle, CheckCircle, Clock, Users, Shield, FileText, Mail } from 'lucide-react'

interface BuildingDetailPageProps {
  params: {
    buildingId: string
  }
}

// Type definitions for better type safety
interface Unit {
  id: number
  unit_number: string
  type: string | null
  floor: string | null
  building_id: string // Changed to string (UUID)
  leaseholder_id: string | null
  created_at: string | null
  leaseholders?: {
    id: string
    name: string | null // Changed from full_name to name
    email: string | null
    phone?: string | null
    is_director?: boolean
    director_since?: string | null
    director_notes?: string | null
  } | null
}

interface ComplianceAsset {
  id: string
  status: string
  due_date?: string | null
  priority?: string | null
  notes?: string | null
  compliance_assets?: {
    id: string
    category: string
    title: string
    description?: string | null
    frequency_months?: number | null
  } | null
}

interface ComplianceDocument {
  id: string
  [key: string]: any
}

interface IncomingEmail {
  id: string
  [key: string]: any
}

interface Communication {
  id: string
  [key: string]: any
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

    // Fetch building with basic details first
    const { data: building, error: buildingError } = await supabase
      .from('buildings')
      .select('id, name, address, unit_count, created_at')
      .eq('id', params.buildingId)
      .maybeSingle()

    if (buildingError) {
      console.error('Error fetching building:', buildingError)
      
      // Check for specific database errors
      if (buildingError.message.includes('column') && buildingError.message.includes('does not exist')) {
        throw new Error('Database schema issue: A required column is missing. Please run database migrations.')
      } else if (buildingError.message.includes('relation') && buildingError.message.includes('does not exist')) {
        throw new Error('Database table issue: The buildings table is missing. Please run database migrations.')
      } else if (buildingError.message.includes('permission')) {
        throw new Error('Permission denied: You do not have access to this building.')
      }
      
      throw buildingError
    }

    if (!building) {
      notFound()
    }

    // Fetch additional building details safely
    let buildingSetup = null
    try {
      const { data: setupData } = await supabase
        .from('building_setup')
        .select('structure_type, operational_notes, client_type, client_name, client_contact, client_email')
        .eq('building_id', params.buildingId) // FIXED: Use UUID directly, not parseInt
        .maybeSingle()
      
      buildingSetup = setupData
    } catch (setupError) {
      console.warn('Could not fetch building setup:', setupError)
      // Continue without building setup data
    }

    // Fetch units safely - FIXED: Use UUID directly, not parseInt
    let units: Unit[] = []
    try {
      console.log('🔍 Fetching units for building:', params.buildingId)
      
      const { data: unitsData, error: unitsError } = await supabase
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
        .eq('building_id', params.buildingId) // FIXED: Use UUID directly
        .order('unit_number')

      if (unitsError) {
        console.error('❌ Error fetching units:', unitsError)
      } else {
        units = (unitsData as unknown as Unit[]) || []
        console.log('✅ Units fetched successfully:', units.length, 'units found')
        console.log('📋 Units data:', units)
      }
    } catch (unitsError) {
      console.error('❌ Could not fetch units:', unitsError)
    }

    // Fetch compliance assets safely
    let complianceAssets: ComplianceAsset[] = []
    try {
      const { data: assetsData, error: assetsError } = await supabase
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
        .eq('building_id', params.buildingId) // FIXED: Use UUID directly, not parseInt

      if (assetsError) {
        console.warn('Error fetching compliance assets:', assetsError)
      } else {
        complianceAssets = (assetsData as unknown as ComplianceAsset[]) || []
      }
    } catch (assetsError) {
      console.warn('Could not fetch compliance assets:', assetsError)
    }

    // Fetch compliance documents safely
    let complianceDocuments: ComplianceDocument[] = []
    try {
      const { data: docsData, error: docsError } = await supabase
        .from('compliance_documents')
        .select('*')
        .eq('building_id', params.buildingId) // FIXED: Use UUID directly, not parseInt

      if (docsError) {
        console.warn('Error fetching compliance documents:', docsError)
      } else {
        complianceDocuments = (docsData as ComplianceDocument[]) || []
      }
    } catch (docsError) {
      console.warn('Could not fetch compliance documents:', docsError)
    }

    // Fetch incoming emails safely
    let incomingEmails: IncomingEmail[] = []
    try {
      const { data: emailsData, error: emailsError } = await supabase
        .from('incoming_emails')
        .select('*')
        .eq('building_id', params.buildingId)
        .order('received_at', { ascending: false })
        .limit(10)

      if (emailsError) {
        console.warn('Error fetching incoming emails:', emailsError)
      } else {
        incomingEmails = (emailsData as IncomingEmail[]) || []
      }
    } catch (emailsError) {
      console.warn('Could not fetch incoming emails:', emailsError)
    }

    // Fetch communications safely
    let communications: Communication[] = []
    try {
      const { data: commsData, error: commsError } = await supabase
        .from('communications')
        .select('*')
        .eq('building_id', params.buildingId)
        .order('created_at', { ascending: false })
        .limit(10)

      if (commsError) {
        console.warn('Error fetching communications:', commsError)
      } else {
        communications = (commsData as Communication[]) || []
      }
    } catch (commsError) {
      console.warn('Could not fetch communications:', commsError)
    }

    return (
      <div className="space-y-8">
        {/* Building Overview */}
        <BuildingOverview 
          building={building} 
          buildingSetup={buildingSetup}
        />

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Units Section */}
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Units</h2>
                  <p className="text-sm text-gray-600">
                    {(units || []).length} unit{(units || []).length !== 1 ? 's' : ''} in this building
                  </p>
                </div>
              </div>
            </div>

            <UnifiedUnitsList buildingId={params.buildingId} />
          </div>

          {/* RMC Directors Section */}
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
            <RMCDirectorsSection units={units} buildingId={params.buildingId} />
          </div>
        </div>

        {/* Compliance Section */}
        <ComplianceSection 
          buildingId={params.buildingId}
          complianceAssets={complianceAssets}
          complianceDocuments={complianceDocuments}
        />

        {/* Communications & Emails Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Communications */}
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <FileText className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Recent Communications</h2>
                  <p className="text-sm text-gray-600">
                    Latest messages and updates
                  </p>
                </div>
              </div>
            </div>

            {(communications || []).length > 0 ? (
              <div className="space-y-4">
                {(communications || []).slice(0, 5).map((comm) => (
                  <div key={comm.id} className="border-l-4 border-green-500 pl-4 py-2">
                    <h3 className="font-medium text-gray-900">{comm.subject}</h3>
                    <p className="text-sm text-gray-600">{comm.content}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(comm.created_at || '').toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No communications yet</p>
              </div>
            )}
          </div>

          {/* Recent Emails */}
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Mail className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Recent Emails</h2>
                  <p className="text-sm text-gray-600">
                    Latest incoming messages
                  </p>
                </div>
              </div>
            </div>

            {(incomingEmails || []).length > 0 ? (
              <div className="space-y-4">
                {(incomingEmails || []).slice(0, 5).map((email) => (
                  <div key={email.id} className="border-l-4 border-purple-500 pl-4 py-2">
                    <h3 className="font-medium text-gray-900">{email.subject}</h3>
                    <p className="text-sm text-gray-600">{email.from_name} ({email.from_email})</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(email.received_at || '').toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No emails yet</p>
              </div>
            )}
          </div>
        </div>
      </div>
    )

  } catch (error) {
    console.error('❌ Error in BuildingDetailPage:', error)
    
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-red-600 font-semibold">Error loading building details</p>
              <p className="text-red-500 text-sm">
                {error instanceof Error ? error.message : 'An unexpected error occurred'}
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }
} 