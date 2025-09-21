#!/usr/bin/env node

/**
 * Simple script to check what analysis data exists for current jobs
 * This will help us understand if existing jobs need reprocessing
 */

console.log('🔍 Checking live production jobs for analysis data...');

async function checkJobsAnalysis() {
  try {
    // Check the jobs endpoint
    const response = await fetch('https://www.blociq.co.uk/api/lease-lab/jobs', {
      headers: {
        'Cookie': 'sb-xjnsgxuqgcpedszawcjf-auth-token=...' // Would need actual auth
      }
    });

    if (!response.ok) {
      console.log('❌ Failed to fetch jobs:', response.status);
      return;
    }

    const data = await response.json();
    console.log('📋 Found', data.jobs?.length || 0, 'jobs');

    // Check each job for analysis data
    data.jobs?.forEach((job, index) => {
      console.log(`\n📄 Job ${index + 1}: ${job.filename}`);
      console.log(`   ID: ${job.id}`);
      console.log(`   Status: ${job.status}`);
      console.log(`   Has summary_json: ${job.summary_json ? '✅' : '❌'}`);
      console.log(`   Created: ${new Date(job.created_at).toLocaleDateString()}`);

      if (job.summary_json) {
        const keys = Object.keys(job.summary_json);
        console.log(`   Summary keys: ${keys.slice(0, 5).join(', ')}${keys.length > 5 ? '...' : ''}`);
      }
    });

    // Check if any jobs are READY but missing analysis
    const readyWithoutAnalysis = data.jobs?.filter(job =>
      job.status === 'READY' && !job.summary_json
    ) || [];

    if (readyWithoutAnalysis.length > 0) {
      console.log(`\n⚠️  Found ${readyWithoutAnalysis.length} READY jobs without analysis:`);
      readyWithoutAnalysis.forEach(job => {
        console.log(`   - ${job.filename} (${job.id})`);
      });
      console.log('\n💡 These jobs may need reprocessing to generate analysis.');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Simple version without auth - just log what we'd check
console.log(`
📋 To check live job analysis data:
1. Visit: https://www.blociq.co.uk/api/lease-lab/jobs
2. Look for jobs with status 'READY'
3. Check if they have 'summary_json' field populated

🔍 Jobs that are READY but missing summary_json need reprocessing.

💡 You can also check individual jobs at:
   https://www.blociq.co.uk/api/lease-lab/jobs/[JOB_ID]
`);

checkJobsAnalysis();