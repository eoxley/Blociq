/**
 * Preview API
 * Generates preview of communications for testing
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
    
    const { buildingId, templateId } = await req.json();
    
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
      .not('email', 'is', null)
      .limit(3); // Preview only first 3 recipients
    
    if (recipientsError) {
      return NextResponse.json({ 
        error: 'Failed to fetch recipients',
        message: recipientsError.message
      }, { status: 500 });
    }
    
    // Generate preview data
    const preview = (recipients || []).map(recipient => {
      // Simple template rendering - replace placeholders
      let html = template.body || '';
      let subject = template.subject || '';
      
      // Replace common placeholders
      html = html.replace(/\{\{recipient\.name\}\}/g, recipient.leaseholder_name);
      html = html.replace(/\{\{building\.name\}\}/g, recipient.units?.buildings?.name || '');
      html = html.replace(/\{\{unit\.number\}\}/g, recipient.units?.unit_number || '');
      html = html.replace(/\{\{today\}\}/g, new Date().toLocaleDateString('en-GB'));
      
      subject = subject.replace(/\{\{recipient\.name\}\}/g, recipient.leaseholder_name);
      subject = subject.replace(/\{\{building\.name\}\}/g, recipient.units?.buildings?.name || '');
      subject = subject.replace(/\{\{unit\.number\}\}/g, recipient.units?.unit_number || '');
      subject = subject.replace(/\{\{today\}\}/g, new Date().toLocaleDateString('en-GB'));
      
      return {
        recipient: {
          leaseholder_id: recipient.leaseholder_id,
          leaseholder_name: recipient.leaseholder_name,
          salutation: `Dear ${recipient.leaseholder_name}`,
          email: recipient.email,
          postal_address: recipient.units?.buildings?.address || '',
          unit_label: `Unit ${recipient.units?.unit_number}`,
          opt_out_email: false
        },
        subject: subject,
        html: html,
        text: html.replace(/<[^>]*>/g, ''), // Strip HTML for text version
        warnings: []
      };
    });
    
    return NextResponse.json({ preview });
    
  } catch (error) {
    console.error('Preview API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}