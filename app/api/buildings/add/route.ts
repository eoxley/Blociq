import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Check authentication
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, address, unit_count } = body

    if (!name) {
      return NextResponse.json({ error: 'Building name is required' }, { status: 400 })
    }

    // Insert the building
    const { data, error } = await supabase
      .from('buildings')
      .insert([
        {
          name,
          address: address || null,
          unit_count: unit_count || null,
          created_at: new Date().toISOString()
        }
      ])
      .select()

    if (error) {
      console.error('Error inserting building:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, building: data[0] })
  } catch (error) {
    console.error('Error in add building route:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 