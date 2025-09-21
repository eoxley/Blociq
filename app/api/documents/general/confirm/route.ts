import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { document_id, user_confirmed, ai_classification, user_override } = await request.json()

    if (!document_id) {
      return NextResponse.json(
        { error: 'Document ID is required' },
        { status: 400 }
      )
    }

    const supabase = createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get current document to preserve existing metadata
    const { data: existingDoc, error: fetchError } = await supabase
      .from('building_documents')
      .select('metadata, document_type')
      .eq('id', document_id)
      .single()

    if (fetchError) {
      console.error('❌ Failed to fetch document:', fetchError)
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    // Update document with user confirmation and override if provided
    const finalDocumentType = user_override?.document_type || existingDoc.document_type
    const updatedMetadata = {
      ...existingDoc.metadata,
      user_confirmed,
      confirmed_by: user.id,
      confirmed_at: new Date().toISOString(),
      ai_classification: ai_classification,
      user_override: user_override || null
    }

    const { error: updateError } = await supabase
      .from('building_documents')
      .update({
        document_type: finalDocumentType,
        metadata: updatedMetadata
      })
      .eq('id', document_id)

    if (updateError) {
      console.error('❌ Failed to update document confirmation:', updateError)
      return NextResponse.json(
        { error: 'Failed to save confirmation' },
        { status: 500 }
      )
    }

    // Log the confirmation action with both AI suggestion and user decision
    try {
      await supabase
        .from('document_logs')
        .insert({
          document_id,
          user_id: user.id,
          action: user_confirmed ? 'classification_confirmed' : 'classification_overridden',
          document_type: finalDocumentType,
          ai_analysis: {
            ai_suggested: ai_classification,
            user_confirmed,
            user_override,
            final_classification: finalDocumentType
          },
          created_at: new Date().toISOString()
        })
    } catch (logError) {
      console.warn('⚠️ Failed to log confirmation action:', logError)
      // Don't fail the request if logging fails
    }

    // If user overrode the classification, trigger additional automation for new document type
    if (user_override && user_override.document_type !== ai_classification) {
      try {
        await triggerDocumentTypeAutomation(supabase, document_id, user_override, user.id)
      } catch (automationError) {
        console.warn('⚠️ Override automation trigger failed:', automationError)
        // Don't fail the request if automation fails
      }
    }

    return NextResponse.json({
      success: true,
      confirmed: user_confirmed,
      final_document_type: finalDocumentType,
      message: user_confirmed
        ? 'Classification confirmed and document filed successfully'
        : user_override
        ? `Document reclassified as ${finalDocumentType} and filed successfully`
        : 'Document marked for manual review'
    })

  } catch (error) {
    console.error('❌ Confirmation error:', error)
    return NextResponse.json(
      {
        error: 'Failed to process confirmation',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Trigger additional automation when user overrides document type
async function triggerDocumentTypeAutomation(supabase: any, documentId: string, userOverride: any, userId: string) {
  const documentType = userOverride.document_type

  // Get document details for context
  const { data: document } = await supabase
    .from('building_documents')
    .select('building_id, file_name, metadata')
    .eq('id', documentId)
    .single()

  if (!document) return

  const buildingId = document.building_id
  const filename = document.file_name
  const metadata = document.metadata

  // Create appropriate Outlook integration based on new classification
  switch (documentType) {
    case 'insurance_policy':
      if (userOverride.expiry_date) {
        await supabase
          .from('outlook_calendar_events')
          .insert({
            title: `📅 Building ${buildingId} Insurance Renewal (User Reclassified)`,
            description: `Insurance policy expires today. Originally classified differently by AI but corrected by user.\n\nDocument: ${filename}`,
            start_time: userOverride.expiry_date,
            reminder_minutes: [43200, 10080], // 30 days and 7 days before
            building_id: buildingId,
            created_by: userId,
            event_type: 'insurance_renewal_override'
          })
      }
      break

    case 'contract':
      const reviewDate = new Date()
      reviewDate.setDate(reviewDate.getDate() + 14)

      await supabase
        .from('outlook_tasks')
        .insert({
          title: `Review Contract – ${userOverride.contractor || 'Unknown'} (User Reclassified)`,
          description: `Contract was reclassified by user. Please review terms and conditions.\n\nDocument: ${filename}`,
          due_date: userOverride.expiry_date || reviewDate.toISOString().split('T')[0],
          priority: 'normal',
          building_id: buildingId,
          assigned_to: userId,
          task_type: 'contract_review_override'
        })
      break

    case 'meeting_minutes':
      await supabase
        .from('outlook_email_drafts')
        .insert({
          to_recipients: ['directors@building.com'],
          subject: `Minutes (User Reclassified) – Building ${buildingId}`,
          body: `Document was reclassified as meeting minutes by user.\n\nPlease review: ${filename}\n\nOriginal classification was different but has been corrected.`,
          building_id: buildingId,
          created_by: userId,
          draft_type: 'meeting_minutes_override'
        })
      break
  }
}