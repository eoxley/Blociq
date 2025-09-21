/**
 * Major Works Section 20 Confirmation Route
 * Handles user confirmation/override of AI Section 20 classification
 * Updates major_works_logs with user decisions for audit trail
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Section20Stage } from '@/lib/major-works/section20-analyzers'
import { updateComplianceTaskStatus } from '@/lib/outlook/compliance-integrations'

export async function POST(request: NextRequest) {
  try {
    const {
      documentId,
      projectId,
      confirmed,
      overrideData,
      outlookCalendarId,
      outlookTaskId,
      outlookEmailId
    } = await request.json()

    if (!documentId) {
      return NextResponse.json(
        { error: 'Missing required field: documentId' },
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
      console.log(`✅ User confirmed Section 20 classification for document: ${documentId}`)

      // Update document metadata to mark as confirmed
      const { error: docUpdateError } = await supabase
        .from('building_documents')
        .update({
          metadata: supabase.raw(`
            COALESCE(metadata, '{}'::jsonb) || '{"user_confirmed": true, "confirmed_at": "${timestamp}", "confirmed_by": "${user.id}"}'::jsonb
          `)
        })
        .eq('id', documentId)

      if (docUpdateError) {
        console.error('Failed to update document metadata:', docUpdateError)
        return NextResponse.json(
          { error: 'Failed to update document confirmation' },
          { status: 500 }
        )
      }

      // Log confirmation in major_works_logs if project exists
      if (projectId) {
        try {
          const { error: logError } = await supabase
            .from('major_works_logs')
            .insert({
              project_id: projectId,
              action: 'AI classification confirmed',
              description: `User confirmed AI Section 20 classification for document ${documentId}`,
              document_id: documentId,
              user_id: user.id,
              metadata: {
                action_type: 'user_confirmation',
                confirmed_at: timestamp,
                outlook_integration: {
                  calendar_event_id: outlookCalendarId,
                  task_id: outlookTaskId,
                  email_draft_id: outlookEmailId
                }
              }
            })

          if (logError) {
            console.warn('Failed to create major works log:', logError)
          }
        } catch (logCreateError) {
          console.warn('Error creating major works log:', logCreateError)
        }
      }

      return NextResponse.json({
        success: true,
        action: 'confirmed',
        message: 'Section 20 classification confirmed successfully'
      })

    } else if (overrideData) {
      // User overrode AI classification
      console.log(`🔄 User overriding Section 20 classification for document: ${documentId}`)

      // Get current document to preserve original analysis
      const { data: currentDoc, error: getDocError } = await supabase
        .from('building_documents')
        .select('metadata')
        .eq('id', documentId)
        .single()

      if (getDocError || !currentDoc) {
        return NextResponse.json(
          { error: 'Document not found' },
          { status: 404 }
        )
      }

      // Update document with override information
      const originalMetadata = currentDoc.metadata || {}
      const updatedMetadata = {
        ...originalMetadata,
        user_confirmed: true,
        user_override: {
          original_stage: originalMetadata.section20_stage,
          override_stage: overrideData.stage,
          override_project_title: overrideData.projectTitle,
          override_reason: overrideData.reason,
          override_notes: overrideData.notes || null,
          override_by: user.id,
          override_at: timestamp
        },
        section20_stage: overrideData.stage,
        project_title: overrideData.projectTitle || originalMetadata.project_title,
        confirmed_at: timestamp,
        confirmed_by: user.id
      }

      const { error: docUpdateError } = await supabase
        .from('building_documents')
        .update({
          metadata: updatedMetadata
        })
        .eq('id', documentId)

      if (docUpdateError) {
        console.error('Failed to update document with override:', docUpdateError)
        return NextResponse.json(
          { error: 'Failed to update document override' },
          { status: 500 }
        )
      }

      // Update project status if override affects project stage
      if (projectId && overrideData.stage !== originalMetadata.section20_stage) {
        try {
          let newProjectStatus = 'planning'
          switch (overrideData.stage) {
            case 'notice_of_intention':
              newProjectStatus = 'notice_of_intention'
              break
            case 'statement_of_estimates':
              newProjectStatus = 'statement_of_estimates'
              break
            case 'award_of_contract':
              newProjectStatus = 'contractor_appointed'
              break
          }

          const { error: projectUpdateError } = await supabase
            .from('major_works_projects')
            .update({
              status: newProjectStatus,
              title: overrideData.projectTitle || undefined
            })
            .eq('id', projectId)

          if (projectUpdateError) {
            console.warn('Failed to update project status:', projectUpdateError)
          }
        } catch (projectUpdateError) {
          console.warn('Error updating project:', projectUpdateError)
        }
      }

      // Update Outlook task if one was created
      if (outlookTaskId) {
        try {
          await updateComplianceTaskStatus(
            outlookTaskId,
            false, // Not completed, just updated
            `Stage updated by user: ${overrideData.stage}. Reason: ${overrideData.reason}`
          )
          console.log(`✅ Outlook task ${outlookTaskId} updated`)
        } catch (outlookError) {
          console.warn('Failed to update Outlook task:', outlookError)
        }
      }

      // Log override in major_works_logs
      if (projectId) {
        try {
          const { error: logError } = await supabase
            .from('major_works_logs')
            .insert({
              project_id: projectId,
              action: 'AI classification overridden',
              description: `User overrode Section 20 classification from ${originalMetadata.section20_stage} to ${overrideData.stage}. Reason: ${overrideData.reason}`,
              document_id: documentId,
              user_id: user.id,
              metadata: {
                action_type: 'user_override',
                original_stage: originalMetadata.section20_stage,
                new_stage: overrideData.stage,
                override_reason: overrideData.reason,
                override_notes: overrideData.notes,
                override_at: timestamp,
                outlook_integration: {
                  calendar_event_id: outlookCalendarId,
                  task_id: outlookTaskId,
                  email_draft_id: outlookEmailId
                }
              }
            })

          if (logError) {
            console.warn('Failed to create override log:', logError)
          }
        } catch (logCreateError) {
          console.warn('Error creating override log:', logCreateError)
        }
      }

      return NextResponse.json({
        success: true,
        action: 'overridden',
        newStage: overrideData.stage,
        newProjectTitle: overrideData.projectTitle,
        message: 'Section 20 classification overridden successfully'
      })

    } else {
      return NextResponse.json(
        { error: 'Either confirmed must be true or overrideData must be provided' },
        { status: 400 }
      )
    }

  } catch (error) {
    console.error('Error processing Major Works confirmation:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}