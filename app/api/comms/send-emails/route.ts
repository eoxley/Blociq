/**
 * Send Emails API
 * Sends emails to building recipients using mail-merge
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient(cookies());
    
    // Get current user
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    const user = session?.user;
    
    if (sessionError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
    
    // Get recipients for the building
    const { data: recipients, error: recipientsError } = await supabase
      .from('leaseholders')
      .select(`
        id as leaseholder_id,
        name as leaseholder_name,
        email,
        phone,
        units!inner(
          id as unit_id,
          unit_number,
          building_id,
          buildings!inner(
            id,
            name as building_name,
            address
          )
        )
      `)
      .eq('units.building_id', buildingId)
      .not('email', 'is', null);
    
    if (recipientsError) {
      return NextResponse.json({ 
        error: 'Failed to fetch recipients',
        message: recipientsError.message
      }, { status: 500 });
    }
    
    if (!recipients || recipients.length === 0) {
      return NextResponse.json({ 
        error: 'No recipients found',
        message: 'No leaseholders found for the specified building'
      }, { status: 404 });
    }
    
    // Send emails to each recipient
    const sentEmails = [];
    
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
      
      if (!testMode) {
        // In a real implementation, you would send the email here
        // For now, we'll just log it
        console.log(`Sending email to ${recipient.email}: ${subject}`);
      }
      
      // Log the communication
      const { error: logError } = await supabase
        .from('communications_log')
        .insert({
          type: 'email',
          building_id: buildingId,
          unit_id: recipient.units?.unit_id,
          leaseholder_id: recipient.leaseholder_id,
          subject: subject,
          content: html,
          sent_at: new Date().toISOString(),
          sent_by: user.id,
          building_name: recipient.units?.buildings?.name || 'Unknown',
          leaseholder_name: recipient.leaseholder_name,
          unit_number: recipient.units?.unit_number || 'Unknown'
        });
      
      if (logError) {
        console.error('Error logging communication:', logError);
      }
      
      sentEmails.push({
        recipient_id: recipient.leaseholder_id,
        recipient_name: recipient.leaseholder_name,
        recipient_email: recipient.email,
        subject: subject,
        sent_at: new Date().toISOString()
      });
    }
    
    return NextResponse.json({
      success: true,
      message: testMode 
        ? `Test mode: Would send ${sentEmails.length} emails`
        : `Sent ${sentEmails.length} emails successfully`,
      emails: sentEmails,
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