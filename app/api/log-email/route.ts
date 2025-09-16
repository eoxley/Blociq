import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logCommunication } from '@/lib/utils/communications-logger'

/**
 * 📨 Log Email API Endpoint
 * Accepts POST requests with email data and logs them to communications_log table
 * Automatically matches recipients to leaseholders and buildings
 */
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
      subject,
      body: emailBody,
      recipients = [],
      direction, // 'inbound' or 'outbound'
      userId,
      metadata = {}
    } = body

    // Validate required fields
    if (!direction || (direction !== 'inbound' && direction !== 'outbound')) {
      return NextResponse.json({
        error: 'Direction is required and must be either "inbound" or "outbound"'
      }, { status: 400 })
    }

    if (!emailBody) {
      return NextResponse.json({
        error: 'Email body is required'
      }, { status: 400 })
    }

    console.log('📧 Processing email log request:', {
      subject,
      direction,
      recipientCount: recipients.length
    })

    let building_id: string | undefined
    let leaseholder_id: string | undefined
    let matchedLeaseholder = null

    // MATCHING LOGIC: Try to find leaseholder and building from recipients
    if (recipients.length > 0) {
      console.log('🔍 Matching recipients to leaseholders...')

      for (const recipient of recipients) {
        const email = typeof recipient === 'string' ? recipient : recipient.email

        if (!email) continue

        console.log('🔍 Searching for leaseholder with email:', email)

        // Search for leaseholder by email
        const { data: leaseholder, error } = await supabase
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
          .eq('email', email)
          .single()

        if (!error && leaseholder) {
          console.log('✅ Found matching leaseholder:', leaseholder.name)

          leaseholder_id = leaseholder.id
          matchedLeaseholder = leaseholder

          // Get building from unit relationship
          if (leaseholder.units?.building_id) {
            building_id = leaseholder.units.building_id
            console.log('✅ Linked to building:', leaseholder.units.building?.name)
          }

          break // Stop on first match
        }
      }

      if (!leaseholder_id) {
        console.log('⚠️ No matching leaseholder found for any recipient')
        // Store record with null but log it
      }
    }

    // Log the communication using our utility function
    const loggedCommunication = await logCommunication({
      building_id,
      leaseholder_id,
      user_id: userId || session.user.id,
      direction,
      subject,
      body: emailBody,
      metadata: {
        recipients,
        matched_leaseholder: matchedLeaseholder?.name,
        matched_building: matchedLeaseholder?.units?.building?.name,
        original_metadata: metadata
      }
    })

    if (!loggedCommunication) {
      return NextResponse.json({
        error: 'Failed to log communication'
      }, { status: 500 })
    }

    console.log('✅ Email logged successfully:', loggedCommunication.id)

    return NextResponse.json({
      success: true,
      id: loggedCommunication.id,
      matched: {
        leaseholder_id,
        building_id,
        leaseholder_name: matchedLeaseholder?.name,
        building_name: matchedLeaseholder?.units?.building?.name
      }
    })

  } catch (error) {
    console.error('❌ Error logging email:', error)
    return NextResponse.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * GET endpoint to retrieve email logs
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
    const direction = searchParams.get('direction')
    const limit = parseInt(searchParams.get('limit') || '50')

    let query = supabase
      .from('communications_log')
      .select(`
        *,
        building:buildings(id, name, address),
        leaseholder:leaseholders(id, name, email),
        user:users(email)
      `)
      .order('sent_at', { ascending: false })
      .limit(limit)

    // Apply filters
    if (building_id) {
      query = query.eq('building_id', building_id)
    }
    if (leaseholder_id) {
      query = query.eq('leaseholder_id', leaseholder_id)
    }
    if (direction && (direction === 'inbound' || direction === 'outbound')) {
      query = query.eq('direction', direction)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching email logs:', error)
      return NextResponse.json(
        { error: 'Failed to fetch email logs' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: data || [],
      total: data?.length || 0
    })

  } catch (error) {
    console.error('Error in email log GET API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}