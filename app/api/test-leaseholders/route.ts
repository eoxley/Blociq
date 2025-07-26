import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const buildingId = searchParams.get('buildingId')

  if (!buildingId) {
    return NextResponse.json({ error: 'Building ID is required' }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    console.log('🔍 Testing leaseholders fetch for building:', buildingId)

    // 1. Get building info
    const { data: building, error: buildingError } = await supabase
      .from('buildings')
      .select('id, name')
      .eq('id', buildingId)
      .single()

    if (buildingError) {
      console.error('❌ Building query failed:', buildingError)
      return NextResponse.json({ 
        error: 'Building query failed', 
        details: buildingError 
      }, { status: 500 })
    }

    console.log('✅ Building found:', building)

    // 2. Get all units for this building
    const { data: buildingUnits, error: unitsError } = await supabase
      .from('units')
      .select('id, unit_number, floor, type')
      .eq('building_id', buildingId)

    if (unitsError) {
      console.error('❌ Units query failed:', unitsError)
      return NextResponse.json({ 
        error: 'Units query failed', 
        details: unitsError 
      }, { status: 500 })
    }

    console.log('✅ Building units found:', buildingUnits?.length || 0)

    if (!buildingUnits || buildingUnits.length === 0) {
      return NextResponse.json({
        success: true,
        building: building,
        units: [],
        leases: [],
        leaseholders: [],
        summary: {
          totalUnits: 0,
          totalLeases: 0,
          totalLeaseholders: 0
        }
      })
    }

    const unitIds = buildingUnits.map(unit => unit.id)

    // 3. Get leases for these units
    const { data: leases, error: leasesError } = await supabase
      .from('leases')
      .select(`
        id,
        building_id,
        unit_id,
        start_date,
        expiry_date,
        is_headlease,
        doc_type,
        created_at
      `)
      .in('unit_id', unitIds)

    if (leasesError) {
      console.error('❌ Leases query failed:', leasesError)
      return NextResponse.json({ 
        error: 'Leases query failed', 
        details: leasesError 
      }, { status: 500 })
    }

    console.log('✅ Leases found:', leases?.length || 0)

    // 4. Get leaseholders for these units
    const { data: leaseholders, error: leaseholdersError } = await supabase
      .from('leaseholders')
      .select(`
        id,
        name,
        email,
        phone,
        unit_id
      `)
      .in('unit_id', unitIds)

    if (leaseholdersError) {
      console.error('❌ Leaseholders query failed:', leaseholdersError)
      return NextResponse.json({ 
        error: 'Leaseholders query failed', 
        details: leaseholdersError 
      }, { status: 500 })
    }

    console.log('✅ Leaseholders found:', leaseholders?.length || 0)

    // 5. Create a map of unit_id to unit
    const unitMap = new Map()
    buildingUnits.forEach(unit => {
      unitMap.set(unit.id, unit)
    })

    // 6. Create a map of unit_id to lease
    const leaseMap = new Map()
    leases?.forEach(lease => {
      if (lease.unit_id) {
        leaseMap.set(lease.unit_id, lease)
      }
    })

    // 7. Combine the data
    const leaseholdersWithUnits = (leaseholders || []).map(leaseholder => ({
      leaseholder,
      unit: leaseholder.unit_id ? unitMap.get(leaseholder.unit_id) || null : null,
      lease: leaseholder.unit_id ? leaseMap.get(leaseholder.unit_id) || null : null
    }))

    return NextResponse.json({
      success: true,
      building: building,
      units: buildingUnits,
      leases: leases || [],
      leaseholders: leaseholders || [],
      leaseholdersWithUnits: leaseholdersWithUnits,
      summary: {
        totalUnits: buildingUnits.length,
        totalLeases: leases?.length || 0,
        totalLeaseholders: leaseholders?.length || 0,
        unitsWithLeases: leases?.length || 0,
        unitsWithLeaseholders: leaseholders?.length || 0
      },
      testResults: {
        buildingQuery: buildingError ? 'FAILED' : 'SUCCESS',
        unitsQuery: unitsError ? 'FAILED' : 'SUCCESS',
        leasesQuery: leasesError ? 'FAILED' : 'SUCCESS',
        leaseholdersQuery: leaseholdersError ? 'FAILED' : 'SUCCESS',
        dataMapping: 'SUCCESS'
      }
    })

  } catch (error) {
    console.error('❌ Error in test leaseholders API:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 