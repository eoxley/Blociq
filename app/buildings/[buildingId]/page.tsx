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

// Type definitions for better type safety
interface Unit {
  id: string
  unit_number: string
  type?: string | null
  floor?: string | null
  leaseholder_id?: string | null
  leaseholders?: {
    id: string
    name: string | null
    email: string | null
    phone?: string | null
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
        .eq('building_id', parseInt(params.buildingId) || 0)
        .maybeSingle()
      
      buildingSetup = setupData
    } catch (setupError) {
      console.warn('Could not fetch building setup:', setupError)
      // Continue without building setup data
    }

    // Fetch units safely
    let units: Unit[] = []
    try {
      const { data: unitsData, error: unitsError } = await supabase
        .from('units')
        .select(`
          id,
          unit_number,
          type,
          floor,
          leaseholder_id,
          leaseholders (
            id,
            name,
            email,
            phone
          )
        `)
        .eq('building_id', parseInt(params.buildingId) || 0)
        .order('unit_number')

      if (unitsError) {
        console.warn('Error fetching units:', unitsError)
      } else {
        units = (unitsData as unknown as Unit[]) || []
      }
    } catch (unitsError) {
      console.warn('Could not fetch units:', unitsError)
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
        .eq('building_id', parseInt(params.buildingId) || 0)

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
        .eq('building_id', parseInt(params.buildingId) || 0)

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
        .eq('building_id', parseInt(params.buildingId) || 0)
        .order('received_at', { ascending: false })
        .limit(50)

      if (emailsError) {
        console.warn('Error fetching incoming emails:', emailsError)
      } else {
        incomingEmails = (emailsData as IncomingEmail[]) || []
      }
    } catch (emailsError) {
      console.warn('Could not fetch incoming emails:', emailsError)
    }

    // Fetch communications log safely
    let communicationsLog: Communication[] = []
    try {
      const { data: commsData, error: commsError } = await supabase
        .from('communications')
        .select('*')
        .eq('building_id', params.buildingId)
        .order('created_at', { ascending: false })
        .limit(50)

      if (commsError) {
        console.warn('Error fetching communications log:', commsError)
      } else {
        communicationsLog = (commsData as Communication[]) || []
      }
    } catch (commsError) {
      console.warn('Could not fetch communications log:', commsError)
    }

    // Calculate statistics safely
    const totalUnits = units.length
    const totalLeaseholders = units.filter(unit => unit.leaseholders).length
    const directors = 0 // Temporarily set to 0 until director fields are properly migrated
    const totalCompliance = complianceAssets.length
    const compliantCount = complianceAssets.filter(asset => asset.status === 'compliant').length
    const overdueCount = complianceAssets.filter(asset => asset.status === 'overdue').length

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
            buildingSetup={buildingSetup}
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
                units={units}
                buildingId={params.buildingId}
                incomingEmails={incomingEmails}
                communicationsLog={communicationsLog}
              />

              {/* RMC Directors Section */}
              <RMCDirectorsSection 
                units={units}
                buildingId={params.buildingId}
              />
            </div>

            {/* Right Column */}
            <div className="space-y-8">
              {/* Compliance Section */}
              <ComplianceSection 
                complianceAssets={complianceAssets}
                complianceDocuments={complianceDocuments}
                buildingId={params.buildingId}
              />
            </div>
          </div>
        </div>
      </LayoutWithSidebar>
    )
  } catch (error) {
    console.error('Error in building detail page:', error)
    
    // Provide more specific error messages
    let errorMessage = 'Unknown error'
    let errorDetails = ''
    
    if (error instanceof Error) {
      errorMessage = error.message
      
      // Check for specific database errors
      if (error.message.includes('column') && error.message.includes('does not exist')) {
        errorMessage = 'Database schema issue detected'
        errorDetails = 'A required database column is missing. Please run database migrations.'
      } else if (error.message.includes('relation') && error.message.includes('does not exist')) {
        errorMessage = 'Database table issue detected'
        errorDetails = 'A required database table is missing. Please run database migrations.'
      } else if (error.message.includes('permission')) {
        errorMessage = 'Permission denied'
        errorDetails = 'You do not have permission to access this building.'
      } else if (error.message.includes('connection')) {
        errorMessage = 'Database connection error'
        errorDetails = 'Unable to connect to the database. Please try again later.'
      }
    }
    
    return (
      <LayoutWithSidebar>
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-red-600 font-semibold">Error loading building details</p>
                <p className="text-red-500 text-sm">{errorMessage}</p>
              </div>
            </div>
            
            {errorDetails && (
              <p className="text-red-500 text-sm mt-2">{errorDetails}</p>
            )}
            
            <div className="mt-4 flex gap-3">
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors"
              >
                Try Again
              </button>
              <a
                href="/buildings"
                className="px-4 py-2 bg-gray-600 text-white rounded-lg text-sm hover:bg-gray-700 transition-colors"
              >
                Back to Buildings
              </a>
            </div>
            
            {process.env.NODE_ENV === 'development' && (
              <details className="mt-4">
                <summary className="cursor-pointer text-sm font-medium text-red-700">
                  Technical Details (Development)
                </summary>
                <div className="mt-2 p-3 bg-red-100 rounded text-xs font-mono text-red-800 overflow-auto max-h-32">
                  <div className="mb-2">
                    <strong>Error:</strong> {error instanceof Error ? error.message : String(error)}
                  </div>
                  {error instanceof Error && error.stack && (
                    <div>
                      <strong>Stack:</strong>
                      <pre className="whitespace-pre-wrap mt-1">{error.stack}</pre>
                    </div>
                  )}
                </div>
              </details>
            )}
          </div>
        </div>
      </LayoutWithSidebar>
    )
  }
} 