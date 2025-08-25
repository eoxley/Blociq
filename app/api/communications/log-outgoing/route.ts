import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

interface LogOutgoingEmailRequest {
  type: 'email';
  building_id?: string | null;
  unit_id?: string | null;
  leaseholder_id?: string | null;
  subject: string;
  content: string;
  sent_at: string;
  sent_by: string;
  building_name?: string;
  leaseholder_name?: string;
  unit_number?: string;
  status: 'sent';
  direction: 'outgoing';
  recipient_email: string;
  is_reply: boolean;
  is_forward: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: LogOutgoingEmailRequest = await request.json();
    
    // Validate required fields
    if (!body.subject || !body.recipient_email || !body.content) {
      return NextResponse.json({ 
        error: 'Missing required fields: subject, recipient_email, content' 
      }, { status: 400 });
    }

    // Try to find building and leaseholder information if not provided
    let buildingId = body.building_id;
    let leaseholderId = body.leaseholder_id;
    let unitId = body.unit_id;

    if (!buildingId || !leaseholderId) {
      // Try to find by recipient email
      const { data: leaseholderData } = await supabase
        .from('leaseholders')
        .select(`
          id,
          email,
          name,
          units!inner(
            id,
            building_id,
            unit_number,
            buildings!inner(
              id,
              name,
              address
            )
          )
        `)
        .eq('email', body.recipient_email)
        .single();

      if (leaseholderData) {
        leaseholderId = leaseholderData.id;
        if (leaseholderData.units && leaseholderData.units.length > 0) {
          const unit = leaseholderData.units[0];
          unitId = unit.id;
          buildingId = unit.building_id;
          
          // Update building and leaseholder names if not provided
          if (!body.building_name) {
            body.building_name = unit.buildings.name;
          }
          if (!body.leaseholder_name) {
            body.leaseholder_name = leaseholderData.name;
          }
          if (!body.unit_number) {
            body.unit_number = unit.unit_number;
          }
        }
      }
    }

    // If still no building info, try to extract from email content
    if (!buildingId) {
      const { data: buildingMatch } = await supabase
        .from('buildings')
        .select('id, name, address')
        .or(`name.ilike.%${body.subject}%,address.ilike.%${body.subject}%`)
        .limit(1)
        .single();

      if (buildingMatch) {
        buildingId = buildingMatch.id;
        if (!body.building_name) {
          body.building_name = buildingMatch.name;
        }
      }
    }

    // Prepare the log data
    const logData = {
      type: body.type,
      building_id: buildingId,
      unit_id: unitId,
      leaseholder_id: leaseholderId,
      subject: body.subject,
      content: body.content,
      sent_at: body.sent_at,
      sent_by: user.id, // Use actual authenticated user ID
      building_name: body.building_name || 'Unknown',
      leaseholder_name: body.leaseholder_name || body.recipient_email,
      unit_number: body.unit_number || 'Unknown',
      status: body.status,
      direction: body.direction,
      recipient_email: body.recipient_email,
      is_reply: body.is_reply,
      is_forward: body.is_forward,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Insert into communications_log table
    const { data: logEntry, error: insertError } = await supabase
      .from('communications_log')
      .insert(logData)
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting into communications_log:', insertError);
      return NextResponse.json({ 
        error: 'Failed to log communication',
        details: insertError.message
      }, { status: 500 });
    }

    // Also log to sent_emails table for consistency
    try {
      await supabase
        .from('sent_emails')
        .insert({
          user_id: user.id,
          to_email: body.recipient_email,
          subject: body.subject,
          body: body.content,
          building_id: buildingId,
          unit_id: unitId,
          leaseholder_id: leaseholderId,
          sent_at: body.sent_at,
          status: 'sent',
          source: 'outlook_addin',
          is_reply: body.is_reply,
          is_forward: body.is_forward
        });
    } catch (sentEmailError) {
      console.warn('Failed to log to sent_emails table:', sentEmailError);
      // Don't fail the main operation if this fails
    }

    // Log success
    console.log('✅ Outgoing email logged successfully:', {
      subject: body.subject,
      recipient: body.recipient_email,
      building: body.building_name,
      leaseholder: body.leaseholder_name,
      logId: logEntry.id
    });

    return NextResponse.json({
      success: true,
      message: 'Email logged successfully',
      log_id: logEntry.id,
      building_linked: !!buildingId,
      leaseholder_linked: !!leaseholderId,
      building_name: body.building_name,
      leaseholder_name: body.leaseholder_name
    });

  } catch (error) {
    console.error('Error logging outgoing email:', error);
    
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get recent outgoing emails for the user
    const { data: recentEmails, error: fetchError } = await supabase
      .from('communications_log')
      .select(`
        id,
        subject,
        recipient_email,
        building_name,
        leaseholder_name,
        unit_number,
        sent_at,
        is_reply,
        is_forward
      `)
      .eq('sent_by', user.id)
      .eq('direction', 'outgoing')
      .eq('type', 'email')
      .order('sent_at', { ascending: false })
      .limit(10);

    if (fetchError) {
      throw fetchError;
    }

    return NextResponse.json({
      success: true,
      recent_emails: recentEmails || []
    });

  } catch (error) {
    console.error('Error fetching recent emails:', error);
    
    return NextResponse.json({ 
      error: 'Failed to fetch recent emails'
    }, { status: 500 });
  }
}
