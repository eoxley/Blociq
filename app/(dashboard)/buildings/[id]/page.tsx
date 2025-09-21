import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { AlertTriangle } from 'lucide-react'
import BuildingDetailClient from './components/BuildingDetailClient'
import NotFound from '../../../../components/NotFound'

interface BuildingDetailPageProps {
  params: Promise<{
    id: string
  }>
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
  keys_location: string | null
  emergency_access: string | null
  site_staff: string | null
  site_staff_updated_at: string | null
  insurance_contact: string | null
  cleaners: string | null
  contractors: string | null
}

interface Unit {
  id: string
  unit_number: string
  type: string | null
  floor: string | null
  building_id: string
  leaseholder_id: string | null
  created_at: string | null
}

interface ComplianceSummary {
  total: number
  compliant: number
  pending: number
  overdue: number
}

export default async function BuildingDetailPage({ params }: BuildingDetailPageProps) {
  const resolvedParams = await params
  let supabase: any;
  let session: any;

  try {
    supabase = await createClient()

    // Check authentication first with better error handling
    try {
      const authResult = await supabase.auth.getSession()
      session = authResult.data?.session

      if (!session) {
        console.log('No session found, redirecting to login')
        redirect('/login')
      }
    } catch (authError) {
      console.error('Authentication error:', authError)
      redirect('/login')
    }

    // Validate building ID format
    if (!resolvedParams.id || typeof resolvedParams.id !== 'string') {
      console.error('Invalid building ID:', resolvedParams.id)
      notFound()
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(resolvedParams.id)) {
      console.error('Invalid UUID format for building ID:', resolvedParams.id)
      notFound()
    }

    // Fetch building with all required fields and better error handling
    let building = null;
    try {
      const buildingResult = await supabase
        .from('buildings')
        .select('*')
        .eq('id', resolvedParams.id)
        .maybeSingle()

      if (buildingResult.error) {
        console.error('Database error fetching building:', buildingResult.error)
        if (buildingResult.error.code === 'PGRST116') {
          // Table doesn't exist
          throw new Error('Database not properly configured')
        }
        throw new Error('Failed to fetch building data')
      }

      building = buildingResult.data
    } catch (fetchError) {
      console.error('Exception fetching building:', fetchError)
      throw new Error('Failed to connect to database')
    }

    if (!building) {
      console.error('Building not found:', resolvedParams.id)
      return <NotFound title="Building Not Found" message="We couldn't find the building you're looking for." />
    }

    // Fetch building setup with error handling
    let buildingSetup = null;
    try {
      const setupResult = await supabase
        .from('building_setup')
        .select('id, building_id, structure_type, operational_notes, client_type, client_name, client_contact, client_email, keys_location, emergency_access, site_staff, site_staff_updated_at, insurance_contact, cleaners, contractors')
        .eq('building_id', resolvedParams.id)
        .maybeSingle()

      if (setupResult.error && setupResult.error.code !== 'PGRST116') {
        console.error('Error fetching building setup:', setupResult.error)
      } else {
        buildingSetup = setupResult.data
      }
    } catch (setupFetchError) {
      console.error('Exception fetching building setup:', setupFetchError)
    }

    // Fetch units with simple query and error handling
    let units: Unit[] = [];
    try {
      const unitsResult = await supabase
        .from('units')
        .select('id, unit_number, type, floor, building_id, leaseholder_id, created_at')
        .eq('building_id', resolvedParams.id)
        .order('unit_number')

      if (unitsResult.error && unitsResult.error.code !== 'PGRST116') {
        console.error('Error fetching units:', unitsResult.error)
      } else {
        units = unitsResult.data || []
      }
    } catch (unitsFetchError) {
      console.error('Exception fetching units:', unitsFetchError)
    }

    // Debug log for development
    console.log("Units loaded:", units.length, "units")

    // Fetch compliance assets for summary with error handling
    let complianceAssets: any[] = [];
    try {
      const complianceResult = await supabase
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
        .eq('building_id', resolvedParams.id)

      if (complianceResult.error && complianceResult.error.code !== 'PGRST116') {
        console.error('Error fetching compliance assets:', complianceResult.error)
      } else {
        complianceAssets = complianceResult.data || []
      }
    } catch (complianceFetchError) {
      console.error('Exception fetching compliance assets:', complianceFetchError)
    }

    // Calculate compliance summary with safe guards
    const complianceSummary: ComplianceSummary = {
      total: complianceAssets?.length || 0,
      compliant: complianceAssets?.filter(asset => asset.status === 'compliant').length || 0,
      pending: complianceAssets?.filter(asset => asset.status === 'pending').length || 0,
      overdue: complianceAssets?.filter(asset => asset.status === 'overdue').length || 0
    }

    // Pass all data to the Client Component with safe guards
    return (
      <BuildingDetailClient
        building={building}
        buildingSetup={buildingSetup}
        units={units || []}
        complianceSummary={complianceSummary}
        buildingId={resolvedParams.id}
      />
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
          <a 
                            href="/buildings"
            className="bg-gradient-to-r from-[#008C8F] to-[#7645ED] text-white px-4 py-2 rounded-lg hover:opacity-90 transition-opacity inline-block"
          >
            Back to Buildings
          </a>
        </div>
      </div>
    )
  }
} 