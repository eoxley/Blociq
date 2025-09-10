const { createClient } = require('@supabase/supabase-js');

// Debug script to check lease lab delete functionality
async function debugLeaseLabDelete() {
  console.log('🔍 Debugging Lease Lab Delete Functionality...\n');

  // Initialize Supabase client
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase environment variables');
    console.log('Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Get a specific user's jobs
    const userId = '938498a6-2906-4a75-bc91-5d0d586b227e'; // From the logs
    console.log('👤 Checking jobs for user:', userId);
    
    const { data: userJobs, error: userJobsError } = await supabase
      .from('document_jobs')
      .select('id, filename, user_id, status, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (userJobsError) {
      console.error('❌ Error fetching user jobs:', userJobsError);
      return;
    }

    console.log(`📊 User has ${userJobs?.length || 0} jobs`);
    if (userJobs && userJobs.length > 0) {
      console.log('📋 User jobs:');
      userJobs.forEach(job => {
        console.log(`  - ${job.id}: ${job.filename} (${job.status})`);
      });
    }

    // Check if there are any jobs with different user_ids
    const { data: allJobs, error: allJobsError } = await supabase
      .from('document_jobs')
      .select('id, filename, user_id, status, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    if (allJobsError) {
      console.error('❌ Error fetching all jobs:', allJobsError);
      return;
    }

    console.log(`\n📊 Total jobs in database: ${allJobs?.length || 0}`);
    if (allJobs && allJobs.length > 0) {
      console.log('📋 Recent jobs (all users):');
      allJobs.forEach(job => {
        const isUserJob = job.user_id === userId;
        console.log(`  - ${job.id}: ${job.filename} (${job.status}) - User: ${job.user_id} ${isUserJob ? '✅' : '❌'}`);
      });
    }

    // Test the delete query structure
    console.log('\n🧪 Testing delete query structure...');
    console.log('DELETE FROM document_jobs WHERE id = ? AND user_id = ?');
    console.log('This should only delete jobs that belong to the specific user');

  } catch (error) {
    console.error('❌ Debug error:', error);
  }
}

// Run the debug
debugLeaseLabDelete();
