import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(
  req: NextRequest,
  { params }: { params: { leaseholderId: string } }
) {
  try {
    const supabase = await createClient();
    const body = await req.json();
    const { subject, message, urgency, category, context } = body;

    if (!subject || !message) {
      return NextResponse.json({
        error: 'Subject and message are required'
      }, { status: 400 });
    }

    // Get current user session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session?.user) {
      return NextResponse.json({
        error: 'Authentication required'
      }, { status: 401 });
    }

    // Verify user has access to this lease
    const { data: hasAccess, error: accessError } = await supabase
      .rpc('portal_has_lease_access', {
        user_id: session.user.id,
        lease_id: params.leaseholderId
      });

    if (accessError || !hasAccess) {
      return NextResponse.json({
        error: 'Access denied'
      }, { status: 403 });
    }

    // Get lease information for context
    const { data: lease, error: leaseError } = await supabase
      .from('leases')
      .select(`
        id,
        leaseholder_name,
        building_id,
        unit_number,
        buildings!inner(
          id,
          name,
          address,
          agency_id
        )
      `)
      .eq('id', params.leaseholderId)
      .single();

    if (leaseError || !lease) {
      return NextResponse.json({
        error: 'Lease not found'
      }, { status: 404 });
    }

    // Create communication log entry
    const { data: communication, error: commError } = await supabase
      .from('communications_log')
      .insert({
        type: 'email',
        subject: `[Portal] ${subject}`,
        content: `From: ${lease.leaseholder_name}
Unit: ${lease.unit_number || 'N/A'}
Building: ${lease.buildings.name}

Category: ${category}
Urgency: ${urgency}

Message:
${message}

---
This message was sent via the leaseholder portal.`,
        building_id: lease.building_id,
        leaseholder_id: params.leaseholderId,
        sent_by: session.user.id,
        direction: 'inbound',
        status: 'received',
        metadata: {
          source: 'portal_contact_form',
          urgency: urgency,
          category: category,
          unit_number: lease.unit_number,
          leaseholder_name: lease.leaseholder_name
        }
      })
      .select()
      .single();

    if (commError) {
      console.error('Error creating communication log:', commError);
      return NextResponse.json({
        error: 'Failed to log communication',
        message: commError.message
      }, { status: 500 });
    }

    // Get building managers to notify
    const { data: managers } = await supabase
      .from('profiles')
      .select(`
        id,
        email,
        full_name,
        role
      `)
      .eq('agency_id', lease.buildings.agency_id)
      .in('role', ['manager', 'director'])
      .eq('email_confirmed', true);

    // TODO: Send email notifications to managers
    // For now, we'll just log that notifications should be sent
    if (managers && managers.length > 0) {
      console.log(`Should send notifications to managers:`, managers.map(m => m.email));
      
      // Log notification intent
      await supabase
        .from('notification_queue')
        .insert({
          type: 'leaseholder_contact',
          recipient_type: 'managers',
          building_id: lease.building_id,
          subject: `New message from leaseholder: ${subject}`,
          content: `A leaseholder has sent a message via the portal.

Leaseholder: ${lease.leaseholder_name}
Unit: ${lease.unit_number || 'N/A'}
Category: ${category}
Urgency: ${urgency}

Message: ${message}`,
          metadata: {
            communication_id: communication.id,
            leaseholder_id: params.leaseholderId,
            urgency: urgency,
            category: category
          },
          priority: urgency === 'high' ? 'high' : 'normal'
        });
    }

    // Update leaseholder's last portal access
    await supabase
      .from('leaseholders')
      .update({
        last_portal_access: new Date().toISOString()
      })
      .eq('id', (
        await supabase
          .from('leaseholder_users')
          .select('leaseholder_id')
          .eq('user_id', session.user.id)
          .single()
      ).data?.leaseholder_id);

    return NextResponse.json({
      success: true,
      message: 'Message sent successfully',
      communication_id: communication.id,
      status: 'received'
    });

  } catch (error) {
    console.error('Error in leaseholder contact:', error);
    return NextResponse.json({
      error: 'Failed to send message',
      message: error instanceof Error ? error.message : 'An unexpected error occurred'
    }, { status: 500 });
  }
}
