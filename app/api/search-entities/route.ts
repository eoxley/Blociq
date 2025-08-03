import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

// ✅ VERIFIED: Used by SmartSearch component on homepage
export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json()
    
    // 🔴 VALIDATION: Check for required fields
    if (!query || typeof query !== 'string' || query.trim().length < 2) {
      return NextResponse.json({ 
        error: 'Query must be at least 2 characters long' 
      }, { status: 400 })
    }

    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    // 🔴 SECURITY: Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchQuery = `%${query.trim()}%`
    const results: any[] = []

    // Search buildings
    const { data: buildings, error: buildingsError } = await supabase
      .from('buildings')
      .select('id, name')
      .ilike('name', searchQuery)
      .limit(5)

    if (buildingsError) {
      console.error('Error searching buildings:', buildingsError)
      // Continue with other searches even if buildings fail
    } else if (buildings) {
      buildings.forEach(building => {
        results.push({
          id: building.id.toString(),
          label: `${building.name} – Building`,
          type: 'building',
          building_id: building.id.toString()
        })
      })
    }

    // Search leaseholders
    const { data: leaseholders, error: leaseholdersError } = await supabase
      .from('leaseholders')
      .select('id, name, building_id, buildings(name)')
      .ilike('name', searchQuery)
      .limit(5)

    if (leaseholdersError) {
      console.error('Error searching leaseholders:', leaseholdersError)
      // Continue with other searches even if leaseholders fail
    } else if (leaseholders) {
      leaseholders.forEach(leaseholder => {
        const buildingName = leaseholder.buildings?.name || 'Unknown Building'
        results.push({
          id: leaseholder.id.toString(),
          label: `${leaseholder.name} – Leaseholder`,
          type: 'leaseholder',
          building_id: leaseholder.building_id?.toString()
        })
      })
    }

    // Search units
    const { data: units, error: unitsError } = await supabase
      .from('units')
      .select('id, unit_number, building_id, buildings(name)')
      .ilike('unit_number', searchQuery)
      .limit(5)

    if (unitsError) {
      console.error('Error searching units:', unitsError)
      // Continue with other searches even if units fail
    } else if (units) {
      units.forEach(unit => {
        const buildingName = unit.buildings?.name || 'Unknown Building'
        results.push({
          id: unit.id.toString(),
          label: `${unit.unit_number} – Unit (${buildingName})`,
          type: 'unit',
          building_id: unit.building_id?.toString()
        })
      })
    }

    // Sort results by relevance (exact matches first, then partial matches)
    results.sort((a, b) => {
      const aExact = a.label.toLowerCase().includes(query.toLowerCase())
      const bExact = b.label.toLowerCase().includes(query.toLowerCase())
      
      if (aExact && !bExact) return -1
      if (!aExact && bExact) return 1
      return 0
    })

    // Limit total results to 15
    const limitedResults = results.slice(0, 15)

    return NextResponse.json({ 
      results: limitedResults,
      total: limitedResults.length
    })

  } catch (error) {
    console.error('Search entities error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
} 