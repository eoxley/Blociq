import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { sendEmail = false, sendPost = false } = await req.json();

    // Get current user
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session?.user) {
      return NextResponse.json({
        error: 'Authentication required'
      }, { status: 401 });
    }

    // Get demand details
    const { data: demand, error: demandError } = await supabase
      .from('ar_demand_headers')
      .select(`
        *,
        ar_demand_lines (
          id,
          line_number,
          description,
          amount
        ),
        leaseholders!inner (
          id,
          full_name,
          email,
          units!inner (
            unit_number,
            buildings!inner (
              id,
              name,
              address
            )
          )
        )
      `)
      .eq('id', params.id)
      .single();

    if (demandError || !demand) {
      return NextResponse.json({
        error: 'Demand not found'
      }, { status: 404 });
    }

    if (demand.status !== 'draft') {
      return NextResponse.json({
        error: 'Demand has already been sent',
        message: `Demand is currently in ${demand.status} status`
      }, { status: 400 });
    }

    // Generate PDF (placeholder - would use PDF generation library)
    const pdfData = {
      demandNumber: demand.demand_number,
      leaseholderName: demand.leaseholders.full_name,
      unitNumber: demand.leaseholders.units.unit_number,
      buildingName: demand.leaseholders.units.buildings.name,
      buildingAddress: demand.leaseholders.units.buildings.address,
      dueDate: demand.due_date,
      totalAmount: demand.total_amount,
      lines: demand.ar_demand_lines
    };

    // TODO: Generate actual PDF using a library like jsPDF or Puppeteer
    const pdfPath = `/demands/${demand.demand_number}.pdf`;

    // Update demand status
    const { error: updateError } = await supabase
      .from('ar_demand_headers')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString()
      })
      .eq('id', params.id);

    if (updateError) {
      console.error('Error updating demand status:', updateError);
      return NextResponse.json({
        error: 'Failed to update demand status',
        message: updateError.message
      }, { status: 500 });
    }

    const results = {
      demandId: demand.id,
      demandNumber: demand.demand_number,
      sentAt: new Date().toISOString(),
      actions: [] as string[]
    };

    // Send email if requested
    if (sendEmail && demand.leaseholders.email) {
      try {
        // TODO: Implement email sending via your preferred email service
        // For now, log the email data
        console.log('Email would be sent to:', demand.leaseholders.email);
        console.log('Email data:', {
          to: demand.leaseholders.email,
          subject: `Service Charge Demand - ${demand.demand_number}`,
          body: `Dear ${demand.leaseholders.full_name},\n\nPlease find attached your service charge demand for ${demand.demand_number}.\n\nAmount due: £${demand.total_amount.toFixed(2)}\nDue date: ${new Date(demand.due_date).toLocaleDateString()}\n\nThank you.`
        });

        results.actions.push('email_sent');
      } catch (error) {
        console.error('Error sending email:', error);
        results.actions.push('email_failed');
      }
    }

    // Send post if requested
    if (sendPost) {
      try {
        // TODO: Implement postal sending via your preferred postal service
        console.log('Post would be sent to:', demand.leaseholders.units.buildings.address);
        results.actions.push('post_sent');
      } catch (error) {
        console.error('Error sending post:', error);
        results.actions.push('post_failed');
      }
    }

    // Log communication
    await supabase
      .from('communications_log')
      .insert({
        type: 'demand',
        subject: `Service Charge Demand - ${demand.demand_number}`,
        content: `Service charge demand ${demand.demand_number} sent to ${demand.leaseholders.full_name}`,
        building_id: demand.building_id,
        leaseholder_id: demand.leaseholder_id,
        sent_by: session.user.id,
        direction: 'outbound',
        status: 'sent',
        metadata: {
          demand_id: demand.id,
          demand_number: demand.demand_number,
          total_amount: demand.total_amount,
          actions: results.actions
        }
      });

    return NextResponse.json({
      success: true,
      message: 'Demand sent successfully',
      results: results
    });

  } catch (error) {
    console.error('Error sending demand:', error);
    return NextResponse.json({
      error: 'Failed to send demand',
      message: error instanceof Error ? error.message : 'An unexpected error occurred'
    }, { status: 500 });
  }
}
