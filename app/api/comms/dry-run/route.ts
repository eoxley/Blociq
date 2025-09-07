import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase/server';
import { getTemplate } from '@/lib/comms/templates';
import { renderTemplate } from '@/lib/comms/merge';
import { z } from 'zod';

const DryRunRequestSchema = z.object({
  audience: z.enum(['all_buildings', 'specific_buildings', 'specific_units']),
  buildingIds: z.array(z.string()).optional(),
  unitIds: z.array(z.string()).optional(),
  templateId: z.string(),
  limit: z.number().min(1).max(10).default(3),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { audience, buildingIds, unitIds, templateId, limit } = DryRunRequestSchema.parse(body);

    const supabase = getServerClient();
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

    // Build query based on audience
    let query = supabase
      .from('v_building_recipients')
      .select('*')
      .eq('agency_id', profile.agency_id)
      .limit(limit);

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

    // Process each recipient for dry run
    const results = [];
    const errors = [];
    const warnings = [];

    for (const recipient of recipients) {
      try {
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

        results.push({
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
          warnings: mergeResult.warnings
        });

        if (mergeResult.warnings.length > 0) {
          warnings.push({
            recipient: recipient.leaseholder_name,
            warnings: mergeResult.warnings
          });
        }

      } catch (error) {
        errors.push({
          recipient: recipient.leaseholder_name,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Log the dry run
    await supabase
      .from('communications_log')
      .insert({
        agency_id: profile.agency_id,
        type: 'preview',
        template_id: templateId,
        recipient_count: recipients.length,
        status: 'completed',
        metadata: {
          audience,
          building_ids: buildingIds,
          unit_ids: unitIds,
          dry_run: true,
          limit
        }
      });

    return NextResponse.json({
      success: true,
      dry_run: true,
      template: {
        id: template.id,
        name: template.name,
        type: template.type
      },
      audience: {
        type: audience,
        building_ids: buildingIds,
        unit_ids: unitIds
      },
      results: {
        total: recipients.length,
        successful: results.length,
        failed: errors.length,
        warnings: warnings.length
      },
      data: results,
      errors,
      warnings,
      summary: {
        estimated_recipients: recipients.length,
        fields_used: [...new Set(results.flatMap(r => r.fields_used))],
        fields_missing: [...new Set(results.flatMap(r => r.fields_missing))],
        common_warnings: warnings.length > 0 ? warnings[0].warnings : []
      }
    });

  } catch (error) {
    console.error('Dry run error:', error);
    return NextResponse.json({ error: 'Dry run failed' }, { status: 500 });
  }
}
