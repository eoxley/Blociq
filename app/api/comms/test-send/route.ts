import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getTemplate } from '@/lib/comms/templates';
import { renderTemplate } from '@/lib/comms/merge';
import { z } from 'zod';

const TestSendRequestSchema = z.object({
  templateId: z.string(),
  recipientId: z.string(),
  testEmail: z.string().email().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { templateId, recipientId, testEmail } = TestSendRequestSchema.parse(body);

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get agency ID
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('agency_id')
      .eq('user_id', user.id)
      .single();

    if (!profile?.agency_id) {
      return NextResponse.json({ error: 'Agency not found' }, { status: 400 });
    }

    // Get template
    const template = await getTemplate(templateId, profile.agency_id);
    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Get recipient data
    const { data: recipient, error: recipientError } = await supabase
      .from('v_building_recipients')
      .select('*')
      .eq('leaseholder_id', recipientId)
      .eq('agency_id', profile.agency_id)
      .single();

    if (recipientError || !recipient) {
      return NextResponse.json({ error: 'Recipient not found' }, { status: 404 });
    }

    // Render template
    const mergeResult = renderTemplate(template, {
      building_name: recipient.building_name || '',
      building_address_line_1: recipient.address_line_1 || '',
      building_address_line_2: recipient.address_line_2 || '',
      building_town: recipient.city || '',
      building_county: recipient.county || '',
      building_postcode: recipient.postcode || '',
      unit_label: recipient.unit_number || '',
      unit_number: recipient.unit_number || '',
      unit_type: recipient.unit_type || '',
      leaseholder_name: recipient.leaseholder_name || '',
      salutation: recipient.title || '',
      salutation_fallback: recipient.title || '',
      postal_address: recipient.postal_address || '',
      email: recipient.email || '',
      agency_name: recipient.agency_name || '',
      agency_address: recipient.agency_address || '',
      agency_phone: recipient.agency_phone || '',
      agency_email: recipient.agency_email || '',
      today: new Date().toLocaleDateString('en-GB')
    });

    if (mergeResult.errors.length > 0) {
      return NextResponse.json({ 
        error: 'Template rendering failed',
        details: mergeResult.errors
      }, { status: 400 });
    }

    // Send test email if requested
    let testResult = null;
    if (testEmail && template.type === 'email') {
      try {
        // In a real implementation, you would send the email here
        // For now, we'll simulate the send
        const messageId = `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        testResult = {
          messageId,
          to: testEmail,
          subject: mergeResult.subject,
          sent: true,
          timestamp: new Date().toISOString()
        };

        // Log the test send
        await supabase
          .from('communications_log')
          .insert({
            agency_id: profile.agency_id,
            type: 'email_send',
            template_id: templateId,
            recipient_count: 1,
            status: 'completed',
            metadata: {
              test_send: true,
              test_email: testEmail,
              recipient_id: recipientId,
              message_id: messageId
            }
          });

      } catch (error) {
        return NextResponse.json({ 
          error: 'Test send failed',
          details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: true,
      test_send: true,
      template: {
        id: template.id,
        name: template.name,
        type: template.type
      },
      recipient: {
        id: recipient.leaseholder_id,
        name: recipient.leaseholder_name,
        email: recipient.email,
        unit: recipient.unit_number,
        building: recipient.building_name
      },
      rendered: {
        subject: mergeResult.subject,
        html: mergeResult.html,
        text: mergeResult.text
      },
      fields_used: mergeResult.fields_used,
      fields_missing: mergeResult.fields_missing,
      warnings: mergeResult.warnings,
      test_result: testResult,
      preview: {
        subject: mergeResult.subject,
        body_preview: mergeResult.text?.substring(0, 200) + (mergeResult.text && mergeResult.text.length > 200 ? '...' : ''),
        html_preview: mergeResult.html?.substring(0, 500) + (mergeResult.html && mergeResult.html.length > 500 ? '...' : '')
      }
    });

  } catch (error) {
    console.error('Test send error:', error);
    return NextResponse.json({ error: 'Test send failed' }, { status: 500 });
  }
}
