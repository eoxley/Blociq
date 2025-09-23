import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const buildingId = '2beeec1d-a94e-4058-b881-213d74cc6830'

    console.log(`🏠 Checking/Adding building: ${buildingId}`)

    // First check if building exists
    const { data: existingBuilding, error: checkError } = await supabase
      .from('buildings')
      .select('*')
      .eq('id', buildingId)
      .single()

    if (existingBuilding) {
      console.log('✅ Building already exists:', existingBuilding)
      return NextResponse.json({
        success: true,
        message: 'Building already exists',
        building: existingBuilding
      })
    }

    if (checkError && checkError.code !== 'PGRST116') {
      console.log('Building not found, creating it...')
    } else {
      console.error('Error checking building:', checkError)
      return NextResponse.json({ error: 'Error checking building', details: checkError }, { status: 500 })
    }

    // Create the building
    const buildingData = {
      id: buildingId,
      name: '5 Ashwood House',
      address: '5 Ashwood Road, London, SW2 7LF',
      unit_count: 1,
      notes: 'Test building created for document library testing',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { data: newBuilding, error: createError } = await supabase
      .from('buildings')
      .insert(buildingData)
      .select()
      .single()

    if (createError) {
      console.error('Failed to create building:', createError)
      return NextResponse.json({
        error: 'Failed to create building',
        details: createError,
        attempted: buildingData
      }, { status: 500 })
    }

    console.log('✅ Building created successfully:', newBuilding)

    // Also create a unit for completeness
    try {
      const { data: unit, error: unitError } = await supabase
        .from('units')
        .insert({
          building_id: buildingId,
          unit_number: '5',
          type: 'Flat',
          floor: 'Ground',
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (unitError) {
        console.warn('Could not create unit:', unitError)
      } else {
        console.log('✅ Unit created:', unit)
      }
    } catch (unitError) {
      console.warn('Unit creation failed:', unitError)
    }

    return NextResponse.json({
      success: true,
      message: 'Building created successfully',
      building: newBuilding
    })

  } catch (error) {
    console.error('❌ Error in test add building:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET() {
  try {
    const supabase = await createClient()
    const buildingId = '2beeec1d-a94e-4058-b881-213d74cc6830'

    const { data: building, error } = await supabase
      .from('buildings')
      .select('*')
      .eq('id', buildingId)
      .single()

    if (error) {
      return NextResponse.json({
        exists: false,
        error: error.message,
        buildingId
      })
    }

    return NextResponse.json({
      exists: true,
      building,
      buildingId
    })

  } catch (error) {
    return NextResponse.json({
      error: 'Failed to check building',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}