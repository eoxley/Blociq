const { createClient } = require('@supabase/supabase-js');

// Get environment variables from command line arguments or environment
const supabaseUrl = process.argv[2] || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.argv[3] || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Usage: node scripts/fix_sample_emails_simple.js <SUPABASE_URL> <SERVICE_ROLE_KEY>');
  console.error('Or set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables');
  process.exit(1);
}

console.log('🔧 Initializing Supabase client...');
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixSampleEmails() {
  try {
    console.log('🔧 Starting to fix sample emails...');

    // Test connection first
    console.log('🔍 Testing database connection...');
    const { data: testData, error: testError } = await supabase
      .from('incoming_emails')
      .select('count', { count: 'exact', head: true });

    if (testError) {
      console.error('❌ Database connection failed:', testError);
      return;
    }

    console.log('✅ Database connection successful');

    // Get the first user from auth.users
    console.log('🔍 Looking for users...');
    const { data: users, error: usersError } = await supabase
      .from('auth.users')
      .select('id, email')
      .limit(1);

    if (usersError) {
      console.error('❌ Error getting users:', usersError);
      return;
    }

    if (!users || users.length === 0) {
      console.log('⚠️ No users found in auth.users table');
      console.log('💡 You need to create a user first through the application');
      return;
    }

    const firstUser = users[0];
    console.log('✅ Found user:', firstUser.email, `(${firstUser.id})`);

    // Count emails without user_id
    console.log('🔍 Counting emails without user_id...');
    const { count: emailsWithoutUserId, error: countError } = await supabase
      .from('incoming_emails')
      .select('*', { count: 'exact', head: true })
      .is('user_id', null);

    if (countError) {
      console.error('❌ Error counting emails:', countError);
      return;
    }

    console.log(`📧 Found ${emailsWithoutUserId} emails without user_id`);

    if (emailsWithoutUserId === 0) {
      console.log('✅ All emails already have user_id');
      return;
    }

    // Update emails without user_id
    console.log('🔧 Updating emails with user_id...');
    const { data: updateResult, error: updateError } = await supabase
      .from('incoming_emails')
      .update({ user_id: firstUser.id })
      .is('user_id', null);

    if (updateError) {
      console.error('❌ Error updating emails:', updateError);
      return;
    }

    console.log('✅ Successfully updated emails with user_id');

    // Verify the update
    console.log('🔍 Verifying update...');
    const { count: updatedCount, error: verifyError } = await supabase
      .from('incoming_emails')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', firstUser.id);

    if (verifyError) {
      console.error('❌ Error verifying update:', verifyError);
      return;
    }

    console.log(`✅ Verification: ${updatedCount} emails now have user_id`);

    // Show sample of updated emails
    const { data: sampleEmails, error: sampleError } = await supabase
      .from('incoming_emails')
      .select('id, subject, from_email, received_at')
      .eq('user_id', firstUser.id)
      .limit(3);

    if (!sampleError && sampleEmails) {
      console.log('📧 Sample updated emails:');
      sampleEmails.forEach((email, index) => {
        console.log(`  ${index + 1}. ${email.subject} (${email.from_email})`);
      });
    }

    console.log('🎉 Sample emails fix completed successfully!');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

fixSampleEmails(); 