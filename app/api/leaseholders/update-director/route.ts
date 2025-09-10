import { createClient } from '@/utils/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  const supabase = createClient(cookies())
  
  // Check authentication
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()
  if (sessionError || !session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { leaseholder_id, director_since, director_notes } = body

    const { error } = await supabase
      .from('leaseholders')
      .update({
        director_since,
        director_notes,
        updated_at: new Date().toISOString()
      })
      .eq('id', leaseholder_id)

    if (error) {
      console.error('Error updating leaseholder director information:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error in update director API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 