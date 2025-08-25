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
      subject, 
      body, 
      recipients, 
      sentAt, 
      messageId,
      buildingId,
      unitId,
      leaseholderId 
    } = await req.json();

    if (!subject || !recipients || !Array.isArray(recipients)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // If we don't have building/unit/leaseholder info, try to match by email
    let matchedBuildingId = buildingId;
    let matchedUnitId = unitId;
    let matchedLeaseholderId = leaseholderId;

    if (!matchedBuildingId || !matchedLeaseholderId) {
      // Try to match recipients to leaseholders and buildings
      for (const recipient of recipients) {
        const email = recipient.email || recipient;
        
        // Search for leaseholder by email
        const { data: leaseholder, error: leaseholderError } = await supabase
          .from('leaseholders')
          .select(`
            id,
            name,
            email,
            units!inner(
              id,
              unit_number,
              buildings!inner(
                id,
                name
              )
            )
          `)
          .eq('email', email)
          .single();

        if (leaseholder && !leaseholderError) {
          matchedLeaseholderId = leaseholder.id;
          if (leaseholder.units && leaseholder.units.length > 0) {
            const unit = leaseholder.units[0];
            matchedUnitId = unit.id;
            matchedBuildingId = unit.buildings.id;
          }
          break; // Found a match, no need to continue
        }

        // If no leaseholder match, try to match by building name in email domain
        if (!matchedBuildingId) {
          const { data: buildings, error: buildingsError } = await supabase
            .from('buildings')
            .select('id, name, address')
            .ilike('name', `%${email.split('@')[1]?.split('.')[0]}%`);

          if (buildings && buildings.length > 0 && !buildingsError) {
            matchedBuildingId = buildings[0].id;
          }
        }
      }
    }

    // Log the email in communications_log table
    const { data: communicationLog, error: logError } = await supabase
      .from('communications_log')
      .insert({
        type: 'email',
        building_id: matchedBuildingId,
        unit_id: matchedUnitId,
        leaseholder_id: matchedLeaseholderId,
        subject: subject,
        content: body,
        sent_at: sentAt || new Date().toISOString(),
        sent_by: session.user.id,
        building_name: null, // Will be populated by trigger if needed
        leaseholder_name: null, // Will be populated by trigger if needed
        unit_number: null, // Will be populated by trigger if needed
        status: 'sent'
      })
      .select()
      .single();

    if (logError) {
      console.error('Error logging communication:', logError);
      return NextResponse.json({ 
        error: 'Failed to log communication',
        details: logError.message 
      }, { status: 500 });
    }

    // Also log in email_history table for email-specific tracking
    const { data: emailHistory, error: emailHistoryError } = await supabase
      .from('email_history')
      .insert({
        message_id: messageId,
        subject: subject,
        sender_email: session.user.email,
        recipient_email: recipients.map(r => r.email || r).join(', '),
        recipient_name: recipients.map(r => r.name || r.email || r).join(', '),
        sent_at: sentAt || new Date().toISOString(),
        body_text: body,
        building_id: matchedBuildingId,
        unit_id: matchedUnitId,
        email_type: 'outgoing',
        status: 'sent'
      })
      .select()
      .single();

    if (emailHistoryError) {
      console.error('Error logging email history:', emailHistoryError);
      // Don't fail the request if email history logging fails
    }

    return NextResponse.json({ 
      success: true,
      communicationId: communicationLog.id,
      emailHistoryId: emailHistory?.id,
      matched: {
        buildingId: matchedBuildingId,
        unitId: matchedUnitId,
        leaseholderId: matchedLeaseholderId
      }
    });

  } catch (error) {
    console.error('Error in log-email API:', error);
    return NextResponse.json({ 
      error: 'Failed to log email',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
