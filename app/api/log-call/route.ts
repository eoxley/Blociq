import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Check authentication
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { leaseholder_id, building_id, notes, call_duration, call_outcome } = await req.json()

    if (!leaseholder_id) {
      return NextResponse.json({ error: 'Leaseholder ID is required' }, { status: 400 })
    }

    // Log the phone call to communications_log
    const { data, error } = await supabase
      .from('communications_log')
      .insert({
        leaseholder_id,
        building_id,
        type: 'call',
        subject: 'Phone Call',
        content: notes || 'Phone call logged',
        status: 'complete', // Phone calls are immediately complete
        call_duration: call_duration || null,
        call_outcome: call_outcome || null,
        created_at: new Date().toISOString()
      })

    if (error) {
      console.error('Error logging phone call:', error)
      return NextResponse.json({ error: 'Failed to log phone call' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Phone call logged successfully',
      data 
    })

  } catch (error) {
    console.error('Error in log-call API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 