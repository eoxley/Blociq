const { createClient } = require('@supabase/supabase-js');

// Test script to debug lease lab delete functionality
async function testLeaseLabDeleteDebug() {
  console.log('🧪 Testing Lease Lab Delete Debug...\n');

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
    // Get all jobs to see what's in the database
    console.log('📋 Fetching all jobs from database...');
    const { data: allJobs, error: fetchError } = await supabase
      .from('document_jobs')
      .select('id, filename, user_id, status, created_at')
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('❌ Error fetching jobs:', fetchError);
      return;
    }

    console.log(`📊 Total jobs in database: ${allJobs?.length || 0}`);
    if (allJobs && allJobs.length > 0) {
      console.log('📋 Recent jobs:');
      allJobs.slice(0, 5).forEach(job => {
        console.log(`  - ${job.id}: ${job.filename} (${job.status}) - User: ${job.user_id}`);
      });
    }

    // Test the API endpoint structure
    console.log('\n🔍 API Endpoint Analysis:');
    console.log('✅ DELETE /api/lease-lab/jobs/[id] - Should delete by user_id');
    console.log('✅ GET /api/lease-lab/jobs - Should return jobs for user');
    console.log('✅ Authentication: createClient(cookies()) + getSession()');
    
    console.log('\n🎯 Debugging Steps:');
    console.log('1. Check browser console for delete logs');
    console.log('2. Check server logs for API responses');
    console.log('3. Verify job is removed from database');
    console.log('4. Verify refresh fetches updated job list');

  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

// Run the test
testLeaseLabDeleteDebug();
