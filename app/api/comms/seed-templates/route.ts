/**
 * Seed Templates API
 * Creates sample templates for testing mail merge functionality
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
    
    // Sample templates
    const sampleTemplates = [
      {
        name: 'Welcome Letter',
        description: 'Welcome new leaseholders to the building',
        type: 'letter',
        subject: 'Welcome to {{building.name}}',
        body: `
          <h2>Welcome to {{building.name}}</h2>
          <p>Dear {{recipient.name}},</p>
          <p>Welcome to {{building.name}}! We're excited to have you as a new leaseholder in {{unit.number}}.</p>
          <p>This letter contains important information about your new home and the building's policies.</p>
          <p>If you have any questions, please don't hesitate to contact us.</p>
          <p>Best regards,<br>Property Management Team</p>
          <p><small>Generated on {{today}}</small></p>
        `,
        placeholders: ['recipient.name', 'building.name', 'unit.number', 'today']
      },
      {
        name: 'Rent Reminder',
        description: 'Remind leaseholders about upcoming rent payments',
        type: 'email',
        subject: 'Rent Reminder - {{building.name}}',
        body: `
          <h2>Rent Payment Reminder</h2>
          <p>Dear {{recipient.name}},</p>
          <p>This is a friendly reminder that your rent payment for {{unit.number}} at {{building.name}} is due soon.</p>
          <p>Please ensure your payment is made on time to avoid any late fees.</p>
          <p>If you have already made your payment, please disregard this message.</p>
          <p>Thank you for your attention to this matter.</p>
          <p>Property Management Team</p>
        `,
        placeholders: ['recipient.name', 'building.name', 'unit.number']
      },
      {
        name: 'Building Notice',
        description: 'Important building announcements',
        type: 'letter',
        subject: 'Important Notice - {{building.name}}',
        body: `
          <h2>Important Building Notice</h2>
          <p>Dear {{recipient.name}},</p>
          <p>We would like to inform you about important updates regarding {{building.name}}.</p>
          <p>Please review the following information carefully:</p>
          <ul>
            <li>Building maintenance schedule</li>
            <li>Updated policies and procedures</li>
            <li>Contact information for emergencies</li>
          </ul>
          <p>If you have any questions, please contact the building management office.</p>
          <p>Property Management Team</p>
          <p><small>Notice dated: {{today}}</small></p>
        `,
        placeholders: ['recipient.name', 'building.name', 'today']
      }
    ];
    
    // Insert templates
    const { data: templates, error: insertError } = await supabase
      .from('communication_templates')
      .insert(sampleTemplates.map(template => ({
        ...template,
        is_active: true,
        created_by: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })))
      .select();
    
    if (insertError) {
      return NextResponse.json({ 
        error: 'Failed to create templates',
        message: insertError.message
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      message: `Created ${templates.length} sample templates`,
      templates: templates
    });
    
  } catch (error) {
    console.error('Seed templates API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
