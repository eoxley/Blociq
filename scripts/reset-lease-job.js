#!/usr/bin/env node

/**
 * Reset Lease Job
 * This script resets a stuck lease processing job to restart the processing
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function resetLeaseJob() {
  console.log('🔄 Resetting Lease Job...\n');

  try {
    // Find the stuck job
    const { data: jobs, error: jobsError } = await supabase
      .from('document_jobs')
      .select('*')
      .eq('filename', 'Sample Lease_133 Selhurst Close SW19 6AY.pdf')
      .eq('status', 'OCR')
      .order('created_at', { ascending: false })
      .limit(1);

    if (jobsError) {
      console.error('❌ Error fetching job:', jobsError);
      return;
    }

    if (!jobs || jobs.length === 0) {
      console.log('📋 No stuck job found with that filename');
      return;
    }

    const job = jobs[0];
    console.log(`📋 Found stuck job: ${job.filename} (ID: ${job.id})`);
    console.log(`   Current status: ${job.status}`);
    console.log(`   Current progress: ${job.progress}%`);
    console.log('');

    // Reset the job status to pending
    const { data: updateData, error: updateError } = await supabase
      .from('document_jobs')
      .update({
        status: 'pending',
        progress: 0,
        error_message: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', job.id)
      .select();

    if (updateError) {
      console.error('❌ Error updating job:', updateError);
      return;
    }

    console.log('✅ Job status reset to pending');
    console.log('🔄 Job should now restart processing automatically');
    console.log('');

    // Check if there's a background job processor running
    console.log('💡 Note: The job will only restart if there\'s a background processor running');
    console.log('   If the job doesn\'t restart automatically, you may need to:');
    console.log('   1. Check if the background job processor is running');
    console.log('   2. Manually trigger the job processing');
    console.log('   3. Or delete and re-upload the document');

  } catch (error) {
    console.error('❌ Error resetting lease job:', error);
  }
}

resetLeaseJob();
