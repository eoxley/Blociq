#!/usr/bin/env node

/**
 * Cleanup Stalled Jobs - Mark jobs stuck in processing states as FAILED
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanupStalledJobs() {
  console.log('🧹 Cleaning up stalled jobs...\n');

  try {
    // Find jobs that have been in processing states for more than 10 minutes
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    
    const { data: stalledJobs, error: stalledError } = await supabase
      .from('document_jobs')
      .select('id, filename, status, updated_at, user_id')
      .in('status', ['OCR', 'EXTRACT', 'SUMMARISE', 'QUEUED'])
      .lt('updated_at', tenMinutesAgo);

    if (stalledError) {
      console.error('❌ Error finding stalled jobs:', stalledError.message);
      return;
    }

    if (!stalledJobs || stalledJobs.length === 0) {
      console.log('✅ No stalled jobs found');
      return;
    }

    console.log(`📊 Found ${stalledJobs.length} stalled jobs:`);
    
    for (const job of stalledJobs) {
      const ageMinutes = Math.round((Date.now() - new Date(job.updated_at).getTime()) / (1000 * 60));
      console.log(`   - Job ${job.id}: ${job.status} (${job.filename}, ${ageMinutes}min old)`);
      
      // Update job as failed
      const { error: updateError } = await supabase
        .from('document_jobs')
        .update({
          status: 'FAILED',
          error_message: `Job timed out after ${ageMinutes} minutes in ${job.status} state`,
          updated_at: new Date().toISOString()
        })
        .eq('id', job.id);

      if (updateError) {
        console.log(`     ❌ Failed to update job ${job.id}:`, updateError.message);
      } else {
        console.log(`     ✅ Marked job ${job.id} as FAILED`);
      }
    }

    console.log(`\n✅ Cleanup complete: ${stalledJobs.length} jobs updated`);

  } catch (error) {
    console.error('❌ Cleanup error:', error);
  }
}

cleanupStalledJobs();