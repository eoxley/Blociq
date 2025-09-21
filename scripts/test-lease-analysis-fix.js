#!/usr/bin/env node

/**
 * Test script to verify lease analysis fix
 * This script will:
 * 1. Find jobs with READY status but empty summary_json
 * 2. Rerun analysis for those jobs
 * 3. Verify the fix worked
 */

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testLeaseAnalysisFix() {
  try {
    console.log('🔍 Looking for completed jobs with missing analysis...');

    // Find jobs that are READY but have no summary_json
    const { data: jobs, error } = await supabase
      .from('document_jobs')
      .select('*')
      .eq('status', 'READY')
      .is('summary_json', null)
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
      console.error('❌ Error fetching jobs:', error);
      return;
    }

    if (!jobs || jobs.length === 0) {
      console.log('✅ No jobs found with missing analysis');

      // Also check for any jobs that are completed but not READY
      const { data: completedJobs, error: completedError } = await supabase
        .from('document_jobs')
        .select('id, filename, status, summary_json')
        .not('status', 'in', ['QUEUED', 'OCR', 'EXTRACT', 'SUMMARISE'])
        .order('created_at', { ascending: false })
        .limit(10);

      if (completedError) {
        console.error('❌ Error fetching completed jobs:', completedError);
        return;
      }

      console.log('\n📋 Recent completed jobs:');
      completedJobs?.forEach(job => {
        console.log(`  ${job.id}: ${job.filename} - ${job.status} - Analysis: ${job.summary_json ? '✅' : '❌'}`);
      });

      return;
    }

    console.log(`📋 Found ${jobs.length} jobs with missing analysis:`);

    for (const job of jobs) {
      console.log(`\n🔄 Testing job: ${job.id} - ${job.filename}`);
      console.log(`   Status: ${job.status}`);
      console.log(`   Has extracted_text: ${job.extracted_text ? '✅' : '❌'}`);
      console.log(`   Has summary_json: ${job.summary_json ? '✅' : '❌'}`);

      if (!job.extracted_text) {
        console.log('   ⚠️ No extracted text available - skipping');
        continue;
      }

      // Test the analysis endpoint
      console.log('   🤖 Testing analysis endpoint...');

      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/lease-lab/analyze`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            jobId: job.id,
            extractedText: job.extracted_text.substring(0, 5000), // Use first 5000 chars for testing
            filename: job.filename,
            mime: job.mime || 'application/pdf',
            userId: job.user_id
          })
        });

        if (response.ok) {
          const result = await response.json();
          console.log('   ✅ Analysis endpoint succeeded');
          console.log(`   📊 Analysis length: ${result.analysisLength || 0} characters`);

          // Check if the job was updated
          const { data: updatedJob, error: fetchError } = await supabase
            .from('document_jobs')
            .select('summary_json')
            .eq('id', job.id)
            .single();

          if (fetchError) {
            console.log('   ❌ Error fetching updated job:', fetchError.message);
          } else if (updatedJob.summary_json) {
            console.log('   ✅ Job successfully updated with analysis');
            console.log(`   📋 Summary has ${Object.keys(updatedJob.summary_json).length} fields`);
          } else {
            console.log('   ❌ Job was not updated with analysis');
          }

        } else {
          const error = await response.text();
          console.log(`   ❌ Analysis endpoint failed: ${response.status} - ${error}`);
        }

      } catch (error) {
        console.log(`   ❌ Error calling analysis endpoint: ${error.message}`);
      }

      // Only test one job for now
      break;
    }

  } catch (error) {
    console.error('❌ Test script error:', error);
  }
}

// Run the test
testLeaseAnalysisFix();