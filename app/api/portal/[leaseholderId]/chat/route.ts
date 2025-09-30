import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(
  req: NextRequest,
  { params }: { params: { leaseholderId: string } }
) {
  try {
    const supabase = await createClient();
    const body = await req.json();
    const { message, context } = body;

    if (!message) {
      return NextResponse.json({
        error: 'Message is required'
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

    // Get lease and building context for AI
    const { data: lease, error: leaseError } = await supabase
      .from('leases')
      .select(`
        id,
        leaseholder_name,
        building_id,
        unit_number,
        status,
        start_date,
        end_date,
        ground_rent,
        service_charge_percentage,
        responsibilities,
        restrictions,
        rights,
        analysis_json,
        buildings!inner(
          id,
          name,
          address,
          total_units,
          year_built,
          building_type,
          managed_by,
          freeholder_name,
          freeholder_contact,
          insurance_details
        )
      `)
      .eq('id', params.leaseholderId)
      .single();

    if (leaseError || !lease) {
      return NextResponse.json({
        error: 'Lease not found'
      }, { status: 404 });
    }

    // Get recent communications for context
    const { data: communications } = await supabase
      .from('communications_log')
      .select(`
        id,
        type,
        subject,
        content,
        sent_at,
        status
      `)
      .eq('building_id', lease.building_id)
      .order('sent_at', { ascending: false })
      .limit(5);

    // Get financial information
    const { data: financialInfo } = await supabase
      .from('ar_demand_headers')
      .select(`
        id,
        leaseholder_id,
        total_amount,
        outstanding_amount,
        due_date,
        status
      `)
      .eq('leaseholder_id', params.leaseholderId)
      .order('due_date', { ascending: false })
      .limit(3);

    // Get upcoming items
    const { data: upcomingItems } = await supabase
      .from('calendar_events')
      .select(`
        id,
        title,
        start_time,
        description,
        event_type
      `)
      .eq('building_id', lease.building_id)
      .gte('start_time', new Date().toISOString())
      .order('start_time', { ascending: true })
      .limit(5);

    // Prepare context for AI
    const aiContext = {
      lease: {
        id: lease.id,
        leaseholderName: lease.leaseholder_name,
        unitNumber: lease.unit_number,
        status: lease.status,
        startDate: lease.start_date,
        endDate: lease.end_date,
        groundRent: lease.ground_rent,
        serviceChargePercentage: lease.service_charge_percentage,
        responsibilities: lease.responsibilities,
        restrictions: lease.restrictions,
        rights: lease.rights,
        analysis: lease.analysis_json
      },
      building: {
        id: lease.buildings.id,
        name: lease.buildings.name,
        address: lease.buildings.address,
        totalUnits: lease.buildings.total_units,
        yearBuilt: lease.buildings.year_built,
        buildingType: lease.buildings.building_type,
        managedBy: lease.buildings.managed_by,
        freeholderName: lease.buildings.freeholder_name,
        freeholderContact: lease.buildings.freeholder_contact,
        insuranceDetails: lease.buildings.insurance_details
      },
      communications: communications || [],
      financial: financialInfo || [],
      upcoming: upcomingItems || []
    };

    // Create AI prompt for leaseholder context
    const systemPrompt = `You are BlocAI, a helpful AI assistant for leaseholders in the BlocIQ property management system. 

You have access to information about:
- Leaseholder: ${lease.leaseholder_name}
- Unit: ${lease.unit_number || 'N/A'}
- Building: ${lease.buildings.name}
- Address: ${lease.buildings.address}

Current lease details:
- Ground Rent: ${lease.ground_rent || 'Not specified'}
- Service Charge: ${lease.service_charge_percentage || 0}%
- Lease Status: ${lease.status || 'Active'}
- Lease Term: ${lease.start_date} to ${lease.end_date}

Building management:
- Managed by: ${lease.buildings.managed_by || 'Not specified'}
- Freeholder: ${lease.buildings.freeholder_name || 'Not specified'}
- Contact: ${lease.buildings.freeholder_contact || 'Not specified'}

You should:
1. Provide helpful, accurate information about their lease and building
2. Be friendly and professional
3. If you don't know something specific, suggest contacting the building manager
4. Help with common leaseholder questions about service charges, ground rent, maintenance, etc.
5. Keep responses concise but informative
6. Use the provided context to give personalized answers

Remember: You are speaking to a leaseholder, not a property manager. Keep your tone appropriate for a resident.`;

    // Call the AI service with leaseholder context
    const aiResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/ask-ai`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: message,
        context: aiContext,
        systemPrompt: systemPrompt,
        buildingId: lease.building_id,
        scope: 'leaseholder'
      }),
    });

    if (!aiResponse.ok) {
      throw new Error('AI service unavailable');
    }

    const aiData = await aiResponse.json();

    // Log the interaction for analytics
    await supabase
      .from('ai_interactions_log')
      .insert({
        user_id: session.user.id,
        building_id: lease.building_id,
        lease_id: params.leaseholderId,
        query: message,
        response: aiData.response,
        context_type: 'leaseholder_portal',
        metadata: {
          unit_number: lease.unit_number,
          leaseholder_name: lease.leaseholder_name
        }
      });

    return NextResponse.json({
      success: true,
      response: aiData.response,
      context: {
        leaseholder: lease.leaseholder_name,
        unit: lease.unit_number,
        building: lease.buildings.name
      }
    });

  } catch (error) {
    console.error('Error in leaseholder chat:', error);
    return NextResponse.json({
      error: 'Failed to process message',
      message: error instanceof Error ? error.message : 'An unexpected error occurred'
    }, { status: 500 });
  }
}
