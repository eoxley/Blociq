import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies: () => cookies() });
    
    // Get the current user's session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { 
      emailId,
      subject,
      originalContent,
      draftContent,
      category,
      action,
      buildingId,
      unitId,
      leaseholderId,
      fromEmail,
      fromName
    } = await req.json();

    if (!emailId || !subject || !draftContent) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Create draft in email_drafts table
    const { data: draft, error: draftError } = await supabase
      .from('email_drafts')
      .insert({
        email_id: emailId,
        draft_text: draftContent,
        created_by: session.user.id,
        category: category || 'General',
        action_required: action || 'Review and respond',
        building_id: buildingId,
        unit_id: unitId,
        leaseholder_id: leaseholderId,
        from_email: fromEmail,
        from_name: fromName,
        original_subject: subject,
        original_content: originalContent,
        status: 'pending_review'
      })
      .select()
      .single();

    if (draftError) {
      console.error('Error creating email draft:', draftError);
      return NextResponse.json({ 
        error: 'Failed to create draft',
        details: draftError.message 
      }, { status: 500 });
    }

    // Also log in communications_log for tracking
    const { data: communicationLog, error: logError } = await supabase
      .from('communications_log')
      .insert({
        type: 'email_draft',
        building_id: buildingId,
        unit_id: unitId,
        leaseholder_id: leaseholderId,
        subject: `Draft: ${subject}`,
        content: `AI-generated draft response created for: ${subject}`,
        sent_at: new Date().toISOString(),
        sent_by: session.user.id,
        status: 'draft_created',
        metadata: {
          original_email_id: emailId,
          draft_id: draft.id,
          category: category,
          action: action,
          from_email: fromEmail,
          from_name: fromName
        }
      })
      .select()
      .single();

    if (logError) {
      console.error('Error logging communication:', logError);
      // Don't fail the request if logging fails
    }

    // Mark the original email as having a draft
    const { error: updateError } = await supabase
      .from('incoming_emails')
      .update({ 
        handled: true,
        unread: false,
        tag: 'draft_created'
      })
      .eq('id', emailId);

    if (updateError) {
      console.error('Error updating email status:', updateError);
      // Don't fail the request if status update fails
    }

    return NextResponse.json({ 
      success: true,
      draftId: draft.id,
      communicationId: communicationLog?.id,
      message: 'Draft created successfully'
    });

  } catch (error) {
    console.error('Error in create-draft API:', error);
    return NextResponse.json({ 
      error: 'Failed to create draft',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
