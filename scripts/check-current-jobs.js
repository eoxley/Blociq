#!/usr/bin/env node

/**
 * Check Current Jobs - Monitor the status of active jobs in real-time
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCurrentJobs() {
  console.log('🔍 Checking current job status...\n');

  try {
    // Get recent jobs (last 10)
    const { data: jobs, error: jobsError } = await supabase
      .from('document_jobs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (jobsError) {
      console.error('❌ Error fetching jobs:', jobsError.message);
      return;
    }

    if (!jobs || jobs.length === 0) {
      console.log('📭 No jobs found');
      return;
    }

    console.log(`📊 Found ${jobs.length} recent jobs:\n`);

    jobs.forEach((job, index) => {
      const ageMinutes = Math.round((Date.now() - new Date(job.created_at).getTime()) / (1000 * 60));
      const updatedMinutes = Math.round((Date.now() - new Date(job.updated_at).getTime()) / (1000 * 60));
      
      console.log(`${index + 1}. Job ${job.id.substring(0, 8)}...`);
      console.log(`   📄 File: ${job.filename}`);
      console.log(`   📊 Status: ${job.status}`);
      console.log(`   👤 User: ${job.user_id?.substring(0, 8)}...`);
      console.log(`   🕒 Created: ${ageMinutes}min ago`);
      console.log(`   🔄 Updated: ${updatedMinutes}min ago`);
      
      if (job.error_message) {
        console.log(`   ❌ Error: ${job.error_message}`);
      }
      
      // Status-specific info
      if (job.status === 'QUEUED') {
        if (updatedMinutes > 2) {
          console.log(`   ⚠️  Job has been queued for ${updatedMinutes} minutes - may be stuck`);
        } else {
          console.log(`   ✅ Job is freshly queued - should start processing soon`);
        }
      } else if (job.status === 'OCR') {
        if (updatedMinutes > 5) {
          console.log(`   ⚠️  OCR processing for ${updatedMinutes} minutes - may be stuck`);
        } else {
          console.log(`   🔄 OCR in progress...`);
        }
      } else if (job.status === 'EXTRACT' || job.status === 'SUMMARISE') {
        if (updatedMinutes > 3) {
          console.log(`   ⚠️  Analysis stage running for ${updatedMinutes} minutes - may be stuck`);
        } else {
          console.log(`   🤖 AI analysis in progress...`);
        }
      } else if (job.status === 'READY') {
        console.log(`   ✅ Completed successfully`);
      } else if (job.status === 'FAILED') {
        console.log(`   ❌ Failed processing`);
      }
      
      console.log();
    });

    // Check for any stuck jobs
    const stuckJobs = jobs.filter(job => {
      const updatedMinutes = Math.round((Date.now() - new Date(job.updated_at).getTime()) / (1000 * 60));
      return ['QUEUED', 'OCR', 'EXTRACT', 'SUMMARISE'].includes(job.status) && updatedMinutes > 10;
    });

    if (stuckJobs.length > 0) {
      console.log(`⚠️  Found ${stuckJobs.length} potentially stuck jobs:`);
      stuckJobs.forEach(job => {
        const updatedMinutes = Math.round((Date.now() - new Date(job.updated_at).getTime()) / (1000 * 60));
        console.log(`   - ${job.id}: ${job.status} for ${updatedMinutes}min (${job.filename})`);
      });
      console.log('\n💡 Consider running: node scripts/cleanup-stalled-jobs.js');
    }

    // Show the most recent job in detail if it's active
    const latestJob = jobs[0];
    if (['QUEUED', 'OCR', 'EXTRACT', 'SUMMARISE'].includes(latestJob.status)) {
      console.log('🔍 LATEST JOB DETAILS:');
      console.log(`   ID: ${latestJob.id}`);
      console.log(`   File: ${latestJob.filename}`);
      console.log(`   Status: ${latestJob.status}`);
      console.log(`   Size: ${(latestJob.size_bytes / 1024 / 1024).toFixed(2)} MB`);
      
      const updatedMinutes = Math.round((Date.now() - new Date(latestJob.updated_at).getTime()) / (1000 * 60));
      
      if (latestJob.status === 'QUEUED' && updatedMinutes < 2) {
        console.log('   💡 Processing should start within 1-2 minutes');
      } else if (latestJob.status === 'OCR' && updatedMinutes < 5) {
        console.log('   💡 OCR typically takes 2-5 minutes for large files');
      } else if (latestJob.status === 'EXTRACT' || latestJob.status === 'SUMMARISE') {
        console.log('   💡 AI analysis typically takes 1-3 minutes');
      } else {
        console.log(`   ⚠️  Job may be stuck - last updated ${updatedMinutes} minutes ago`);
      }
    }

  } catch (error) {
    console.error('❌ Error checking jobs:', error);
  }
}

// Run the check
checkCurrentJobs();

// Also set up monitoring for real-time updates
console.log('🔄 Starting real-time monitoring (will check every 30 seconds)...\n');
setInterval(async () => {
  console.log(`\n[${ new Date().toLocaleTimeString()}] Checking for updates...`);
  await checkCurrentJobs();
}, 30000);