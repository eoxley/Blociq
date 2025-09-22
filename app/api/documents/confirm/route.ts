import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

export const maxDuration = 60; // 1 minute for confirmation processing

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get the current user
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session?.user) {
      return NextResponse.json({
        error: 'Authentication required',
        message: 'Please log in to confirm document actions'
      }, { status: 401 });
    }

    const user = session.user;
    const { document_id, building_id, analysis_results, confirmed, classification } = await req.json();

    if (!document_id || !analysis_results || confirmed === undefined) {
      return NextResponse.json({
        error: 'Missing required parameters',
        message: 'document_id, analysis_results, and confirmed status are required'
      }, { status: 400 });
    }

    console.log('🔄 Processing document confirmation:', {
      document_id,
      building_id,
      confirmed,
      category: classification?.category,
      user_id: user.id
    });

    // Update the analysis log with user decision
    await serviceSupabase
      .from('ai_analysis_logs')
      .update({
        user_confirmed: confirmed,
        confirmed_at: new Date().toISOString(),
        confirmed_by: user.id,
        building_id: building_id || null,
        status: confirmed ? 'confirmed' : 'declined'
      })
      .eq('document_job_id', document_id);

    if (!confirmed) {
      console.log('❌ User declined document action');
      return NextResponse.json({
        success: true,
        message: 'Document action declined',
        action: 'declined'
      });
    }

    // Route to appropriate confirmation handler based on document category
    const category = classification?.category || analysis_results.document_type || 'general';

    switch (category) {
      case 'compliance':
        return await handleComplianceConfirmation(serviceSupabase, user, document_id, building_id, analysis_results);

      case 'major_works':
        return await handleMajorWorksConfirmation(serviceSupabase, user, document_id, building_id, analysis_results);

      case 'general':
        return await handleGeneralConfirmation(serviceSupabase, user, document_id, building_id, analysis_results);

      default:
        console.warn('⚠️ Unknown document category, treating as general document');
        return await handleGeneralConfirmation(serviceSupabase, user, document_id, building_id, analysis_results);
    }

  } catch (error) {
    console.error('❌ Error in document confirmation:', error);
    return NextResponse.json({
      error: 'Confirmation failed',
      message: error instanceof Error ? error.message : 'An unexpected error occurred'
    }, { status: 500 });
  }
}

