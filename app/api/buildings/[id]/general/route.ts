import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const buildingId = params.id

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(buildingId)) {
      return NextResponse.json({ error: 'Invalid building ID format' }, { status: 400 })
    }

    // Get building basic information
    const { data: building, error: buildingError } = await supabase
      .from('buildings')
      .select('*')
      .eq('id', buildingId)
      .single()

    if (buildingError) {
      console.error('Error fetching building:', buildingError)
      return NextResponse.json({ error: 'Building not found' }, { status: 404 })
    }

    // Get building setup information
    const { data: buildingSetup } = await supabase
      .from('building_setup')
      .select('*')
      .eq('building_id', buildingId)
      .maybeSingle()

    // Get units count
    const { count: unitsCount } = await supabase
      .from('units')
      .select('*', { count: 'exact', head: true })
      .eq('building_id', buildingId)

    // Get documents count
    const { count: documentsCount } = await supabase
      .from('building_documents')
      .select('*', { count: 'exact', head: true })
      .eq('building_id', buildingId)

    return NextResponse.json({
      building,
      setup: buildingSetup,
      stats: {
        unitsCount: unitsCount || 0,
        documentsCount: documentsCount || 0,
        hasSetup: !!buildingSetup,
        isHrb: building.is_hrb || false
      }
    })

  } catch (error) {
    console.error('Unexpected error in general building endpoint:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}