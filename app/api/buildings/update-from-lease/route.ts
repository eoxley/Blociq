import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  extractBuildingDataFromLease,
  aggregateBuildingDataFromLeases,
  prepareBuildingUpdate,
  shouldUpdateBuildingField
} from '@/lib/lease-to-building-mapper'
import {
  createComplianceActionsFromLeases
} from '@/lib/lease-compliance-generator'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function POST(request: NextRequest) {
  try {
    const { buildingId } = await request.json()

    if (!buildingId) {
      return NextResponse.json({ error: 'Building ID is required' }, { status: 400 })
    }

    // Fetch all leases for this building with analysis data
    const { data: leases, error: leasesError } = await supabase
      .from('leases')
      .select('id, analysis_json, created_at')
      .eq('building_id', buildingId)
      .not('analysis_json', 'is', null)

    if (leasesError) {
      console.error('Error fetching leases:', leasesError)
      return NextResponse.json({ error: 'Failed to fetch lease data' }, { status: 500 })
    }

    if (!leases || leases.length === 0) {
      return NextResponse.json({
        message: 'No leases with analysis data found for this building',
        updated: false
      })
    }

    // Aggregate building data from all leases
    const aggregatedData = aggregateBuildingDataFromLeases(leases)

    if (Object.keys(aggregatedData).length === 0) {
      return NextResponse.json({
        message: 'No building-wide data found in lease analyses',
        updated: false
      })
    }

    // Get current building data
    const { data: currentBuilding, error: buildingError } = await supabase
      .from('buildings')
      .select('*')
      .eq('id', buildingId)
      .single()

    if (buildingError) {
      console.error('Error fetching building:', buildingError)
      return NextResponse.json({ error: 'Failed to fetch building data' }, { status: 500 })
    }

    // Prepare update data
    const updateData = prepareBuildingUpdate(aggregatedData)

    // Filter fields that should be updated
    const fieldsToUpdate: any = {}
    const skippedFields: string[] = []

    Object.entries(updateData).forEach(([field, value]) => {
      if (field === 'updated_at' || field === 'lease_data_source') {
        fieldsToUpdate[field] = value
      } else if (shouldUpdateBuildingField(field, currentBuilding[field], value)) {
        fieldsToUpdate[field] = value
      } else {
        skippedFields.push(field)
      }
    })

    // Only update if there are fields to update
    if (Object.keys(fieldsToUpdate).length <= 2) { // Only metadata fields
      return NextResponse.json({
        message: 'No building fields need updating (existing data preserved)',
        updated: false,
        skippedFields
      })
    }

    // Update the building
    const { error: updateError } = await supabase
      .from('buildings')
      .update(fieldsToUpdate)
      .eq('id', buildingId)

    if (updateError) {
      console.error('Error updating building:', updateError)
      return NextResponse.json({ error: 'Failed to update building' }, { status: 500 })
    }

    // Generate compliance actions from lease analysis
    let actionsResult = { created: 0, errors: [] as string[] };
    try {
      actionsResult = await createComplianceActionsFromLeases(
        supabase,
        buildingId,
        currentBuilding.name || 'Building',
        leases
      );
      console.log(`Created ${actionsResult.created} compliance actions from leases`);
    } catch (error) {
      console.error('Error creating compliance actions:', error);
      actionsResult.errors.push(`Failed to create compliance actions: ${error}`);
    }

    return NextResponse.json({
      message: 'Building updated with lease-derived data',
      updated: true,
      updatedFields: Object.keys(fieldsToUpdate).filter(f => f !== 'updated_at' && f !== 'lease_data_source'),
      skippedFields,
      leaseCount: leases.length,
      complianceActions: {
        created: actionsResult.created,
        errors: actionsResult.errors
      }
    })

  } catch (error) {
    console.error('Error in update-from-lease:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * Automatically update building when new lease is processed
 */
export async function PATCH(request: NextRequest) {
  try {
    const { leaseId, buildingId } = await request.json()

    if (!leaseId && !buildingId) {
      return NextResponse.json({ error: 'Lease ID or Building ID is required' }, { status: 400 })
    }

    let targetBuildingId = buildingId

    // If only lease ID provided, get building ID
    if (leaseId && !buildingId) {
      const { data: lease, error: leaseError } = await supabase
        .from('leases')
        .select('building_id')
        .eq('id', leaseId)
        .single()

      if (leaseError || !lease) {
        return NextResponse.json({ error: 'Lease not found' }, { status: 404 })
      }

      targetBuildingId = lease.building_id
    }

    // Use the POST method logic to update the building
    const updateResponse = await POST(new NextRequest(request.url, {
      method: 'POST',
      body: JSON.stringify({ buildingId: targetBuildingId })
    }))

    return updateResponse

  } catch (error) {
    console.error('Error in update-from-lease PATCH:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}