// Compliance document confirmation handler
async function handleComplianceConfirmation(serviceSupabase: any, user: any, document_id: string, building_id: string, analysis_results: any) {
  if (!building_id) {
    return NextResponse.json({
      error: 'Building required',
      message: 'Building ID is required when confirming compliance asset creation'
    }, { status: 400 });
  }

  // Get building information
  const { data: building, error: buildingError } = await serviceSupabase
    .from('buildings')
    .select('id, name, address')
    .eq('id', building_id)
    .single();

  if (buildingError || !building) {
    return NextResponse.json({
      error: 'Building not found',
      message: 'The specified building could not be found'
    }, { status: 404 });
  }

  console.log('✅ User confirmed compliance asset creation for building:', building.name);

  // Map document types to compliance asset categories
  const docTypeMapping: Record<string, string> = {
    'EICR': 'Electrical Installation Condition Report',
    'Fire Risk Assessment': 'Fire Risk Assessment',
    'Gas Safety Certificate': 'Gas Safety Check',
    'Asbestos Survey': 'Asbestos Survey',
    'Water Hygiene Assessment': 'Legionella Risk Assessment',
    'Fire Alarm Service Report': 'Fire Alarm Test',
    'Emergency Lighting Test': 'Emergency Lighting Test',
    'Fire Door Inspection': 'Fire Door Inspection',
    'Lift LOLER': 'Lift Thorough Examination'
  };

  const assetName = docTypeMapping[analysis_results.document_type] || analysis_results.document_type;

  // Look up or create compliance asset
  let { data: complianceAsset, error: assetLookupError } = await serviceSupabase
    .from('compliance_assets')
    .select('id')
    .eq('name', assetName)
    .single();

  if (assetLookupError && assetLookupError.code === 'PGRST116') {
    // Asset doesn't exist, create it
    console.log('📝 Creating new compliance asset:', assetName);
    const { data: newAsset, error: createAssetError } = await serviceSupabase
      .from('compliance_assets')
      .insert({
        name: assetName,
        category: analysis_results.document_type,
        description: `${analysis_results.document_type} compliance tracking`,
        frequency_months: analysis_results.document_type === 'EICR' ? 60 : 12, // EICR every 5 years, others annually
        created_at: new Date().toISOString()
      })
      .select('id')
      .single();

    if (createAssetError) {
      console.error('❌ Failed to create compliance asset:', createAssetError);
      return NextResponse.json({
        error: 'Failed to create compliance asset',
        message: createAssetError.message
      }, { status: 500 });
    }

    complianceAsset = newAsset;
  } else if (assetLookupError) {
    console.error('❌ Failed to lookup compliance asset:', assetLookupError);
    return NextResponse.json({
      error: 'Failed to lookup compliance asset',
      message: assetLookupError.message
    }, { status: 500 });
  }

  // Create or update building compliance asset
  const complianceStatus = analysis_results.compliance_status === 'satisfactory' ? 'compliant' :
                          analysis_results.compliance_status === 'unsatisfactory' ? 'overdue' : 'requires_action';

  const buildingAssetData = {
    building_id: building_id,
    compliance_asset_id: complianceAsset.id,
    last_completed_date: analysis_results.inspection_details?.inspection_date || new Date().toISOString().split('T')[0],
    next_due_date: analysis_results.inspection_details?.next_inspection_due,
    status: complianceStatus,
    document_id: document_id,
    contractor: analysis_results.inspection_details?.inspector_company || analysis_results.inspection_details?.inspector_name,
    notes: `${analysis_results.document_type} - ${analysis_results.compliance_status}. Certificate: ${analysis_results.inspection_details?.certificate_number || 'N/A'}`,
    updated_at: new Date().toISOString()
  };

  console.log('🏗️ Creating building compliance asset record');
  const { data: buildingAsset, error: buildingAssetError } = await serviceSupabase
    .from('building_compliance_assets')
    .upsert(buildingAssetData, {
      onConflict: 'building_id,compliance_asset_id',
      ignoreDuplicates: false
    })
    .select('id')
    .single();

  if (buildingAssetError) {
    console.error('❌ Failed to create building compliance asset:', buildingAssetError);
    return NextResponse.json({
      error: 'Failed to create building compliance asset',
      message: buildingAssetError.message
    }, { status: 500 });
  }

  // Create compliance alerts for urgent findings (C1/C2)
  const urgentFindings = analysis_results.key_findings?.filter((finding: any) =>
    typeof finding === 'object' &&
    (finding.classification === 'C1' || finding.classification === 'C2')
  ) || [];

  if (urgentFindings.length > 0) {
    console.log(`🚨 Creating ${urgentFindings.length} compliance alerts for urgent findings`);

    const alertsData = urgentFindings.map((finding: any) => ({
      building_id: building_id,
      compliance_asset_id: complianceAsset.id,
      alert_type: finding.classification === 'C1' ? 'immediate_danger' : 'potentially_dangerous',
      alert_message: `${finding.classification}: ${finding.observation}`,
      finding_details: finding,
      priority: finding.classification === 'C1' ? 'immediate' : 'urgent',
      status: 'open',
      created_at: new Date().toISOString()
    }));

    const { error: alertsError } = await serviceSupabase
      .from('compliance_alerts')
      .insert(alertsData);

    if (alertsError) {
      console.warn('⚠️ Failed to create compliance alerts:', alertsError.message);
    } else {
      console.log('✅ Compliance alerts created successfully');
    }
  }

  // Create Outlook calendar event if next inspection date is available
  let outlookEventCreated = false;
  let outlookEventId = null;
  if (analysis_results.inspection_details?.next_inspection_due) {
    const outlookResult = await createOutlookEvent(building, analysis_results, urgentFindings);
    outlookEventCreated = outlookResult.success;
    outlookEventId = outlookResult.eventId;

    // Update building compliance asset with outlook event ID
    if (outlookEventId && buildingAsset) {
      await serviceSupabase
        .from('building_compliance_assets')
        .update({ outlook_event_id: outlookEventId })
        .eq('id', buildingAsset.id);
    }
  }

  console.log('🎉 Compliance asset creation completed successfully');

  return NextResponse.json({
    success: true,
    message: 'Compliance asset created successfully',
    category: 'compliance',
    building_asset_id: buildingAsset.id,
    compliance_asset_id: complianceAsset.id,
    urgent_findings_count: urgentFindings.length,
    outlook_event_created: outlookEventCreated,
    next_inspection_due: analysis_results.inspection_details?.next_inspection_due
  });
}

