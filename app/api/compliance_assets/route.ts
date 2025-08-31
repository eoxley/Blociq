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
    const category = searchParams.get('category')
    const isRequired = searchParams.get('is_required')
    const isHrbRelated = searchParams.get('is_hrb_related')

    let query = supabase
      .from('compliance_assets')
      .select('*')

    // Apply filters if provided
    if (category) {
      query = query.eq('category', category)
    }
    if (isRequired !== null) {
      query = query.eq('is_required', isRequired === 'true')
    }
    if (isHrbRelated !== null) {
      query = query.eq('is_hrb_related', isHrbRelated === 'true')
    }

    const { data: assets, error } = await query
      .order('category', { ascending: true })
      .order('name', { ascending: true })

    if (error) {
      console.error('Error fetching compliance assets:', error)
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
    console.error('Error in compliance_assets API:', error)
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
    const { name, category, description, frequency_months, is_required, is_hrb_related } = body

    if (!name || !category) {
      return NextResponse.json(
        { error: 'Missing required fields: name and category' },
        { status: 400 }
      )
    }

    const supabase = createClient(cookies())

    const { data, error } = await supabase
      .from('compliance_assets')
      .insert({
        name,
        category,
        description: description || '',
        frequency_months: frequency_months || 12,
        is_required: is_required || false,
        is_hrb_related: is_hrb_related || false
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating compliance asset:', error)
      return NextResponse.json(
        { error: 'Failed to create compliance asset' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data })

  } catch (error) {
    console.error('Error in compliance_assets POST API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
