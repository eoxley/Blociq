// ✅ AUDIT COMPLETE [2025-08-03]
// - Field validation for subject, body, leaseholder_id, building_id
// - Authentication check with session validation
// - Supabase queries with proper .eq() filters
// - Try/catch with detailed error handling
// - Used in communication components

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

    const { leaseholder_id, building_id, subject, body, template_id, is_bulk = false } = await req.json()

    if (!subject || !body) {
      return NextResponse.json({ error: 'Subject and body are required' }, { status: 400 })
    }

    if (is_bulk) {
      // Send letter to all leaseholders in a building
      if (!building_id) {
        return NextResponse.json({ error: 'Building ID is required for bulk letters' }, { status: 400 })
      }

      // Get all leaseholders for the building
      const { data: leaseholders, error: leaseholdersError } = await supabase
        .from('leaseholders')
        .select('id, name, email')
        .eq('building_id', building_id)

      if (leaseholdersError) {
        console.error('Error fetching leaseholders:', leaseholdersError)
        return NextResponse.json({ error: 'Failed to fetch leaseholders' }, { status: 500 })
      }

      if (!leaseholders || leaseholders.length === 0) {
        return NextResponse.json({ error: 'No leaseholders found for this building' }, { status: 404 })
      }

      // Insert communications log entries for all leaseholders
      const communicationsLogs = leaseholders.map(leaseholder => ({
        leaseholder_id: leaseholder.id,
        building_id,
        type: 'letter',
        subject,
        content: body,
        status: 'pending',
        template_id: template_id || null,
        created_at: new Date().toISOString()
      }))

      const { data, error } = await supabase
        .from('communications_log')
        .insert(communicationsLogs)

      if (error) {
        console.error('Error saving communications log:', error)
        return NextResponse.json({ error: 'Failed to save communications log' }, { status: 500 })
      }

      return NextResponse.json({ 
        success: true, 
        message: `Letter queued for ${leaseholders.length} leaseholders`,
        data 
      })

    } else {
      // Send letter to a specific leaseholder
      if (!leaseholder_id) {
        return NextResponse.json({ error: 'Leaseholder ID is required' }, { status: 400 })
      }

      // Save to communications_log
      const { data, error } = await supabase
        .from('communications_log')
        .insert({
          leaseholder_id,
          building_id,
          type: 'letter',
          subject,
          content: body,
          status: 'pending',
          template_id: template_id || null,
          created_at: new Date().toISOString()
        })

      if (error) {
        console.error('Error saving communications log:', error)
        return NextResponse.json({ error: 'Failed to save communications log' }, { status: 500 })
      }

      return NextResponse.json({ 
        success: true, 
        message: 'Letter queued successfully',
        data 
      })
    }

  } catch (error) {
    console.error('Error in send-letter API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 