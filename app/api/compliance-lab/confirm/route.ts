import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

export const maxDuration = 60; // 1 minute for confirmation processing

// Helper function to create building document and link to compliance asset
async function createBuildingDocumentAndLink(
  serviceSupabase: any,
  document_job_id: string,
  building_id: string,
  analysis_results: any,
  building_compliance_asset_id?: string
): Promise<{ success: boolean, building_document_id?: string, error?: string }> {
  try {
    // First, get the document job details
    const { data: documentJob, error: jobError } = await serviceSupabase
      .from('document_jobs')
      .select('*')
      .eq('id', document_job_id)
      .single();

    if (jobError || !documentJob) {
      console.error('❌ Failed to find document job:', jobError);
      return { success: false, error: 'Document job not found' };
    }

    // Check if a building document already exists for this job
    let { data: existingDoc, error: lookupError } = await serviceSupabase
      .from('building_documents')
      .select('id')
      .or(`file_name.eq.${documentJob.filename},metadata->>document_job_id.eq.${document_job_id}`)
      .eq('building_id', building_id)
      .single();

    let buildingDocumentId;

    if (existingDoc) {
      console.log('📄 Found existing building document:', existingDoc.id);
      buildingDocumentId = existingDoc.id;
    } else {
      // Create new building document
      console.log('📝 Creating new building document from job:', document_job_id);

      // Try to get file URL from OCR or summary JSON
      let fileUrl = null;
      if (documentJob.summary_json?.file_url) {
        fileUrl = documentJob.summary_json.file_url;
      } else if (documentJob.ocr_artifact_url) {
        fileUrl = documentJob.ocr_artifact_url;
      }

      const buildingDocData = {
        building_id: building_id,
        name: documentJob.filename,
        type: analysis_results.document_type || documentJob.doc_type_guess || 'Compliance Document',
        category: 'compliance',
        file_path: fileUrl || `processed/${document_job_id}`,
        file_size: documentJob.size_bytes,
        uploaded_at: documentJob.created_at,
        uploaded_by: documentJob.user_id,
        ocr_status: 'completed',
        metadata: {
          document_job_id: document_job_id,
          document_type: analysis_results.document_type,
          compliance_status: analysis_results.compliance_status,
          inspection_date: analysis_results.inspection_details?.inspection_date,
          certificate_number: analysis_results.inspection_details?.certificate_number,
          inspector_name: analysis_results.inspection_details?.inspector_name,
          inspector_company: analysis_results.inspection_details?.inspector_company,
          ai_extracted: analysis_results
        }
      };

      const { data: newDoc, error: createError } = await serviceSupabase
        .from('building_documents')
        .insert(buildingDocData)
        .select('id')
        .single();

      if (createError) {
        console.error('❌ Failed to create building document:', createError);
        return { success: false, error: createError.message };
      }

      console.log('✅ Created building document:', newDoc.id);
      buildingDocumentId = newDoc.id;
    }

    // If we have a building compliance asset, create the link
    if (building_compliance_asset_id && buildingDocumentId) {
      console.log('🔗 Linking document to compliance asset');

      // Check if link already exists
      const { data: existingLink } = await serviceSupabase
        .from('building_compliance_documents')
        .select('id')
        .eq('building_compliance_asset_id', building_compliance_asset_id)
        .eq('document_id', buildingDocumentId)
        .single();

      if (!existingLink) {
        const { error: linkError } = await serviceSupabase
          .from('building_compliance_documents')
          .insert({
            building_compliance_asset_id: building_compliance_asset_id,
            document_id: buildingDocumentId,
            created_at: new Date().toISOString()
          });

        if (linkError) {
          console.warn('⚠️ Failed to link document to compliance asset:', linkError.message);
        } else {
          console.log('✅ Document linked to compliance asset');
        }
      }
    }

    return { success: true, building_document_id: buildingDocumentId };

  } catch (error) {
    console.error('❌ Error in createBuildingDocumentAndLink:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

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
        message: 'Please log in to confirm compliance assets'
      }, { status: 401 });
    }

    const user = session.user;
    const { document_id, building_id, analysis_results, confirmed } = await req.json();

    if (!document_id || !analysis_results || confirmed === undefined) {
      return NextResponse.json({
        error: 'Missing required parameters',
        message: 'document_id, analysis_results, and confirmed status are required'
      }, { status: 400 });
    }

    console.log('🔄 Processing compliance confirmation:', {
      document_id,
      building_id,
      confirmed,
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
      console.log('❌ User declined compliance asset creation');
      return NextResponse.json({
        success: true,
        message: 'Compliance asset creation declined',
        action: 'declined'
      });
    }

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

    // First create the building document from the job
    const docResult = await createBuildingDocumentAndLink(
      serviceSupabase,
      document_id,
      building_id,
      analysis_results
    );

    const buildingAssetData = {
      building_id: building_id,
      compliance_asset_id: complianceAsset.id,
      last_renewed_date: analysis_results.inspection_details?.inspection_date || new Date().toISOString().split('T')[0],
      next_due_date: analysis_results.inspection_details?.next_inspection_due,
      status: complianceStatus,
      // Use the building document ID if available, otherwise leave null
      latest_document_id: docResult.success ? docResult.building_document_id : null,
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

    // Now link the document to the compliance asset if we have both
    if (docResult.success && buildingAsset && docResult.building_document_id) {
      await createBuildingDocumentAndLink(
        serviceSupabase,
        document_id,
        building_id,
        analysis_results,
        buildingAsset.id // Pass the building compliance asset ID
      );
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
    if (analysis_results.inspection_details?.next_inspection_due) {
      try {
        console.log('📅 Creating Outlook calendar reminder');

        const eventTitle = `${analysis_results.document_type} Renewal – ${building.name}`;
        const eventDate = new Date(analysis_results.inspection_details.next_inspection_due);

        // Set reminder for 30 days before
        const reminderDate = new Date(eventDate);
        reminderDate.setDate(reminderDate.getDate() - 30);

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
          outlookEventCreated = true;
          console.log('✅ Outlook calendar event created successfully');
        } else {
          console.warn('⚠️ Failed to create Outlook calendar event:', await calendarResponse.text());
        }
      } catch (calendarError) {
        console.warn('⚠️ Error creating Outlook calendar event:', calendarError);
      }
    }

    console.log('🎉 Compliance asset creation completed successfully');

    return NextResponse.json({
      success: true,
      message: 'Compliance asset created successfully',
      building_asset_id: buildingAsset.id,
      compliance_asset_id: complianceAsset.id,
      urgent_findings_count: urgentFindings.length,
      outlook_event_created: outlookEventCreated,
      next_inspection_due: analysis_results.inspection_details?.next_inspection_due
    });

  } catch (error) {
    console.error('❌ Error in compliance confirmation:', error);
    return NextResponse.json({
      error: 'Confirmation failed',
      message: error instanceof Error ? error.message : 'An unexpected error occurred'
    }, { status: 500 });
  }
}