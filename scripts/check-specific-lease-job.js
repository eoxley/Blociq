#!/usr/bin/env node

/**
 * Check Specific Lease Job
 * This script checks the details of a specific lease processing job
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

async function checkSpecificLeaseJob() {
  console.log('🔍 Checking Specific Lease Job...\n');

  try {
    // Get the specific job that's stuck
    const { data: jobs, error: jobsError } = await supabase
      .from('document_jobs')
      .select('*')
      .eq('filename', 'Sample Lease_133 Selhurst Close SW19 6AY.pdf')
      .order('created_at', { ascending: false })
      .limit(1);

    if (jobsError) {
      console.error('❌ Error fetching job:', jobsError);
      return;
    }

    if (!jobs || jobs.length === 0) {
      console.log('📋 No job found with that filename');
      return;
    }

    const job = jobs[0];
    console.log('📋 Job Details:');
    console.log(`   ID: ${job.id}`);
    console.log(`   Filename: ${job.filename}`);
    console.log(`   Status: ${job.status}`);
    console.log(`   Progress: ${job.progress}%`);
    console.log(`   Created: ${new Date(job.created_at).toLocaleString()}`);
    console.log(`   Updated: ${new Date(job.updated_at).toLocaleString()}`);
    console.log(`   User ID: ${job.user_id}`);
    console.log(`   File Path: ${job.file_path}`);
    console.log(`   Error Message: ${job.error_message || 'None'}`);
    console.log(`   Analysis Result: ${job.analysis_result ? 'Present' : 'None'}`);
    console.log(`   OCR Result: ${job.ocr_result ? 'Present' : 'None'}`);
    console.log('');

    // Check if the job has been stuck for too long
    const createdAt = new Date(job.created_at);
    const now = new Date();
    const diffMinutes = Math.round((now - createdAt) / (1000 * 60));
    
    console.log(`⏰ Job has been running for: ${diffMinutes} minutes`);
    
    if (diffMinutes > 30) {
      console.log('⚠️  Job has been stuck for more than 30 minutes');
      console.log('💡 Recommendation: Reset the job status or delete and re-upload');
    } else if (diffMinutes > 10) {
      console.log('⚠️  Job has been running for more than 10 minutes');
      console.log('💡 This might be normal for large documents, but worth monitoring');
    } else {
      console.log('✅ Job is still within normal processing time');
    }

    // Check if there are any other jobs for the same user
    const { data: userJobs, error: userJobsError } = await supabase
      .from('document_jobs')
      .select('id, filename, status, progress, created_at')
      .eq('user_id', job.user_id)
      .order('created_at', { ascending: false });

    if (!userJobsError && userJobs) {
      console.log(`\n📋 All jobs for user ${job.user_id}:`);
      userJobs.forEach((userJob, index) => {
        const status = userJob.status || 'unknown';
        const progress = userJob.progress || 0;
        const createdAt = new Date(userJob.created_at).toLocaleString();
        console.log(`   ${index + 1}. ${userJob.filename} - ${status} (${progress}%) - ${createdAt}`);
      });
    }

  } catch (error) {
    console.error('❌ Error checking specific lease job:', error);
  }
}

checkSpecificLeaseJob();
