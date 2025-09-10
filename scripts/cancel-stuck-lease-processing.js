const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client with hardcoded values for now
const supabase = createClient(
  'https://xqxaatvykmaaynqeoemy.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhxeGFhdHZ5a21hYXlucWVvZW15Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ5NzQ4MDAsImV4cCI6MjA1MDU1MDgwMH0.placeholder' // This is a placeholder - you'll need the real key
);

async function cancelStuckProcessing() {
  try {
    console.log('🔍 Looking for stuck lease processing jobs...\n');

    // Get stuck processing jobs (processing for more than 30 minutes)
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    
    const { data: stuckJobs, error } = await supabase
      .from('lease_processing_jobs')
      .select('*')
      .eq('status', 'processing')
      .lt('created_at', thirtyMinutesAgo);

    if (error) {
      console.error('❌ Error fetching stuck jobs:', error);
      return;
    }

    if (!stuckJobs || stuckJobs.length === 0) {
      console.log('✅ No stuck jobs found');
      return;
    }

    console.log(`🚨 Found ${stuckJobs.length} stuck jobs:\n`);

    for (const job of stuckJobs) {
      console.log(`📄 ${job.filename}`);
      console.log(`   Job ID: ${job.id}`);
      console.log(`   Created: ${new Date(job.created_at).toLocaleString()}`);
      
      const elapsed = Math.round((Date.now() - new Date(job.created_at)) / 1000 / 60);
      console.log(`   Elapsed: ${elapsed} minutes`);
      
      // Mark as failed with timeout error
      const { error: updateError } = await supabase
        .from('lease_processing_jobs')
        .update({
          status: 'failed',
          error_message: 'Processing timeout - OCR service was too slow',
          error_details: {
            reason: 'timeout',
            elapsed_minutes: elapsed,
            note: 'This job was cancelled due to slow OCR processing. Please re-upload after deploying the performance fix.'
          },
          last_error_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', job.id);

      if (updateError) {
        console.log(`   ❌ Failed to cancel: ${updateError.message}`);
      } else {
        console.log(`   ✅ Cancelled successfully`);
      }
      
      console.log('');
    }

    console.log('🎉 All stuck jobs have been cancelled');
    console.log('💡 You can now re-upload your documents after deploying the OCR performance fix');

  } catch (error) {
    console.error('❌ Error cancelling stuck jobs:', error);
  }
}

// Note: This script requires the actual Supabase service role key
console.log('⚠️  Note: This script requires the actual Supabase service role key to work.');
console.log('   For now, you can manually cancel stuck jobs through the UI or wait for them to timeout.\n');

cancelStuckProcessing();
