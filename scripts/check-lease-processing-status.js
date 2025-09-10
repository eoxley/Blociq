const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xqxaatvykmaaynqeoemy.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

async function checkLeaseProcessingStatus() {
  try {
    console.log('🔍 Checking lease processing jobs...\n');

    // Get all recent processing jobs
    const { data: jobs, error } = await supabase
      .from('lease_processing_jobs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('❌ Error fetching jobs:', error);
      return;
    }

    if (!jobs || jobs.length === 0) {
      console.log('📭 No processing jobs found');
      return;
    }

    console.log(`📊 Found ${jobs.length} recent processing jobs:\n`);

    jobs.forEach((job, index) => {
      const created = new Date(job.created_at);
      const now = new Date();
      const elapsed = Math.round((now - created) / 1000 / 60); // minutes

      console.log(`${index + 1}. ${job.filename}`);
      console.log(`   Status: ${job.status}`);
      console.log(`   Created: ${created.toLocaleString()}`);
      console.log(`   Elapsed: ${elapsed} minutes`);
      
      if (job.processing_started_at) {
        const started = new Date(job.processing_started_at);
        const processingElapsed = Math.round((now - started) / 1000 / 60);
        console.log(`   Processing started: ${started.toLocaleString()}`);
        console.log(`   Processing time: ${processingElapsed} minutes`);
      }
      
      if (job.error_message) {
        console.log(`   Error: ${job.error_message}`);
      }
      
      if (job.status === 'processing' && elapsed > 30) {
        console.log(`   ⚠️  STUCK: Processing for ${elapsed} minutes (likely OCR timeout)`);
      }
      
      console.log('');
    });

    // Check for stuck jobs
    const stuckJobs = jobs.filter(job => 
      job.status === 'processing' && 
      new Date(job.created_at) < new Date(Date.now() - 30 * 60 * 1000) // 30 minutes ago
    );

    if (stuckJobs.length > 0) {
      console.log('🚨 STUCK JOBS DETECTED:');
      stuckJobs.forEach(job => {
        console.log(`   - ${job.filename} (${job.id})`);
      });
      console.log('\n💡 These jobs are likely stuck due to slow OCR processing.');
      console.log('   Deploy the OCR performance fix to resolve this issue.');
    }

  } catch (error) {
    console.error('❌ Error checking processing status:', error);
  }
}

checkLeaseProcessingStatus();
