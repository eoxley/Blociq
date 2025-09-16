import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logCommunication } from '@/lib/utils/communications-logger'

/**
 * Handle inbound emails from webhooks (SendGrid, Mailgun, etc.)
 * This endpoint should be called by your email service when emails are received
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()

    const body = await request.json()
    const {
      from_email,
      from_name,
      to_email,
      subject,
      body_text,
      body_html,
      headers,
      attachments,
      webhook_source // 'sendgrid', 'mailgun', etc.
    } = body

    // Validate required fields
    if (!from_email || !subject) {
      return NextResponse.json(
        { error: 'Missing required fields: from_email, subject' },
        { status: 400 }
      )
    }

    console.log('📨 Processing inbound email:', {
      from: from_email,
      subject,
      to: to_email
    })

    // Try to identify the leaseholder from email
    const { data: leaseholder, error: leaseholderError } = await supabase
      .from('leaseholders')
      .select(`
        id,
        name,
        email,
        units(
          id,
          unit_number,
          building_id,
          building:buildings(
            id,
            name,
            address
          )
        )
      `)
      .eq('email', from_email)
      .single()

    let building_id: string | undefined
    let leaseholder_id: string | undefined

    if (!leaseholderError && leaseholder) {
      leaseholder_id = leaseholder.id
      building_id = leaseholder.units?.building_id

      console.log('✅ Identified leaseholder:', {
        leaseholder_id,
        building_id,
        leaseholder_name: leaseholder.name
      })
    } else {
      // Try to extract building/leaseholder info from email address or headers
      console.log('⚠️ Could not identify leaseholder from email:', from_email)

      // You could implement additional logic here to parse building info
      // from email address patterns, subject lines, or forwarding addresses
    }

    // Log the inbound communication
    const loggedCommunication = await logCommunication({
      building_id: building_id,
      leaseholder_id: leaseholder_id,
      direction: 'inbound',
      subject: subject,
      body: body_html || body_text || '',
      metadata: {
        from_email,
        from_name,
        to_email,
        webhook_source,
        headers: headers || {},
        attachments: attachments || [],
        leaseholder_name: leaseholder?.name,
        building_name: leaseholder?.units?.building?.name,
        unit_number: leaseholder?.units?.unit_number,
        raw_body_text: body_text,
        raw_body_html: body_html
      }
    })

    // If we couldn't identify the building/leaseholder, you might want to:
    // 1. Create a task for manual review
    // 2. Send an auto-reply asking for clarification
    // 3. Forward to a general inbox

    if (!building_id && !leaseholder_id) {
      console.log('📋 Creating task for manual review of unidentified email')

      // You could create a task or notification here
      // For now, we'll just log it
    }

    return NextResponse.json({
      success: true,
      message: 'Inbound email processed successfully',
      data: {
        communication_id: loggedCommunication?.id,
        leaseholder_identified: !!leaseholder_id,
        building_identified: !!building_id,
        leaseholder_id,
        building_id
      }
    })

  } catch (error) {
    console.error('Error processing inbound email:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * GET endpoint to retrieve recent inbound communications
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()

    // Check authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    if (authError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const building_id = searchParams.get('building_id')
    const leaseholder_id = searchParams.get('leaseholder_id')
    const limit = parseInt(searchParams.get('limit') || '50')

    let query = supabase
      .from('communications_log')
      .select(`
        *,
        building:buildings(id, name),
        leaseholder:leaseholders(id, name, email)
      `)
      .eq('direction', 'inbound')
      .order('sent_at', { ascending: false })
      .limit(limit)

    if (building_id) {
      query = query.eq('building_id', building_id)
    }

    if (leaseholder_id) {
      query = query.eq('leaseholder_id', leaseholder_id)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching inbound communications:', error)
      return NextResponse.json(
        { error: 'Failed to fetch inbound communications' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: data || [],
      total: data?.length || 0
    })

  } catch (error) {
    console.error('Error in inbound communications GET API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}