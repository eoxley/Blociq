// ✅ AUDIT COMPLETE [2025-08-03]
// - Authentication check with session validation
// - Supabase query with proper error handling
// - Try/catch with detailed error handling
// - Used in building list components
// ✅ UPDATED [2025-01-27] - Dynamic unit count calculation

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Test authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    if (authError || !session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    console.log('🔍 Listing all buildings with dynamic unit counts...')

    // Fetch all buildings (excluding unit_count field)
    const { data: buildings, error: buildingsError } = await supabase
      .from('buildings')
      .select('id, name, address, created_at')
      .order('name')

    if (buildingsError) {
      return NextResponse.json({ 
        error: 'Failed to fetch buildings', 
        details: buildingsError
      }, { status: 500 })
    }

    // Calculate unit counts dynamically for each building
    const buildingsWithUnitCounts = await Promise.all(
      (buildings || []).map(async (building) => {
        // Count units where unit_number is not null for this building
        const { count: unitCount, error: countError } = await supabase
          .from('units')
          .select('id', { count: 'exact', head: true })
          .eq('building_id', building.id)
          .not('unit_number', 'is', null)

        if (countError) {
          console.error(`❌ Error counting units for building ${building.id}:`, countError)
          return {
            ...building,
            unit_count: 0 // Fallback to 0 if count fails
          }
        }

        return {
          ...building,
          unit_count: unitCount || 0
        }
      })
    )

    console.log('📋 Buildings found with dynamic unit counts:', buildingsWithUnitCounts)

    return NextResponse.json({
      success: true,
      count: buildingsWithUnitCounts?.length || 0,
      buildings: buildingsWithUnitCounts || []
    })

  } catch (error) {
    console.error('❌ List buildings error:', error)
    return NextResponse.json({ 
      error: 'Unexpected error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 