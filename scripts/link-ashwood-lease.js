// Script to link existing 5 Ashwood House lease analysis to the building
// Run with: node scripts/link-ashwood-lease.js

const { createClient } = require('@supabase/supabase-js');

const BUILDING_ID = '2beeec1d-a94e-4058-b881-213d74cc6830';
const BUILDING_NAME = '5 Ashwood House';

async function main() {
  console.log('🔗 Linking 5 Ashwood House lease analysis to building...');

  // Initialize Supabase client with service role
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    // 1. Find existing lease analysis jobs for 5 Ashwood House
    console.log('📋 Searching for completed lease analysis jobs...');

    const { data: jobs, error: jobError } = await supabase
      .from('document_jobs')
      .select('*')
      .eq('doc_category', 'lease')
      .eq('status', 'completed')
      .order('created_at', { ascending: false });

    if (jobError) {
      console.error('❌ Error fetching jobs:', jobError);
      return;
    }

    console.log(`📊 Found ${jobs.length} completed lease analysis jobs`);

    // 2. Look for jobs that mention Ashwood House in filename or content
    const ashwoodJobs = jobs.filter(job => {
      const filename = job.filename?.toLowerCase() || '';
      const extractedText = job.extracted_text?.toLowerCase() || '';

      return filename.includes('ashwood') ||
             extractedText.includes('ashwood') ||
             extractedText.includes('5 ashwood house');
    });

    console.log(`🏠 Found ${ashwoodJobs.length} jobs related to Ashwood House:`,
                ashwoodJobs.map(j => ({ id: j.id, filename: j.filename })));

    if (ashwoodJobs.length === 0) {
      console.log('ℹ️ No Ashwood House lease analysis found. Upload a lease through Lease Lab first.');
      return;
    }

    // 3. Link each job to the building
    for (const job of ashwoodJobs) {
      console.log(`🔗 Linking job ${job.id} (${job.filename}) to building...`);

      try {
        // Call our link API
        const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/lease-lab/link-to-building`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
          },
          body: JSON.stringify({
            jobId: job.id,
            buildingId: BUILDING_ID
          })
        });

        if (response.ok) {
          const result = await response.json();
          console.log(`✅ Successfully linked: ${result.message}`);
        } else {
          const error = await response.text();
          console.error(`❌ Failed to link job ${job.id}:`, error);
        }

      } catch (linkError) {
        console.error(`❌ Error linking job ${job.id}:`, linkError.message);
      }

      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // 4. Verify the results
    console.log('\n📊 Verifying results...');

    const { data: buildingDocs, error: docsError } = await supabase
      .from('building_documents')
      .select('*')
      .eq('building_id', BUILDING_ID)
      .eq('category', 'Leases - Unit Specific');

    if (!docsError && buildingDocs) {
      console.log(`📄 Building now has ${buildingDocs.length} lease documents:`,
                  buildingDocs.map(d => ({ name: d.name, category: d.category })));
    }

    const { data: leases, error: leasesError } = await supabase
      .from('leases')
      .select('*')
      .eq('building_id', BUILDING_ID);

    if (!leasesError && leases) {
      console.log(`📋 Building now has ${leases.length} lease entries:`,
                  leases.map(l => ({ unit: l.unit_number, leaseholder: l.leaseholder_name })));
    }

    console.log('✅ Linking process completed!');

  } catch (error) {
    console.error('❌ Script error:', error);
  }
}

// Run the script
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };