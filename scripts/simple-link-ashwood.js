// Simple script to directly link the Ashwood lease to building documents
const { createClient } = require('@supabase/supabase-js');

const BUILDING_ID = '2beeec1d-a94e-4058-b881-213d74cc6830';
const LEASE_JOB_ID = 'b2fe1850-b3d0-4893-85d7-4c2f636e1b57';

async function linkLeaseDirectly() {
  console.log('🔗 Directly linking Ashwood lease to building documents...');

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    // 1. Get the lease job details
    const { data: job, error: jobError } = await supabase
      .from('document_jobs')
      .select('*')
      .eq('id', LEASE_JOB_ID)
      .single();

    if (jobError) {
      console.error('❌ Error fetching job:', jobError);
      return;
    }

    console.log('📋 Found lease job:', {
      id: job.id,
      filename: job.filename,
      status: job.status,
      fileSize: job.size_bytes
    });

    // 2. Create building document entry
    const { data: buildingDoc, error: docError } = await supabase
      .from('building_documents')
      .insert({
        building_id: BUILDING_ID,
        name: job.filename || '5 Ashwood House Lease.pdf',
        file_url: job.file_path,
        type: job.mime || 'application/pdf',
        metadata: {
          source: 'lease_analysis',
          document_job_id: LEASE_JOB_ID,
          analysis_completed: job.status === 'READY',
          original_filename: job.filename,
          file_size: job.size_bytes,
          uploaded_by_user_id: job.user_id,
          ocr_status: job.status === 'READY' ? 'completed' : 'pending',
          ocr_text: job.extracted_text
        }
      })
      .select()
      .single();

    if (docError) {
      console.error('❌ Error creating building document:', docError);
      return;
    }

    console.log('✅ Created building document:', {
      id: buildingDoc.id,
      name: buildingDoc.name,
      category: buildingDoc.category
    });

    // 3. Update the job to mark it as linked
    const { error: updateError } = await supabase
      .from('document_jobs')
      .update({
        metadata: {
          ...job.metadata,
          linked_to_building: BUILDING_ID,
          building_document_id: buildingDoc.id,
          linked_at: new Date().toISOString()
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', LEASE_JOB_ID);

    if (updateError) {
      console.error('❌ Error updating job metadata:', updateError);
    } else {
      console.log('✅ Updated job metadata to mark as linked');
    }

    // 4. Verify results
    console.log('\n📊 Verification:');

    const { data: buildingDocs } = await supabase
      .from('building_documents')
      .select('name, category, metadata')
      .eq('building_id', BUILDING_ID);

    console.log('📄 Building documents:', buildingDocs?.map(d => ({
      name: d.name,
      category: d.category,
      isLinkedLease: d.metadata?.source === 'lease_analysis'
    })));

    const { data: leases } = await supabase
      .from('leases')
      .select('unit_number, leaseholder_name, document_job_id')
      .eq('building_id', BUILDING_ID);

    console.log('📋 Lease entries:', leases?.map(l => ({
      unit: l.unit_number,
      leaseholder: l.leaseholder_name,
      hasJobId: !!l.document_job_id
    })));

    console.log('✅ Linking completed successfully!');

  } catch (error) {
    console.error('❌ Script error:', error);
  }
}

linkLeaseDirectly().catch(console.error);