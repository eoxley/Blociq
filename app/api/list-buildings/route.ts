// ✅ AUDIT COMPLETE [2025-08-03]
// - Authentication check with session validation
// - Supabase query with proper error handling
// - Try/catch with detailed error handling
// - Used in building list components
// ✅ UPDATED [2025-01-27] - Dynamic unit count calculation

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()

    // Test authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.error('Authentication error in list-buildings:', authError)
      return NextResponse.json({
        success: false,
        error: 'Not authenticated',
        buildings: []
      }, { status: 401 })
    }

    console.log('🔍 Listing all buildings with dynamic unit counts...')

    // Fetch all buildings (excluding unit_count field)
    const { data: buildings, error: buildingsError } = await supabase
      .from('buildings')
      .select('id, name, address, created_at')
      .order('name')

    if (buildingsError) {
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch buildings',
        details: buildingsError,
        buildings: []  // Always provide empty array even on error
      }, { status: 500 })
    }

    // Calculate unit counts dynamically for each building with better error handling
    const buildingsWithUnitCounts = await Promise.allSettled(
      (buildings || []).map(async (building) => {
        try {
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
        } catch (error) {
          console.error(`❌ Exception counting units for building ${building.id}:`, error)
          return {
            ...building,
            unit_count: 0 // Fallback to 0 if exception occurs
          }
        }
      })
    )

    // Process settled promises and extract successful results
    const processedBuildings = buildingsWithUnitCounts
      .map(result => {
        if (result.status === 'fulfilled') {
          return result.value
        } else {
          console.error('❌ Promise rejected for building unit count:', result.reason)
          return null
        }
      })
      .filter(building => building !== null)

    console.log('📋 Buildings found with dynamic unit counts:', processedBuildings)

    // Ensure we always return an array
    const safeBuildings = Array.isArray(processedBuildings) ? processedBuildings : []

    return NextResponse.json({
      success: true,
      count: safeBuildings.length,
      buildings: safeBuildings
    })

  } catch (error) {
    console.error('❌ List buildings error:', error)
    return NextResponse.json({
      success: false,
      error: 'Unexpected error',
      details: error instanceof Error ? error.message : 'Unknown error',
      buildings: []  // Always provide empty array even on error
    }, { status: 500 })
  }
} 