// Major Works document confirmation handler
async function handleMajorWorksConfirmation(serviceSupabase: any, user: any, document_id: string, building_id: string, analysis_results: any) {
  if (!building_id) {
    return NextResponse.json({
      error: 'Building required',
      message: 'Building ID is required when confirming major works tracking'
    }, { status: 400 });
  }

  console.log('✅ User confirmed major works tracking creation');

  // Create major works project record
  const projectData = {
    building_id: building_id,
    document_id: document_id,
    project_type: analysis_results.document_type,
    stage: analysis_results.stage || 'NOI',
    description: analysis_results.project_description || `${analysis_results.document_type} - ${analysis_results.stage || 'Stage unknown'}`,
    estimated_cost: analysis_results.financial_details?.estimated_cost,
    consultation_period_start: analysis_results.consultation_details?.start_date,
    consultation_period_end: analysis_results.consultation_details?.end_date,
    status: analysis_results.stage === 'Award' ? 'awarded' : 'in_consultation',
    contractor: analysis_results.contractor_details?.name,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const { data: majorWorksProject, error: projectError } = await serviceSupabase
    .from('major_works_projects')
    .insert(projectData)
    .select('id')
    .single();

  if (projectError) {
    console.error('❌ Failed to create major works project:', projectError);
    return NextResponse.json({
      error: 'Failed to create major works project',
      message: projectError.message
    }, { status: 500 });
  }

  console.log('🎉 Major works project created successfully');

  return NextResponse.json({
    success: true,
    message: 'Major works project created successfully',
    category: 'major_works',
    project_id: majorWorksProject.id,
    stage: analysis_results.stage,
    outlook_event_created: false // Major works don't typically need calendar reminders
  });
}

// General document confirmation handler
async function handleGeneralConfirmation(serviceSupabase: any, user: any, document_id: string, building_id: string, analysis_results: any) {
  console.log('✅ User confirmed general document filing');

  // For general documents, we might just want to update metadata or create a filing record
  const filingData = {
    document_id: document_id,
    building_id: building_id || null,
    document_type: analysis_results.document_type,
    category: 'general',
    summary: analysis_results.summary || 'General document processed',
    filing_notes: analysis_results.suggested_action || 'Document filed for reference',
    filed_by: user.id,
    filed_at: new Date().toISOString()
  };

  const { data: filing, error: filingError } = await serviceSupabase
    .from('document_filings')
    .insert(filingData)
    .select('id')
    .single();

  if (filingError) {
    console.warn('⚠️ Failed to create document filing record:', filingError.message);
  }

  console.log('🎉 General document filed successfully');

  return NextResponse.json({
    success: true,
    message: 'Document filed successfully',
    category: 'general',
    filing_id: filing?.id,
    outlook_event_created: false
  });
}

// Helper function to create Outlook calendar events
async function createOutlookEvent(building: any, analysis_results: any, urgentFindings: any[]): Promise<{success: boolean, eventId?: string}> {
  try {
    console.log('📅 Creating Outlook calendar reminder');

    const eventTitle = `${analysis_results.document_type} Renewal – ${building.name}`;
    const eventDate = new Date(analysis_results.inspection_details.next_inspection_due);

    // Set event time to 4PM UK time
    eventDate.setHours(16, 0, 0, 0);

    const eventDescription = `
${analysis_results.document_type} inspection is due for ${building.name}.

Inspection Details:
• Property: ${building.name}
• Address: ${building.address}
• Document Type: ${analysis_results.document_type}
• Last Inspection: ${analysis_results.inspection_details?.inspection_date ? new Date(analysis_results.inspection_details.inspection_date).toLocaleDateString('en-GB') : 'Unknown'}
• Inspector: ${analysis_results.inspection_details?.inspector_name || 'Unknown'}
• Certificate: ${analysis_results.inspection_details?.certificate_number || 'N/A'}

${urgentFindings.length > 0 ? `⚠️ ${urgentFindings.length} urgent finding(s) from last inspection require attention.` : ''}

View document in BlocIQ: ${process.env.NEXT_PUBLIC_SITE_URL}/documents/compliance
    `.trim();

    // Call Outlook calendar integration
    const calendarResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/outlook/calendar/create-event`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subject: eventTitle,
        start: eventDate.toISOString(),
        end: new Date(eventDate.getTime() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours duration
        description: eventDescription,
        reminderMinutes: 30 * 24 * 60, // 30 days in minutes
        isAllDay: false,
        attendees: [], // Will use default user
        location: building.address
      })
    });

    if (calendarResponse.ok) {
      const calendarResult = await calendarResponse.json();
      console.log('✅ Outlook calendar event created successfully');
      return {
        success: true,
        eventId: calendarResult.eventId || calendarResult.id
      };
    } else {
      console.warn('⚠️ Failed to create Outlook calendar event:', await calendarResponse.text());
      return { success: false };
    }
  } catch (calendarError) {
    console.warn('⚠️ Error creating Outlook calendar event:', calendarError);
    return { success: false };
  }
}