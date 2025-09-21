import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get building_id from query params
    const { searchParams } = new URL(request.url)
    const buildingId = searchParams.get('building_id')

    let query = supabase
      .from('building_documents')
      .select(`
        id,
        name,
        file_path,
        category,
        type,
        file_size,
        uploaded_by,
        uploaded_at,
        building_id,
        ocr_status,
        ocr_text,
        metadata
      `)
      .order('uploaded_at', { ascending: false })

    // Filter by building_id if provided
    if (buildingId) {
      query = query.eq('building_id', buildingId)
    }

    const { data: documents, error } = await query

    if (error) {
      console.error('Error fetching building documents:', error)
      return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 400 })
    }

    return NextResponse.json(documents || [])

  } catch (error) {
    console.error('Unexpected error in /api/building_documents:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { building_id, name, file_path, category, type, file_size, metadata } = body

    if (!building_id || !name || !file_path) {
      return NextResponse.json({
        error: 'Missing required fields: building_id, name, file_path'
      }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('building_documents')
      .insert({
        building_id,
        name,
        file_path,
        category: category || 'other',
        type: type || 'unknown',
        file_size: file_size || 0,
        uploaded_by: user.email || user.id,
        uploaded_at: new Date().toISOString(),
        ocr_status: 'pending',
        metadata: metadata || {}
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating building document:', error)
      return NextResponse.json({ error: 'Failed to create document' }, { status: 400 })
    }

    return NextResponse.json(data)

  } catch (error) {
    console.error('Unexpected error in /api/building_documents POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}