#!/usr/bin/env node

/**
 * Check User Account Status
 * This script verifies if eleanor.oxley@blociq.co.uk is properly set up in the database
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUserAccount() {
  console.log('🔍 Checking account status for eleanor.oxley@blociq.co.uk...\n');

  try {
    // Check 1: Look up user in auth.users via RPC
    console.log('1. Checking auth.users table...');
    const { data: authUsers, error: authError } = await supabase
      .from('auth.users')
      .select('*')
      .eq('email', 'eleanor.oxley@blociq.co.uk')
      .single();
    
    const authUser = authUsers ? { user: authUsers } : null;
    
    if (authError) {
      console.log(`   ❌ Auth user lookup failed: ${authError.message}`);
    } else if (authUser.user) {
      console.log(`   ✅ Auth user found: ${authUser.user.email}`);
      console.log(`   📧 Email: ${authUser.user.email}`);
      console.log(`   🆔 ID: ${authUser.user.id}`);
      console.log(`   📅 Created: ${authUser.user.created_at}`);
      console.log(`   ✅ Email confirmed: ${authUser.user.email_confirmed_at ? 'Yes' : 'No'}`);
    } else {
      console.log('   ❌ No auth user found');
    }

    // Check 2: Look up user in profiles table
    console.log('\n2. Checking profiles table...');
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', 'eleanor.oxley@blociq.co.uk')
      .single();

    if (profileError) {
      console.log(`   ❌ Profile lookup failed: ${profileError.message}`);
    } else if (profile) {
      console.log(`   ✅ Profile found: ${profile.full_name || profile.email}`);
      console.log(`   🆔 Profile ID: ${profile.id}`);
      console.log(`   🏢 Agency ID: ${profile.agency_id || 'Not set'}`);
    } else {
      console.log('   ❌ No profile found');
    }

    // Check 3: Look up user in users table
    console.log('\n3. Checking users table...');
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'eleanor.oxley@blociq.co.uk')
      .single();

    if (userError) {
      console.log(`   ❌ Users table lookup failed: ${userError.message}`);
    } else if (user) {
      console.log(`   ✅ User record found: ${user.full_name || user.email}`);
      console.log(`   🆔 User ID: ${user.id}`);
      console.log(`   🏢 Agency ID: ${user.agency_id || 'Not set'}`);
    } else {
      console.log('   ❌ No user record found');
    }

    // Check 4: Check agency membership
    console.log('\n4. Checking agency membership...');
    const { data: agencyMember, error: agencyError } = await supabase
      .from('agency_members')
      .select('*, agencies(*)')
      .eq('user_id', authUser?.user?.id || 'not-found')
      .single();

    if (agencyError) {
      console.log(`   ❌ Agency membership lookup failed: ${agencyError.message}`);
    } else if (agencyMember) {
      console.log(`   ✅ Agency membership found`);
      console.log(`   🏢 Agency: ${agencyMember.agencies?.name || 'Unknown'}`);
      console.log(`   👤 Role: ${agencyMember.role}`);
      console.log(`   📅 Joined: ${agencyMember.joined_at}`);
    } else {
      console.log('   ❌ No agency membership found');
    }

    // Check 5: Check for emails
    console.log('\n5. Checking incoming emails...');
    const { data: emails, error: emailsError } = await supabase
      .from('incoming_emails')
      .select('id, subject, from_email, received_at, is_read, is_handled')
      .eq('user_id', authUser?.user?.id || 'not-found')
      .order('received_at', { ascending: false })
      .limit(10);

    if (emailsError) {
      console.log(`   ❌ Emails lookup failed: ${emailsError.message}`);
    } else {
      console.log(`   ✅ Found ${emails.length} emails`);
      if (emails.length > 0) {
        const unreadCount = emails.filter(e => !e.is_read).length;
        const handledCount = emails.filter(e => e.is_handled).length;
        console.log(`   📧 Unread: ${unreadCount}`);
        console.log(`   ✅ Handled: ${handledCount}`);
        console.log(`   📅 Latest: ${emails[0]?.received_at}`);
      }
    }

    // Check 6: Environment variables
    console.log('\n6. Checking environment variables...');
    console.log(`   🔑 Microsoft Client ID: ${process.env.MICROSOFT_CLIENT_ID ? 'Set' : 'Not set'}`);
    console.log(`   🔐 Microsoft Client Secret: ${process.env.MICROSOFT_CLIENT_SECRET ? 'Set' : 'Not set'}`);
    console.log(`   🏢 Azure Tenant ID: ${process.env.AZURE_TENANT_ID ? 'Set' : 'Not set'}`);
    console.log(`   🔗 Redirect URI: ${process.env.MICROSOFT_REDIRECT_URI || 'Not set'}`);
    console.log(`   🌐 Site URL: ${process.env.NEXT_PUBLIC_SITE_URL || 'Not set'}`);

    // Summary
    console.log('\n📊 SUMMARY:');
    console.log(`   ${authUser?.user ? '✅' : '❌'} Auth user exists`);
    console.log(`   ${profile ? '✅' : '❌'} Profile exists`);
    console.log(`   ${user ? '✅' : '❌'} User record exists`);
    console.log(`   ${agencyMember ? '✅' : '❌'} Agency membership exists`);
    console.log(`   ${emails?.length > 0 ? '✅' : '❌'} Emails found (${emails?.length || 0})`);

    if (authUser?.user && profile && user && agencyMember) {
      console.log('\n🎉 Account is properly set up!');
    } else {
      console.log('\n⚠️ Account setup is incomplete. Some components are missing.');
    }

  } catch (error) {
    console.error('❌ Error checking account:', error);
  }
}

// Run the check
checkUserAccount();
