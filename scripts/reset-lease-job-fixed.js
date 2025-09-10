#!/usr/bin/env node

/**
 * Reset Lease Job (Fixed)
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
  console.log('🔄 Resetting Lease Job (Fixed)...\n');

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
    console.log(`   Created: ${new Date(job.created_at).toLocaleString()}`);
    console.log(`   Updated: ${new Date(job.updated_at).toLocaleString()}`);
    console.log('');

    // Reset the job status to pending (without progress column)
    const { data: updateData, error: updateError } = await supabase
      .from('document_jobs')
      .update({
        status: 'pending',
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

    // Check the updated job
    const { data: updatedJob, error: fetchError } = await supabase
      .from('document_jobs')
      .select('*')
      .eq('id', job.id)
      .single();

    if (!fetchError && updatedJob) {
      console.log('📋 Updated job details:');
      console.log(`   Status: ${updatedJob.status}`);
      console.log(`   Updated: ${new Date(updatedJob.updated_at).toLocaleString()}`);
      console.log(`   Error Message: ${updatedJob.error_message || 'None'}`);
    }

    console.log('');
    console.log('💡 Next steps:');
    console.log('   1. Check the lease lab page to see if the job restarts');
    console.log('   2. If it doesn\'t restart, you may need to delete and re-upload');
    console.log('   3. The OCR service is healthy, so it should process successfully');

  } catch (error) {
    console.error('❌ Error resetting lease job:', error);
  }
}

resetLeaseJob();
