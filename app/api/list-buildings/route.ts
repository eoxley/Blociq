// ✅ AUDIT COMPLETE [2025-08-03]
// - Authentication check with session validation
// - Supabase query with proper error handling
// - Try/catch with detailed error handling
// - Used in building list components

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

    console.log('🔍 Listing all buildings...')

    // Fetch all buildings
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

    console.log('📋 Buildings found:', buildings)

    return NextResponse.json({
      success: true,
      count: buildings?.length || 0,
      buildings: buildings || []
    })

  } catch (error) {
    console.error('❌ List buildings error:', error)
    return NextResponse.json({ 
      error: 'Unexpected error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 