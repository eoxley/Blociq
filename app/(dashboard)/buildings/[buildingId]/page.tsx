import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { AlertTriangle } from 'lucide-react'
import BuildingDetailClient from './components/BuildingDetailClient'
import NotFound from '@/components/NotFound'

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
      .select('*')
      .eq('id', params.buildingId)
      .maybeSingle()

    if (buildingError) {
      console.error('Error fetching building:', buildingError)
      throw new Error('Failed to fetch building data')
    }

    if (!building) {
      console.error('Building not found:', params.buildingId)
      return <NotFound title="Building Not Found" message="We couldn't find the building you're looking for." />
    }

    // Fetch building setup
    const { data: buildingSetup, error: setupError } = await supabase
      .from('building_setup')
      .select('*')
      .eq('building_id', params.buildingId)
      .maybeSingle()

    if (setupError) {
      console.error('Error fetching building setup:', setupError)
    }

    // Fetch units with leaseholder information
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

    // Fetch compliance assets for summary
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
        buildingId={params.buildingId}
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