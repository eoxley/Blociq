/**
 * BSA Compliance Confirmation Route
 * Handles user confirmation/override of AI classification
 * Updates compliance_logs with user decisions for audit trail
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { BSAComplianceStatus } from '@/lib/compliance/bsa-analyzers'
import { updateComplianceTaskStatus } from '@/lib/outlook/compliance-integrations'

export async function POST(request: NextRequest) {
  try {
    const {
      complianceLogId,
      buildingComplianceAssetId,
      confirmed,
      overrideData,
      outlookTaskId
    } = await request.json()

    if (!complianceLogId || !buildingComplianceAssetId) {
      return NextResponse.json(
        { error: 'Missing required fields: complianceLogId, buildingComplianceAssetId' },
        { status: 400 }
      )
    }

    const supabase = createClient()

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const timestamp = new Date().toISOString()

    if (confirmed) {
      // User confirmed AI classification
      console.log(`✅ User confirmed AI classification for compliance log: ${complianceLogId}`)

      // Update compliance_logs with user confirmation
      const { error: logUpdateError } = await supabase
        .from('compliance_logs')
        .update({
          user_confirmed: true,
          updated_at: timestamp
        })
        .eq('id', complianceLogId)

      if (logUpdateError) {
        console.error('Failed to update compliance log:', logUpdateError)
        return NextResponse.json(
          { error: 'Failed to update compliance log' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        action: 'confirmed',
        message: 'AI classification confirmed successfully'
      })

    } else if (overrideData) {
      // User overrode AI classification
      console.log(`🔄 User overriding AI classification for compliance log: ${complianceLogId}`)

      // Get current compliance log to preserve audit trail
      const { data: currentLog, error: getCurrentError } = await supabase
        .from('compliance_logs')
        .select('*')
        .eq('id', complianceLogId)
        .single()

      if (getCurrentError || !currentLog) {
        return NextResponse.json(
          { error: 'Compliance log not found' },
          { status: 404 }
        )
      }

      // Update compliance_logs with override information
      const { error: logUpdateError } = await supabase
        .from('compliance_logs')
        .update({
          user_confirmed: true,
          compliance_status: overrideData.status,
          previous_status: currentLog.compliance_status,
          status_change_reason: `User override: ${overrideData.reason}`,
          user_override: {
            original_status: currentLog.compliance_status,
            override_status: overrideData.status,
            override_reason: overrideData.reason,
            override_notes: overrideData.notes || null,
            override_by: user.id,
            override_at: timestamp
          },
          updated_at: timestamp
        })
        .eq('id', complianceLogId)

      if (logUpdateError) {
        console.error('Failed to update compliance log with override:', logUpdateError)
        return NextResponse.json(
          { error: 'Failed to update compliance log' },
          { status: 500 }
        )
      }

      // Update building_compliance_assets with new status
      const { error: assetUpdateError } = await supabase
        .from('building_compliance_assets')
        .update({
          status: overrideData.status,
          updated_at: timestamp
        })
        .eq('id', buildingComplianceAssetId)

      if (assetUpdateError) {
        console.error('Failed to update building compliance asset:', assetUpdateError)
        // Continue even if asset update fails
      }

      // Update Outlook task if one was created
      if (outlookTaskId) {
        try {
          const taskCompleted = overrideData.status === 'compliant'
          await updateComplianceTaskStatus(
            outlookTaskId,
            taskCompleted,
            `Status updated by user: ${overrideData.status}. Reason: ${overrideData.reason}`
          )
          console.log(`✅ Outlook task ${outlookTaskId} updated`)
        } catch (outlookError) {
          console.warn('Failed to update Outlook task:', outlookError)
          // Continue even if Outlook update fails
        }
      }

      // Create new action in building_todos if status changed to require action
      if (overrideData.status === 'non_compliant' ||
          overrideData.status === 'remedial_action_pending' ||
          overrideData.status === 'expired') {

        try {
          const { error: todoError } = await supabase
            .from('building_action_tracker')
            .insert({
              building_id: currentLog.building_id,
              item_text: `User override: ${overrideData.reason}`,
              priority: overrideData.status === 'non_compliant' ? 'high' : 'medium',
              notes: `Status changed from ${currentLog.compliance_status} to ${overrideData.status}. ${overrideData.notes || ''}`,
              completed: false,
              source: 'User Override',
              created_by: user.id
            })

          if (todoError) {
            console.warn('Failed to create override action:', todoError)
          } else {
            console.log('✅ Created new action for user override')
          }
        } catch (todoCreateError) {
          console.warn('Error creating override action:', todoCreateError)
        }
      }

      return NextResponse.json({
        success: true,
        action: 'overridden',
        newStatus: overrideData.status,
        message: 'Classification overridden successfully'
      })

    } else {
      return NextResponse.json(
        { error: 'Either confirmed must be true or overrideData must be provided' },
        { status: 400 }
      )
    }

  } catch (error) {
    console.error('Error processing compliance confirmation:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}