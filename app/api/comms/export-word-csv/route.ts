import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const ExportRequestSchema = z.object({
  audience: z.enum(['all_buildings', 'specific_buildings', 'specific_units']),
  buildingIds: z.array(z.string()).optional(),
  unitIds: z.array(z.string()).optional(),
  templateId: z.string(),
  includeTestData: z.boolean().default(false),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { audience, buildingIds, unitIds, templateId, includeTestData } = ExportRequestSchema.parse(body);

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
    const { data: template, error: templateError } = await supabase
      .from('communication_templates')
      .select('*')
      .eq('id', templateId)
      .eq('agency_id', profile.agency_id)
      .single();

    if (templateError || !template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Build query based on audience
    let query = supabase
      .from('v_building_recipients')
      .select('*')
      .eq('agency_id', profile.agency_id);

    if (audience === 'specific_buildings' && buildingIds?.length) {
      query = query.in('building_id', buildingIds);
    } else if (audience === 'specific_units' && unitIds?.length) {
      query = query.in('unit_id', unitIds);
    }

    const { data: recipients, error: recipientsError } = await query;

    if (recipientsError) {
      return NextResponse.json({ error: 'Failed to fetch recipients' }, { status: 500 });
    }

    if (!recipients?.length) {
      return NextResponse.json({ error: 'No recipients found' }, { status: 404 });
    }

    // Generate CSV content
    const csvHeaders = [
      'Title',
      'First Name',
      'Last Name',
      'Email',
      'Address Line 1',
      'Address Line 2',
      'City',
      'Postcode',
      'Building Name',
      'Unit Number',
      'Agency Name',
      'Agency Address',
      'Agency Phone',
      'Agency Email',
      'Current Date',
      'Template Name',
      'Subject Line',
      'Body Text',
      'Body HTML'
    ];

    const csvRows = recipients.map(recipient => {
      const currentDate = new Date().toLocaleDateString('en-GB');
      
      // Generate subject and body using template
      const subject = template.subject_template
        .replace(/\{\{title\}\}/g, recipient.title || '')
        .replace(/\{\{first_name\}\}/g, recipient.first_name || '')
        .replace(/\{\{last_name\}\}/g, recipient.last_name || '')
        .replace(/\{\{building_name\}\}/g, recipient.building_name || '')
        .replace(/\{\{unit_number\}\}/g, recipient.unit_number || '')
        .replace(/\{\{agency_name\}\}/g, recipient.agency_name || '')
        .replace(/\{\{current_date\}\}/g, currentDate);

      const bodyText = template.body_text
        .replace(/\{\{title\}\}/g, recipient.title || '')
        .replace(/\{\{first_name\}\}/g, recipient.first_name || '')
        .replace(/\{\{last_name\}\}/g, recipient.last_name || '')
        .replace(/\{\{building_name\}\}/g, recipient.building_name || '')
        .replace(/\{\{unit_number\}\}/g, recipient.unit_number || '')
        .replace(/\{\{agency_name\}\}/g, recipient.agency_name || '')
        .replace(/\{\{agency_address\}\}/g, recipient.agency_address || '')
        .replace(/\{\{agency_phone\}\}/g, recipient.agency_phone || '')
        .replace(/\{\{agency_email\}\}/g, recipient.agency_email || '')
        .replace(/\{\{current_date\}\}/g, currentDate);

      const bodyHtml = template.body_html
        .replace(/\{\{title\}\}/g, recipient.title || '')
        .replace(/\{\{first_name\}\}/g, recipient.first_name || '')
        .replace(/\{\{last_name\}\}/g, recipient.last_name || '')
        .replace(/\{\{building_name\}\}/g, recipient.building_name || '')
        .replace(/\{\{unit_number\}\}/g, recipient.unit_number || '')
        .replace(/\{\{agency_name\}\}/g, recipient.agency_name || '')
        .replace(/\{\{agency_address\}\}/g, recipient.agency_address || '')
        .replace(/\{\{agency_phone\}\}/g, recipient.agency_phone || '')
        .replace(/\{\{agency_email\}\}/g, recipient.agency_email || '')
        .replace(/\{\{current_date\}\}/g, currentDate);

      return [
        recipient.title || '',
        recipient.first_name || '',
        recipient.last_name || '',
        recipient.email || '',
        recipient.address_line_1 || '',
        recipient.address_line_2 || '',
        recipient.city || '',
        recipient.postcode || '',
        recipient.building_name || '',
        recipient.unit_number || '',
        recipient.agency_name || '',
        recipient.agency_address || '',
        recipient.agency_phone || '',
        recipient.agency_email || '',
        currentDate,
        template.name,
        subject,
        bodyText,
        bodyHtml
      ];
    });

    // Add test data if requested
    if (includeTestData) {
      const testRow = [
        'Mr',
        'Test',
        'User',
        'test@example.com',
        '123 Test Street',
        'Test Area',
        'Test City',
        'TE1 1ST',
        'Test Building',
        '1A',
        recipient.agency_name || '',
        recipient.agency_address || '',
        recipient.agency_phone || '',
        recipient.agency_email || '',
        new Date().toLocaleDateString('en-GB'),
        template.name,
        `Test ${template.subject_template}`,
        `Test ${template.body_text}`,
        `Test ${template.body_html}`
      ];
      csvRows.unshift(testRow);
    }

    // Create CSV content
    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => 
        row.map(field => 
          typeof field === 'string' && (field.includes(',') || field.includes('"') || field.includes('\n'))
            ? `"${field.replace(/"/g, '""')}"`
            : field
        ).join(',')
      )
    ].join('\n');

    // Log the export
    await supabase
      .from('communications_log')
      .insert({
        agency_id: profile.agency_id,
        type: 'word_csv_export',
        template_id: templateId,
        recipient_count: recipients.length,
        status: 'completed',
        metadata: {
          audience,
          building_ids: buildingIds,
          unit_ids: unitIds,
          include_test_data: includeTestData
        }
      });

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="mail-merge-${template.name.replace(/[^a-zA-Z0-9]/g, '-')}-${new Date().toISOString().split('T')[0]}.csv"`
      }
    });

  } catch (error) {
    console.error('Word CSV export error:', error);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}