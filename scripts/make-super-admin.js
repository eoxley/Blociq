#!/usr/bin/env node

/**
 * Make User Super Admin Script
 * 
 * This script updates a user's role to 'super_admin' in the profiles table.
 * Only super_admins can access the onboarding module.
 * 
 * Usage:
 * node scripts/make-super-admin.js <email>
 * 
 * Example:
 * node scripts/make-super-admin.js eleanor.oxley@blociq.co.uk
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local');
  process.exit(1);
}

// Create service client (bypasses RLS)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function makeSuperAdmin(email) {
  console.log(`🔧 Making ${email} a super_admin...\n`);

  try {
    // 1. First, find the user in auth.users
    console.log('1️⃣ Finding user in auth.users...');
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('❌ Failed to fetch auth users:', authError);
      return;
    }

    const user = authUsers.users.find(u => u.email === email);
    if (!user) {
      console.error(`❌ User ${email} not found in auth.users`);
      console.log('Available users:');
      authUsers.users.forEach(u => console.log(`  - ${u.email}`));
      return;
    }

    console.log(`✅ Found user: ${user.email} (${user.id})`);

    // 2. Check if profile exists
    console.log('\n2️⃣ Checking profile...');
    const { data: existingProfile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('❌ Failed to check profile:', profileError);
      return;
    }

    if (existingProfile) {
      console.log('✅ Profile exists:', {
        id: existingProfile.id,
        email: existingProfile.email,
        role: existingProfile.role,
        agency_id: existingProfile.agency_id
      });

      // Update existing profile
      const { data: updatedProfile, error: updateError } = await supabase
        .from('profiles')
        .update({
          role: 'super_admin',
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
        .select()
        .single();

      if (updateError) {
        console.error('❌ Failed to update profile:', updateError);
        return;
      }

      console.log('✅ Updated profile to super_admin:', {
        id: updatedProfile.id,
        email: updatedProfile.email,
        role: updatedProfile.role
      });

    } else {
      console.log('❌ Profile does not exist. Creating new profile...');
      
      // Create new profile
      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          email: user.email,
          role: 'super_admin',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (createError) {
        console.error('❌ Failed to create profile:', createError);
        return;
      }

      console.log('✅ Created new super_admin profile:', {
        id: newProfile.id,
        email: newProfile.email,
        role: newProfile.role
      });
    }

    // 3. Verify the change
    console.log('\n3️⃣ Verifying super_admin access...');
    const { data: verifyProfile, error: verifyError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (verifyError) {
      console.error('❌ Failed to verify profile:', verifyError);
      return;
    }

    if (verifyProfile.role === 'super_admin') {
      console.log('🎉 SUCCESS! User is now a super_admin');
      console.log(`   Email: ${verifyProfile.email}`);
      console.log(`   Role: ${verifyProfile.role}`);
      console.log(`   Profile ID: ${verifyProfile.id}`);
      console.log('\n✅ You can now access the onboarding module at /dashboard/onboarding');
    } else {
      console.error('❌ Role was not set correctly. Current role:', verifyProfile.role);
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Main execution
const email = process.argv[2];

if (!email) {
  console.error('❌ Please provide an email address');
  console.log('\nUsage: node scripts/make-super-admin.js <email>');
  console.log('Example: node scripts/make-super-admin.js eleanor.oxley@blociq.co.uk');
  process.exit(1);
}

console.log('🚀 BlocIQ Super Admin Setup');
console.log('============================\n');

makeSuperAdmin(email);
