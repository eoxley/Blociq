import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(cookies())
    
    // Check authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    if (authError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      type,
      leaseholder_id,
      leaseholder_name,
      building_name,
      unit_number,
      subject,
      content,
      status = 'sent'
    } = body

    // Validate required fields
    if (!type || !leaseholder_id || !leaseholder_name || !subject) {
      return NextResponse.json(
        { error: 'Missing required fields: type, leaseholder_id, leaseholder_name, subject' },
        { status: 400 }
      )
    }

    // Validate type
    if (!['call', 'email', 'letter'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid communication type. Must be call, email, or letter' },
        { status: 400 }
      )
    }

    // Insert communication log
    const { data, error } = await supabase
      .from('communications_log')
      .insert({
        type,
        leaseholder_id,
        leaseholder_name,
        building_name: building_name || 'Unknown',
        unit_number: unit_number || 'Unknown',
        subject,
        content: content || '',
        status,
        user_id: session.user.id,
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Error logging communication:', error)
      return NextResponse.json(
        { error: 'Failed to log communication' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Communication logged successfully',
      data
    })

  } catch (error) {
    console.error('Error in communications log API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(cookies())
    
    // Check authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    if (authError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const type = searchParams.get('type')
    const leaseholder_id = searchParams.get('leaseholder_id')
    const building_name = searchParams.get('building_name')

    // Build query
    let query = supabase
      .from('communications_log')
      .select('*')
      .order('created_at', { ascending: false })

    // Apply filters
    if (type) {
      query = query.eq('type', type)
    }
    if (leaseholder_id) {
      query = query.eq('leaseholder_id', leaseholder_id)
    }
    if (building_name) {
      query = query.ilike('building_name', `%${building_name}%`)
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data, error } = await query

    if (error) {
      console.error('Error fetching communications log:', error)
      return NextResponse.json(
        { error: 'Failed to fetch communications log' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data,
      pagination: {
        limit,
        offset,
        hasMore: data.length === limit
      }
    })

  } catch (error) {
    console.error('Error in communications log GET API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 