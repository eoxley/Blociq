// Script to link ALL Ashwood House documents to the building library
const { createClient } = require('@supabase/supabase-js');

const BUILDING_ID = '2beeec1d-a94e-4058-b881-213d74cc6830';

async function linkAllAshwoodDocs() {
  console.log('🔗 Linking ALL Ashwood House documents to building...');

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    // 1. Find all Ashwood-related document jobs
    const { data: jobs, error: jobError } = await supabase
      .from('document_jobs')
      .select('*')
      .eq('status', 'READY')
      .order('created_at', { ascending: false });

    if (jobError) {
      console.error('❌ Error fetching jobs:', jobError);
      return;
    }

    // Filter for Ashwood documents
    const ashwoodJobs = jobs.filter(job => {
      const filename = job.filename?.toLowerCase() || '';
      return filename.includes('ashwood') ||
             filename.includes('5 ashwood') ||
             (job.extracted_text?.toLowerCase() || '').includes('ashwood');
    });

    console.log(`📊 Found ${ashwoodJobs.length} Ashwood-related documents:`);
    ashwoodJobs.forEach(job => {
      console.log(`  - ${job.filename} (${job.doc_category})`);
    });

    // 2. Link each document to the building
    for (const job of ashwoodJobs) {
      console.log(`\\n🔗 Processing: ${job.filename}`);

      // Determine category based on document type
      let category = 'General Documents';
      if (job.doc_category === 'lease') {
        category = 'Leases - Unit Specific';
      } else if (job.doc_category === 'compliance') {
        if (job.filename?.toLowerCase().includes('fire')) {
          category = 'Compliance - Fire Safety';
        } else if (job.filename?.toLowerCase().includes('eicr') || job.filename?.toLowerCase().includes('electrical')) {
          category = 'Compliance - Electrical';
        } else if (job.filename?.toLowerCase().includes('asbestos')) {
          category = 'Compliance - Asbestos';
        } else {
          category = 'Compliance - Other';
        }
      } else if (job.doc_category === 'major-works') {
        category = 'Major Works';
      }

      // Check if already linked
      const { data: existingDoc } = await supabase
        .from('building_documents')
        .select('id')
        .eq('building_id', BUILDING_ID)
        .eq('name', job.filename)
        .single();

      if (existingDoc) {
        console.log(`  ⚠️ Already linked: ${job.filename}`);
        continue;
      }

      // Create building document entry - use placeholder paths if not available
      const filePath = job.file_path || `/documents/${job.id}.pdf`;
      const documentData = {
        building_id: BUILDING_ID,
        name: job.filename,
        file_url: filePath,
        file_path: filePath, // This column is required
        type: job.mime || 'application/pdf',
        file_size: job.size_bytes || 0,
        uploaded_at: job.created_at,
        metadata: {
          source: 'document_analysis',
          document_job_id: job.id,
          analysis_completed: true,
          original_filename: job.filename,
          uploaded_by_user_id: job.user_id,
          ocr_status: 'completed',
          category_auto_detected: category,
          note: 'Linked from document analysis job'
        }
      };

      const { data: buildingDoc, error: docError } = await supabase
        .from('building_documents')
        .insert(documentData)
        .select()
        .single();

      if (docError) {
        console.error(`  ❌ Error linking ${job.filename}:`, docError);
        continue;
      }

      console.log(`  ✅ Successfully linked: ${job.filename} -> ${category}`);

      // Update job metadata
      await supabase
        .from('document_jobs')
        .update({
          metadata: {
            ...job.metadata,
            linked_to_building: BUILDING_ID,
            building_document_id: buildingDoc.id,
            linked_at: new Date().toISOString()
          }
        })
        .eq('id', job.id);
    }

    // 3. Final verification
    console.log('\\n📊 Final verification:');

    const { data: allBuildingDocs } = await supabase
      .from('building_documents')
      .select('name, type, metadata')
      .eq('building_id', BUILDING_ID)
      .order('created_at', { ascending: false });

    console.log('📄 All building documents:');
    allBuildingDocs?.forEach(doc => {
      const source = doc.metadata?.source || 'manual_upload';
      const category = doc.metadata?.category_auto_detected || 'unknown';
      console.log(`  - ${doc.name} (${source}, ${category})`);
    });

    console.log('\\n✅ All Ashwood documents linked successfully!');

  } catch (error) {
    console.error('❌ Script error:', error);
  }
}

linkAllAshwoodDocs().catch(console.error);