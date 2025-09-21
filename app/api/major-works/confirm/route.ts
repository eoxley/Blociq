import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { document_id, user_confirmed, analysis } = await request.json()

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

    // Update document with user confirmation
    const { error: updateError } = await supabase
      .from('building_documents')
      .update({
        metadata: {
          ...analysis,
          user_confirmed,
          confirmed_by: user.id,
          confirmed_at: new Date().toISOString()
        }
      })
      .eq('id', document_id)

    if (updateError) {
      console.error('❌ Failed to update document confirmation:', updateError)
      return NextResponse.json(
        { error: 'Failed to save confirmation' },
        { status: 500 }
      )
    }

    // Log the confirmation action
    try {
      await supabase
        .from('major_works_logs')
        .insert({
          document_id,
          user_id: user.id,
          action: user_confirmed ? 'classification_confirmed' : 'classification_rejected',
          details: {
            analysis,
            user_action: user_confirmed ? 'accepted' : 'needs_review'
          }
        })
    } catch (logError) {
      console.warn('⚠️ Failed to log confirmation action:', logError)
      // Don't fail the request if logging fails
    }

    // If confirmed, trigger any additional automation
    if (user_confirmed) {
      try {
        await triggerMajorWorksAutomation(supabase, document_id, analysis, user.id)
      } catch (automationError) {
        console.warn('⚠️ Automation trigger failed:', automationError)
        // Don't fail the request if automation fails
      }
    }

    return NextResponse.json({
      success: true,
      confirmed: user_confirmed,
      message: user_confirmed
        ? 'Classification confirmed and document filed successfully'
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

// Trigger additional automation when user confirms classification
async function triggerMajorWorksAutomation(supabase: any, documentId: string, analysis: any, userId: string) {
  const stage = analysis.stage

  // Create calendar events if they don't exist
  if (stage === 'Notice of Intention' && analysis.consultation_period_days) {
    const endDate = new Date()
    endDate.setDate(endDate.getDate() + analysis.consultation_period_days)

    await supabase
      .from('calendar_events')
      .insert({
        title: `Section 20 Notice Period Ends - ${analysis.building_name || 'Building'}`,
        description: `The Section 20 consultation period ends today. Review responses and proceed with next steps.`,
        start_time: endDate.toISOString(),
        event_type: 'major_works_deadline',
        created_by: userId,
        metadata: {
          document_id: documentId,
          stage: stage
        }
      })
  }

  // Create email templates for leaseholders
  if (stage === 'Statement of Estimates') {
    await supabase
      .from('email_templates')
      .insert({
        template_name: `major_works_estimates_${documentId}`,
        subject: `Major Works - Statement of Estimates - ${analysis.building_name || 'Building'}`,
        body: await generateEstimatesEmailTemplate(analysis),
        template_type: 'major_works',
        created_by: userId,
        metadata: {
          document_id: documentId,
          stage: stage
        }
      })
  }

  // Update project timeline
  try {
    const { data: project } = await supabase
      .from('major_works_projects')
      .select('id')
      .eq('building_id', analysis.building_id)
      .eq('status', 'active')
      .single()

    if (project) {
      await supabase
        .from('major_works_timeline')
        .insert({
          project_id: project.id,
          stage: stage,
          completed_date: new Date().toISOString(),
          document_id: documentId,
          notes: `${stage} document uploaded and confirmed`
        })
    }
  } catch (timelineError) {
    console.warn('⚠️ Failed to update project timeline:', timelineError)
  }
}

// Generate email template for estimates stage
async function generateEstimatesEmailTemplate(analysis: any): Promise<string> {
  return `
Dear Leaseholder,

RE: Major Works - Statement of Estimates - ${analysis.building_name || 'Your Building'}

Further to our Notice of Intention regarding the proposed major works, we are pleased to provide you with the Statement of Estimates as required under Section 20 of the Landlord and Tenant Act 1985.

PROPOSED WORKS:
${analysis.works_description || 'Details of the major works as previously outlined'}

ESTIMATED COSTS:
${analysis.estimated_cost ? `Total estimated cost: £${analysis.estimated_cost.toLocaleString()}` : 'Detailed cost breakdown attached'}

CONTRACTORS:
${analysis.contractors?.length > 0 ? analysis.contractors.join('\n') : 'Contractor details attached'}

CONSULTATION PERIOD:
You have ${analysis.consultation_period_days || 30} days from the date of this notice to make written observations regarding:
- The proposed works
- The estimated costs
- The proposed contractors

Please submit any observations in writing to the Management Company within the consultation period.

If you have any questions regarding these proposals, please do not hesitate to contact us.

Yours sincerely,

Building Management
`.trim()
}