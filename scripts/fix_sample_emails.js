const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixSampleEmails() {
  try {
    console.log('🔧 Starting to fix sample emails...');

    // Get the first user
    const { data: users, error: usersError } = await supabase
      .from('auth.users')
      .select('id')
      .limit(1);

    if (usersError) {
      console.error('❌ Error getting users:', usersError);
      return;
    }

    if (!users || users.length === 0) {
      console.log('⚠️ No users found in auth.users table');
      return;
    }

    const firstUserId = users[0].id;
    console.log('✅ Found user:', firstUserId);

    // Count emails without user_id
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
    const { data: updateResult, error: updateError } = await supabase
      .from('incoming_emails')
      .update({ user_id: firstUserId })
      .is('user_id', null);

    if (updateError) {
      console.error('❌ Error updating emails:', updateError);
      return;
    }

    console.log('✅ Successfully updated emails with user_id');

    // Verify the update
    const { count: updatedCount, error: verifyError } = await supabase
      .from('incoming_emails')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', firstUserId);

    if (verifyError) {
      console.error('❌ Error verifying update:', verifyError);
      return;
    }

    console.log(`✅ Verification: ${updatedCount} emails now have user_id`);

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

fixSampleEmails(); 