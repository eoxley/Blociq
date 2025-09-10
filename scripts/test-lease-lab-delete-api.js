const { createClient } = require('@supabase/supabase-js');

// Test the lease lab delete API directly
async function testLeaseLabDeleteAPI() {
  console.log('🧪 Testing Lease Lab Delete API Directly...\n');

  // Initialize Supabase client
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase environment variables');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const userId = '938498a6-2906-4a75-bc91-5d0d586b227e';
    
    // Get jobs before deletion
    console.log('📋 Getting jobs before deletion...');
    const { data: jobsBefore, error: beforeError } = await supabase
      .from('document_jobs')
      .select('id, filename, user_id, status, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (beforeError) {
      console.error('❌ Error fetching jobs before:', beforeError);
      return;
    }

    console.log(`📊 Jobs before deletion: ${jobsBefore?.length || 0}`);
    if (jobsBefore && jobsBefore.length > 0) {
      console.log('📋 Job IDs before:', jobsBefore.map(job => job.id));
    }

    // Try to delete the first job using the same query structure as the API
    if (jobsBefore && jobsBefore.length > 0) {
      const jobToDelete = jobsBefore[0];
      console.log(`\n🗑️ Attempting to delete job: ${jobToDelete.id}`);
      console.log(`👤 User ID: ${userId}`);
      
      // Test the exact same delete query as the API
      const { error: deleteError, count } = await supabase
        .from('document_jobs')
        .delete()
        .eq('id', jobToDelete.id)
        .eq('user_id', userId);

      if (deleteError) {
        console.error('❌ Delete error:', deleteError);
      } else {
        console.log(`✅ Delete successful. Rows affected: ${count}`);
        console.log(`✅ Delete error: ${deleteError}`);
      }

      // Get jobs after deletion
      console.log('\n📋 Getting jobs after deletion...');
      const { data: jobsAfter, error: afterError } = await supabase
        .from('document_jobs')
        .select('id, filename, user_id, status, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (afterError) {
        console.error('❌ Error fetching jobs after:', afterError);
        return;
      }

      console.log(`📊 Jobs after deletion: ${jobsAfter?.length || 0}`);
      if (jobsAfter && jobsAfter.length > 0) {
        console.log('📋 Job IDs after:', jobsAfter.map(job => job.id));
      }

      // Check if the job was actually deleted
      const wasDeleted = !jobsAfter?.some(job => job.id === jobToDelete.id);
      console.log(`\n🎯 Job ${jobToDelete.id} was ${wasDeleted ? '✅ DELETED' : '❌ NOT DELETED'}`);
      
      if (!wasDeleted) {
        console.log('🔍 Debugging why delete failed...');
        console.log('🔍 Job user_id in DB:', jobToDelete.user_id);
        console.log('🔍 Query user_id:', userId);
        console.log('🔍 User IDs match:', jobToDelete.user_id === userId);
      }
    } else {
      console.log('ℹ️  No jobs found to delete');
    }

  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

// Run the test
testLeaseLabDeleteAPI();
