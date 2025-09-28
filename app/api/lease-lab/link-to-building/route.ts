import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    // Check if this is an internal service call (from analysis completion)
    const authHeader = req.headers.get('Authorization');
    const isServiceCall = authHeader && authHeader.includes(process.env.SUPABASE_SERVICE_ROLE_KEY!);

    let supabase;
    let userId = null;

    if (isServiceCall) {
      // Use service role for internal calls
      supabase = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      console.log('🔧 Internal service call detected');
    } else {
      // Regular user authentication for external calls
      supabase = await createClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      userId = session.user.id;
    }

    const { jobId, buildingId } = await req.json();

    if (!jobId || !buildingId) {
      return NextResponse.json({
        error: 'Missing required parameters',
        message: 'jobId and buildingId are required'
      }, { status: 400 });
    }

    // Get the document job details (using service role for internal operations)
    const serviceSupabase = isServiceCall ? supabase : createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: job, error: jobError } = await serviceSupabase
      .from('document_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      return NextResponse.json({
        error: 'Job not found',
        message: 'Could not find the specified lease analysis job'
      }, { status: 404 });
    }

    // Verify building exists (using regular supabase for RLS compliance)
    const { data: building, error: buildingError } = await (isServiceCall ? serviceSupabase : supabase)
      .from('buildings')
      .select('id, name')
      .eq('id', buildingId)
      .single();

    if (buildingError || !building) {
      return NextResponse.json({
        error: 'Building not found',
        message: 'Could not find the specified building'
      }, { status: 404 });
    }

    console.log(`🔗 Linking lease analysis job ${jobId} to building ${buildingId}`);

    // 1. Create building document entry for the lease PDF
    const { data: buildingDoc, error: docError } = await serviceSupabase
      .from('building_documents')
      .insert({
        building_id: buildingId,
        name: job.filename || 'Lease Document',
        original_filename: job.filename,
        file_type: job.mime || 'application/pdf',
        file_path: job.file_path,
        file_size: job.size_bytes || 0,
        category: 'Leases - Unit Specific',
        uploaded_at: job.created_at,
        uploaded_by_user_id: job.user_id,
        ocr_status: job.status === 'completed' ? 'completed' : 'pending',
        ocr_text: job.extracted_text,
        metadata: {
          source: 'lease_analysis',
          document_job_id: jobId,
          analysis_completed: job.status === 'completed'
        }
      })
      .select()
      .single();

    if (docError) {
      console.error('Error creating building document:', docError);
      return NextResponse.json({
        error: 'Failed to create building document',
        message: 'Could not save lease document to building library'
      }, { status: 500 });
    }

    // 2. Create lease entry if analysis is complete
    let leaseEntry = null;
    if (job.status === 'completed' && job.analysis_json) {
      try {
        const analysis = typeof job.analysis_json === 'string'
          ? JSON.parse(job.analysis_json)
          : job.analysis_json;

        // Extract key information from analysis
        const basicDetails = analysis.basic_property_details || {};
        const summary = analysis.executive_summary || '';

        // Try to extract dates and key info
        let startDate = null, endDate = null, leaseholderName = null;

        if (basicDetails.lease_term) {
          const termMatch = basicDetails.lease_term.match(/(\d{1,2}(?:st|nd|rd|th)?\s+\w+\s+\d{4})/g);
          if (termMatch && termMatch.length > 0) {
            startDate = termMatch[0];
          }
        }

        if (basicDetails.parties) {
          const lesseeMatch = basicDetails.parties.find(p => p.includes('Lessee:'));
          if (lesseeMatch) {
            leaseholderName = lesseeMatch.replace('Lessee:', '').trim();
          }
        }

        // Extract unit info from summary or property description
        let unitNumber = 'Unknown';
        if (basicDetails.property_description) {
          const unitMatch = basicDetails.property_description.match(/(?:Flat|Unit|Plot)\s+(\w+)/i);
          if (unitMatch) {
            unitNumber = unitMatch[1];
          }
        }

        const { data: lease, error: leaseError } = await serviceSupabase
          .from('leases')
          .insert({
            building_id: buildingId,
            unit_number: unitNumber,
            leaseholder_name: leaseholderName || 'Unknown',
            start_date: startDate || '1900-01-01',
            end_date: endDate || '2999-12-31',
            status: 'active',
            document_job_id: jobId,
            file_path: job.file_path,
            ocr_text: job.extracted_text,
            analysis_json: job.analysis_json,
            scope: 'unit',
            metadata: {
              original_filename: job.filename,
              linked_at: new Date().toISOString(),
              building_document_id: buildingDoc.id
            }
          })
          .select()
          .single();

        if (leaseError) {
          console.warn('Could not create lease entry:', leaseError);
        } else {
          leaseEntry = lease;
          console.log(`✅ Created lease entry for ${leaseholderName} - Unit ${unitNumber}`);
        }

      } catch (parseError) {
        console.warn('Could not parse analysis JSON:', parseError);
      }
    }

    // 3. Update job to mark it as linked
    await serviceSupabase
      .from('document_jobs')
      .update({
        metadata: {
          ...job.metadata,
          linked_to_building: buildingId,
          building_document_id: buildingDoc.id,
          linked_at: new Date().toISOString()
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId);

    console.log(`✅ Successfully linked lease analysis to building ${building.name}`);

    return NextResponse.json({
      success: true,
      message: `Lease document successfully linked to ${building.name}`,
      data: {
        building_document: buildingDoc,
        lease_entry: leaseEntry,
        job_id: jobId,
        building_id: buildingId
      }
    });

  } catch (error) {
    console.error('Error linking lease to building:', error);
    return NextResponse.json({
      error: 'Internal server error',
      message: 'Failed to link lease analysis to building'
    }, { status: 500 });
  }
}