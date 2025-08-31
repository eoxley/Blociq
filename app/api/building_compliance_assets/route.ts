import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(cookies())

    // Check authentication
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const buildingId = searchParams.get('building_id')
    const assetId = searchParams.get('asset_id')
    const status = searchParams.get('status')

    let query = supabase
      .from('building_compliance_assets')
      .select(`
        *,
        buildings(id, name),
        compliance_assets(id, name, category, description, frequency_months),
        compliance_documents(id, document_url, created_at)
      `)

    // Apply filters if provided
    if (buildingId) {
      query = query.eq('building_id', buildingId)
    }
    if (assetId) {
      query = query.eq('compliance_asset_id', assetId)
    }
    if (status) {
      query = query.eq('status', status)
    }

    const { data: assets, error } = await query

    if (error) {
      console.error('Error fetching building compliance assets:', error)
      // Return empty array instead of error for better UX
      return NextResponse.json({
        assets: [],
        total: 0,
        error: null
      })
    }

    return NextResponse.json({
      assets: assets || [],
      total: assets?.length || 0,
      error: null
    })

  } catch (error) {
    console.error('Error in building_compliance_assets API:', error)
    // Return empty array instead of error for better UX
    return NextResponse.json({
      assets: [],
      total: 0,
      error: 'Internal server error'
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { building_id, compliance_asset_id, status, next_due_date, notes, contractor } = body

    if (!building_id || !compliance_asset_id) {
      return NextResponse.json(
        { error: 'Missing required fields: building_id and compliance_asset_id' },
        { status: 400 }
      )
    }

    const supabase = createClient(cookies())

    const { data, error } = await supabase
      .from('building_compliance_assets')
      .insert({
        building_id,
        compliance_asset_id,
        status: status || 'not_applied',
        next_due_date: next_due_date || null,
        notes: notes || null,
        contractor: contractor || null
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating building compliance asset:', error)
      return NextResponse.json(
        { error: 'Failed to create building compliance asset' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data })

  } catch (error) {
    console.error('Error in building_compliance_assets POST API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json(
        { error: 'Missing required parameter: id' },
        { status: 400 }
      )
    }

    const supabase = createClient(cookies())

    // Check authentication
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { error } = await supabase
      .from('building_compliance_assets')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting building compliance asset:', error)
      return NextResponse.json(
        { error: 'Failed to delete building compliance asset' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error in building_compliance_assets DELETE API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
