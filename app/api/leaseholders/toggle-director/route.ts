import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    const body = await request.json()
    const { leaseholder_id, is_director, director_since } = body

    const { error } = await supabase
      .from('leaseholders')
      .update({
        is_director,
        director_since: is_director ? director_since : null,
        updated_at: new Date().toISOString()
      })
      .eq('id', leaseholder_id)

    if (error) {
      console.error('Error updating leaseholder director status:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error in toggle director API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 