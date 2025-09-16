/**
 * Send Emails API
 * Sends emails to building recipients using mail-merge
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { logCommunication } from '@/lib/utils/communications-logger';
import { emailService } from '@/lib/services/email-service';

export async function POST(req: NextRequest) {
  try {
    // Check if this is a system test (no auth required)
    const isSystemTest = req.headers.get('x-system-test') === 'true';

    let supabase;
    let user = null;

    if (isSystemTest) {
      // Use service client for system tests
      supabase = createServiceClient();
    } else {
      // Use regular client for authenticated requests
      supabase = await createClient();

      // Get current user
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      user = session?.user;

      if (sessionError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }
    
    const { buildingId, templateId, testMode = false } = await req.json();
    
    if (!buildingId || !templateId) {
      return NextResponse.json({ 
        error: 'Missing required fields',
        message: 'buildingId and templateId are required'
      }, { status: 400 });
    }
    
    // Get template
    const { data: template, error: templateError } = await supabase
      .from('communication_templates')
      .select('*')
      .eq('id', templateId)
      .single();
    
    if (templateError || !template) {
      return NextResponse.json({ 
        error: 'Template not found',
        message: 'The specified template does not exist'
      }, { status: 404 });
    }
    
    if (template.type !== 'email') {
      return NextResponse.json({ 
        error: 'Invalid template type',
        message: 'Template must be an email template'
      }, { status: 400 });
    }
    
    // Get recipients for the building using same approach as recipients API
    const recipientsResponse = await fetch(`${req.nextUrl.origin}/api/comms/recipients?buildingId=${buildingId}`, {
      method: 'GET',
      headers: {
        'x-system-test': isSystemTest ? 'true' : 'false',
        'Authorization': req.headers.get('Authorization') || '',
      }
    });

    if (!recipientsResponse.ok) {
      const errorData = await recipientsResponse.json();
      return NextResponse.json({
        error: 'Failed to fetch recipients',
        message: errorData.message || 'Recipients API failed'
      }, { status: 500 });
    }

    const recipients = await recipientsResponse.json();
    
    if (!recipients || recipients.length === 0) {
      return NextResponse.json({ 
        error: 'No recipients found',
        message: 'No leaseholders found for the specified building'
      }, { status: 404 });
    }
    
    // Prepare email recipients and template
    const emailRecipients = recipients.map(recipient => ({
      email: recipient.email,
      name: recipient.leaseholder_name,
      building_id: buildingId,
      leaseholder_id: recipient.leaseholder_id
    }));

    // Render template for the first recipient to get subject (all will be similar)
    const firstRecipient = recipients[0];
    let baseSubject = template.subject || '';
    baseSubject = baseSubject.replace(/\{\{recipient\.name\}\}/g, firstRecipient.leaseholder_name);
    baseSubject = baseSubject.replace(/\{\{building\.name\}\}/g, firstRecipient.units?.buildings?.name || '');
    baseSubject = baseSubject.replace(/\{\{unit\.number\}\}/g, firstRecipient.units?.unit_number || '');
    baseSubject = baseSubject.replace(/\{\{today\}\}/g, new Date().toLocaleDateString('en-GB'));

    // For mail merge, we need to send individual emails with personalized content
    const sentEmails = [];
    const emailResults = [];

    for (const recipient of recipients) {
      // Render template with recipient data
      let html = template.body || '';
      let subject = template.subject || '';

      // Replace placeholders
      html = html.replace(/\{\{recipient\.name\}\}/g, recipient.leaseholder_name);
      html = html.replace(/\{\{building\.name\}\}/g, recipient.units?.buildings?.name || '');
      html = html.replace(/\{\{unit\.number\}\}/g, recipient.units?.unit_number || '');
      html = html.replace(/\{\{today\}\}/g, new Date().toLocaleDateString('en-GB'));

      subject = subject.replace(/\{\{recipient\.name\}\}/g, recipient.leaseholder_name);
      subject = subject.replace(/\{\{building\.name\}\}/g, recipient.units?.buildings?.name || '');
      subject = subject.replace(/\{\{unit\.number\}\}/g, recipient.units?.unit_number || '');
      subject = subject.replace(/\{\{today\}\}/g, new Date().toLocaleDateString('en-GB'));

      // Send individual email
      const emailResult = await emailService.sendEmail({
        to: [{
          email: recipient.email,
          name: recipient.leaseholder_name,
          building_id: buildingId,
          leaseholder_id: recipient.leaseholder_id
        }],
        template: {
          subject,
          html,
          text: html.replace(/<[^>]*>/g, '') // Strip HTML for text version
        },
        testMode,
        metadata: {
          recipient_name: recipient.leaseholder_name,
          building_name: recipient.units?.buildings?.name,
          unit_number: recipient.units?.unit_number,
          unit_id: recipient.units?.unit_id,
          template_id: templateId,
          email_type: 'mail_merge_campaign'
        }
      });

      emailResults.push(emailResult);

      sentEmails.push({
        recipient_id: recipient.leaseholder_id,
        recipient_name: recipient.leaseholder_name,
        recipient_email: recipient.email,
        subject: subject,
        sent_at: new Date().toISOString(),
        success: emailResult.success,
        message_id: emailResult.messageId,
        error: emailResult.error
      });
    }

    const successCount = emailResults.filter(r => r.success).length;
    const failureCount = emailResults.length - successCount;
    
    return NextResponse.json({
      success: successCount > 0,
      message: testMode
        ? `Test mode: Simulated ${sentEmails.length} emails`
        : `Campaign completed: ${successCount} sent, ${failureCount} failed`,
      emails: sentEmails,
      stats: {
        total: sentEmails.length,
        successful: successCount,
        failed: failureCount
      },
      testMode: testMode
    });
    
  } catch (error) {
    console.error('Send emails API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}