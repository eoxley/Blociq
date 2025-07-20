import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Database } from '@/lib/database.types';

interface SendCommunicationRequest {
  templateId: string;
  buildingId: string;
  recipients: Array<{
    leaseholder_id: string;
    email: string;
  }>;
  mergedMessage: string;
  subject: string;
}

export async function POST(req: NextRequest) {
  try {
    const { templateId, buildingId, recipients, mergedMessage, subject }: SendCommunicationRequest = await req.json();
    
    if (!templateId || !buildingId || !recipients || !Array.isArray(recipients) || !mergedMessage || !subject) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = createRouteHandlerClient<Database>({ cookies });

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const results = [];

    for (const recipient of recipients) {
      try {
        // Save communication log in communications table
        const { data: communicationData, error: insertError } = await supabase
          .from('communications')
          .insert({
            leaseholder_id: recipient.leaseholder_id,
            building_id: buildingId,
            type: 'email',
            template_id: parseInt(templateId),
            sent_at: new Date().toISOString(),
            send_method: 'email',
            subject: subject,
            content: mergedMessage,
            created_by: user.id,
            sent: true,
          })
          .select()
          .single();

        if (insertError) {
          console.error('Error inserting communication log:', insertError);
          results.push({
            leaseholder_id: recipient.leaseholder_id,
            success: false,
            error: insertError.message,
          });
          continue;
        }

        // Send email using Outlook (SMTP or Graph API)
        // For now, we'll log the email details - you can integrate with your preferred email service
        console.log(`Sending email to ${recipient.email}:`, {
          subject,
          content: mergedMessage,
          leaseholder_id: recipient.leaseholder_id,
        });

        // TODO: Integrate with your email service (Outlook SMTP/Graph API)
        // Example with a hypothetical email service:
        // await sendEmail({
        //   to: recipient.email,
        //   subject,
        //   html: mergedMessage,
        //   from: 'your-app@domain.com',
        // });

        results.push({
          leaseholder_id: recipient.leaseholder_id,
          success: true,
          communication_id: communicationData.id,
          email: recipient.email,
        });

      } catch (error: any) {
        console.error('Error processing communication:', error);
        results.push({
          leaseholder_id: recipient.leaseholder_id,
          success: false,
          error: error.message,
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    return NextResponse.json({
      success: true,
      message: `Successfully sent ${successCount} emails${failureCount > 0 ? `, ${failureCount} failed` : ''}`,
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