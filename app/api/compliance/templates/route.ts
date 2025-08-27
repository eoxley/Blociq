import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Get all compliance templates
    const { data: templates, error: templatesError } = await supabase
      .from('compliance_templates')
      .select('*')
      .order('category, asset_name');

    if (templatesError) {
      console.error('Error fetching compliance templates:', templatesError);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to fetch compliance templates',
        details: templatesError.message 
      }, { status: 500 });
    }

    // Group templates by category
    const groupedTemplates = templates.reduce((acc, template) => {
      if (!acc[template.category]) {
        acc[template.category] = [];
      }
      acc[template.category].push(template);
      return acc;
    }, {} as Record<string, typeof templates>);

    return NextResponse.json({
      success: true,
      data: {
        templates: templates || [],
        groupedTemplates,
        categories: Object.keys(groupedTemplates),
        lastUpdated: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Compliance templates API error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { asset_type, asset_name, category, description, default_frequency, is_required_by_default, is_hrb_only, priority } = body;

    if (!asset_type || !asset_name || !category) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required fields: asset_type, asset_name, category' 
      }, { status: 400 });
    }

    // Insert new compliance template
    const { data: newTemplate, error: insertError } = await supabase
      .from('compliance_templates')
      .insert({
        asset_type,
        asset_name,
        category,
        description,
        default_frequency: default_frequency || 'annual',
        is_required_by_default: is_required_by_default !== undefined ? is_required_by_default : true,
        is_hrb_only: is_hrb_only || false,
        priority: priority || 'medium'
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting compliance template:', insertError);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to create compliance template',
        details: insertError.message 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: newTemplate
    });

  } catch (error) {
    console.error('Compliance templates POST API error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
