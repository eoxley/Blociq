const { createClient } = require('@supabase/supabase-js');

// Check user IDs in lease lab jobs
async function checkLeaseLabUserIds() {
  console.log('🔍 Checking Lease Lab User IDs...\n');

  // Initialize Supabase client
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase environment variables');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Get all jobs with their user_ids
    console.log('📋 Getting all jobs with user IDs...');
    const { data: allJobs, error: allJobsError } = await supabase
      .from('document_jobs')
      .select('id, filename, user_id, created_at')
      .order('created_at', { ascending: false });

    if (allJobsError) {
      console.error('❌ Error fetching jobs:', allJobsError);
      return;
    }

    console.log(`📊 Total jobs in database: ${allJobs?.length || 0}`);
    
    if (allJobs && allJobs.length > 0) {
      console.log('\n📋 All jobs with user IDs:');
      allJobs.forEach((job, index) => {
        console.log(`${index + 1}. ${job.id}`);
        console.log(`   Filename: ${job.filename}`);
        console.log(`   User ID: ${job.user_id}`);
        console.log(`   Created: ${job.created_at}`);
        console.log('');
      });

      // Group by user_id
      const userGroups = allJobs.reduce((acc, job) => {
        if (!acc[job.user_id]) {
          acc[job.user_id] = [];
        }
        acc[job.user_id].push(job);
        return acc;
      }, {});

      console.log('👥 Jobs grouped by user_id:');
      Object.keys(userGroups).forEach(userId => {
        console.log(`\n👤 User ID: ${userId}`);
        console.log(`   Jobs: ${userGroups[userId].length}`);
        userGroups[userId].forEach(job => {
          console.log(`   - ${job.id}: ${job.filename}`);
        });
      });
    }

    // Check if there are any users in the auth.users table
    console.log('\n🔍 Checking auth.users table...');
    const { data: authUsers, error: authUsersError } = await supabase
      .from('auth.users')
      .select('id, email')
      .limit(10);

    if (authUsersError) {
      console.log('❌ Error fetching auth users (this is expected - auth.users is not accessible via service role)');
    } else {
      console.log('📋 Auth users:', authUsers);
    }

  } catch (error) {
    console.error('❌ Check error:', error);
  }
}

// Run the check
checkLeaseLabUserIds();
