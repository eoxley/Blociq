import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import LeaseModeClient from './LeaseModeClient'

interface LeaseModePageProps {
  params: {
    id: string
  }
}

export default async function LeaseModePage({ params }: LeaseModePageProps) {
  const supabase = createClient(cookies())

  try {
    // Check authentication first
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) redirect('/login')

    // Validate building ID format
    if (!params.id || typeof params.id !== 'string') {
      console.error('Invalid building ID:', params.id)
      notFound()
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(params.id)) {
      console.error('Invalid UUID format for building ID:', params.id)
      notFound()
    }

    // Fetch building to ensure it exists
    const { data: building, error: buildingError } = await supabase
      .from('buildings')
      .select('id, name')
      .eq('id', params.id)
      .maybeSingle()

    if (buildingError) {
      console.error('Error fetching building:', buildingError)
      throw new Error('Failed to fetch building data')
    }

    if (!building) {
      console.error('Building not found:', params.id)
      notFound()
    }

    // Fetch leases for this building
    const { data: leases = [], error: leasesError } = await supabase
      .from('leases')
      .select(`
        id,
        lease_start_date,
        lease_end_date,
        term_years,
        ground_rent_amount,
        ground_rent_frequency,
        service_charge_amount,
        leaseholder_name,
        property_address,
        lease_type,
        restrictions,
        responsibilities,
        apportionments,
        clauses,
        metadata,
        extracted_text,
        created_at,
        updated_at,
        building_id,
        unit_id
      `)
      .eq('building_id', params.id)
      .order('created_at', { ascending: false })

    if (leasesError) {
      console.error('Error fetching leases:', leasesError)
    }

    // Fetch units for this building for lease association
    const { data: units = [], error: unitsError } = await supabase
      .from('units')
      .select('id, unit_number, type, floor')
      .eq('building_id', params.id)
      .order('unit_number')

    if (unitsError) {
      console.error('Error fetching units:', unitsError)
    }

    return (
      <LeaseModeClient
        buildingId={params.id}
        buildingName={building.name}
        leases={leases || []}
        units={units || []}
      />
    )

  } catch (error) {
    console.error('❌ Error in LeaseModePage:', error)
    throw error
  }
}