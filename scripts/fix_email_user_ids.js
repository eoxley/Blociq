const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixEmailUserIds() {
  try {
    console.log('🔧 Starting email user_id fix...');
    
    // First, let's see what emails exist and their current user_id values
    const { data: emails, error: fetchError } = await supabase
      .from('incoming_emails')
      .select('id, user_id, subject, from_email')
      .limit(10);
    
    if (fetchError) {
      console.error('❌ Error fetching emails:', fetchError);
      return;
    }
    
    console.log('📧 Current emails in database:');
    emails.forEach(email => {
      console.log(`  - ID: ${email.id}, User ID: ${email.user_id}, Subject: ${email.subject}`);
    });
    
    // Get the user ID to use (updated with actual user ID)
    const targetUserId = '938498a6-2906-4a75-bc91-5d0d586b227e'; // Your actual user ID
    
    console.log(`\n🎯 Setting all emails to user_id: ${targetUserId}`);
    
    // Update all emails to have the correct user_id
    const { data: updateResult, error: updateError } = await supabase
      .from('incoming_emails')
      .update({ user_id: targetUserId })
      .is('user_id', null); // Only update emails where user_id is null
    
    if (updateError) {
      console.error('❌ Error updating emails:', updateError);
      return;
    }
    
    console.log(`✅ Updated ${updateResult?.length || 0} emails with null user_id`);
    
    // Also update emails that might have a different user_id
    const { data: updateResult2, error: updateError2 } = await supabase
      .from('incoming_emails')
      .update({ user_id: targetUserId })
      .neq('user_id', targetUserId); // Update emails with different user_id
    
    if (updateError2) {
      console.error('❌ Error updating emails with different user_id:', updateError2);
      return;
    }
    
    console.log(`✅ Updated ${updateResult2?.length || 0} emails with different user_id`);
    
    // Verify the fix
    const { data: verifyEmails, error: verifyError } = await supabase
      .from('incoming_emails')
      .select('id, user_id, subject, from_email')
      .limit(10);
    
    if (verifyError) {
      console.error('❌ Error verifying emails:', verifyError);
      return;
    }
    
    console.log('\n✅ Verification - Updated emails:');
    verifyEmails.forEach(email => {
      console.log(`  - ID: ${email.id}, User ID: ${email.user_id}, Subject: ${email.subject}`);
    });
    
    console.log('\n🎉 Email user_id fix completed!');
    console.log('💡 Now try marking emails as read and syncing again.');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

fixEmailUserIds(); 