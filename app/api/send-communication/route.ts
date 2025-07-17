import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Database } from '@/lib/database.types';

export async function POST(req: NextRequest) {
  try {
    const { communications, sendMethod } = await req.json();
    
    if (!communications || !Array.isArray(communications)) {
      return NextResponse.json({ error: 'Invalid communications data' }, { status: 400 });
    }

    const supabase = createRouteHandlerClient<Database>({ cookies });

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const results = [];

    for (const comm of communications) {
      try {
        // Insert communication record
        const { data: communicationData, error: insertError } = await supabase
          .from('communications')
          .insert({
            type: comm.type,
            subject: comm.subject,
            content: comm.content,
            building_id: comm.building_id,
            unit_id: comm.unit_id,
            leaseholder_id: comm.leaseholder_id,
            template_id: comm.template_id,
            send_method: comm.send_method,
            created_by: user.id,
            sent: true,
            sent_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (insertError) {
          console.error('Error inserting communication:', insertError);
          results.push({
            leaseholder_id: comm.leaseholder_id,
            success: false,
            error: insertError.message,
          });
          continue;
        }

        // If sending email, you would integrate with your email service here
        if (sendMethod === 'email' || sendMethod === 'both') {
          // Example: Send email using your preferred email service
          // await sendEmail({
          //   to: comm.leaseholder_email,
          //   subject: comm.subject,
          //   content: comm.content,
          // });
          
          console.log(`Email would be sent to leaseholder ${comm.leaseholder_id}`);
        }

        results.push({
          leaseholder_id: comm.leaseholder_id,
          success: true,
          communication_id: communicationData.id,
        });

      } catch (error: any) {
        console.error('Error processing communication:', error);
        results.push({
          leaseholder_id: comm.leaseholder_id,
          success: false,
          error: error.message,
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    return NextResponse.json({
      success: true,
      message: `Successfully processed ${successCount} communications${failureCount > 0 ? `, ${failureCount} failed` : ''}`,
      results,
    });

  } catch (error: any) {
    console.error('Error in send-communication:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
} 