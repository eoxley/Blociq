import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logCommunication } from '@/lib/utils/communications-logger'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()

    // Check authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    if (authError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      to_email,
      subject,
      content,
      leaseholder_id,
      leaseholder_name,
      building_id,
      building_name,
      unit_number,
      is_bulk = false
    } = body

    // Validate required fields
    if (!to_email || !subject || !content) {
      return NextResponse.json(
        { error: 'Missing required fields: to_email, subject, content' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(to_email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // For now, we'll simulate sending the email
    // In a real implementation, you would integrate with an email service
    console.log('📧 Sending email:', {
      to: to_email,
      subject,
      content: content.substring(0, 100) + '...',
      is_bulk
    })

    // Log the outbound communication using the new logging system
    await logCommunication({
      building_id: building_id,
      leaseholder_id: leaseholder_id,
      user_id: session.user.id,
      direction: 'outbound',
      subject: subject,
      body: content,
      metadata: {
        to_email,
        leaseholder_name,
        building_name,
        unit_number,
        is_bulk,
        email_type: 'standard_communication'
      }
    })

    // Simulate email sending delay
    await new Promise(resolve => setTimeout(resolve, 1000))

    return NextResponse.json({
      success: true,
      message: 'Email sent successfully',
      data: {
        to_email,
        subject,
        sent_at: new Date().toISOString(),
        message_id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      }
    })

  } catch (error) {
    console.error('Error in send email API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    
    // Check authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    if (authError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const leaseholder_id = searchParams.get('leaseholder_id')
    const building_id = searchParams.get('building_id')

    // Get leaseholders for email sending
    let query = supabase
      .from('leaseholders')
      .select(`
        id,
        name,
        email,
        phone,
        unit_id,
        unit:units(
          unit_number,
          building:buildings(
            id,
            name,
            address
          )
        )
      `)
      .not('email', 'is', null) // Only leaseholders with emails

    if (leaseholder_id) {
      query = query.eq('id', leaseholder_id)
    }

    if (building_id) {
      query = query.eq('unit.building.id', building_id)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching leaseholders for email:', error)
      return NextResponse.json(
        { error: 'Failed to fetch leaseholders' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: data || [],
      total: data?.length || 0
    })

  } catch (error) {
    console.error('Error in send email GET API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 