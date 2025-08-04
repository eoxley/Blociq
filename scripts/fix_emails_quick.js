const { createClient } = require('@supabase/supabase-js');

// Get environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixEmails() {
  try {
    console.log('🔧 Starting email fix...');

    // Get the first user
    const { data: users, error: usersError } = await supabase
      .from('auth.users')
      .select('id, email')
      .limit(1);

    if (usersError) {
      console.error('❌ Error getting users:', usersError);
      return;
    }

    if (!users || users.length === 0) {
      console.log('⚠️ No users found. Please create a user first.');
      return;
    }

    const firstUser = users[0];
    console.log('✅ Found user:', firstUser.email);

    // Count emails without user_id
    const { count: emailsWithoutUserId } = await supabase
      .from('incoming_emails')
      .select('*', { count: 'exact', head: true })
      .is('user_id', null);

    console.log(`📧 Found ${emailsWithoutUserId} emails without user_id`);

    if (emailsWithoutUserId === 0) {
      console.log('✅ All emails already have user_id');
      return;
    }

    // Update emails without user_id
    const { error: updateError } = await supabase
      .from('incoming_emails')
      .update({ user_id: firstUser.id })
      .is('user_id', null);

    if (updateError) {
      console.error('❌ Error updating emails:', updateError);
      return;
    }

    console.log('✅ Successfully updated emails with user_id');

    // Verify
    const { count: updatedCount } = await supabase
      .from('incoming_emails')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', firstUser.id);

    console.log(`✅ Verification: ${updatedCount} emails now have user_id`);

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fixEmails(); 