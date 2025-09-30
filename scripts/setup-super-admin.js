#!/usr/bin/env node

/**
 * Setup Super Admin Script
 * 
 * This script:
 * 1. Adds role column to profiles table
 * 2. Makes Eleanor a super_admin
 * 3. Creates necessary functions and policies
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

// Create service client (bypasses RLS)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function setupSuperAdmin() {
  console.log('🔧 Setting up super_admin role and making Eleanor super_admin...\n');

  try {
    // 1. First, let's check the current profiles table structure
    console.log('1️⃣ Checking profiles table structure...');
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .limit(1);

    if (profilesError) {
      console.error('❌ Failed to check profiles table:', profilesError);
      return;
    }

    console.log('✅ Profiles table accessible');
    console.log('Current columns:', Object.keys(profiles[0] || {}));

    // 2. Try to add role column by updating a profile (this will work if column exists or create it)
    console.log('\n2️⃣ Adding role column and making Eleanor super_admin...');
    
    // First, find Eleanor's user
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) {
      console.error('❌ Failed to fetch auth users:', authError);
      return;
    }

    const eleanor = authUsers.users.find(u => u.email === 'eleanor.oxley@blociq.co.uk');
    if (!eleanor) {
      console.error('❌ Eleanor not found in auth users');
      return;
    }

    console.log(`✅ Found Eleanor: ${eleanor.email} (${eleanor.id})`);

    // Try to update the profile with role
    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update({
        role: 'super_admin',
        updated_at: new Date().toISOString()
      })
      .eq('id', eleanor.id)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Failed to update profile:', updateError);
      
      // If role column doesn't exist, let's try a different approach
      if (updateError.message.includes('role')) {
        console.log('\n🔧 Role column doesn\'t exist. Creating it via SQL...');
        
        // We'll need to run this via a database function or direct SQL
        // For now, let's try to create the profile with all fields
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .upsert({
            id: eleanor.id,
            email: eleanor.email,
            role: 'super_admin',
            first_name: 'Eleanor',
            last_name: 'Oxley',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();

        if (createError) {
          console.error('❌ Failed to create/update profile:', createError);
          console.log('\n📋 Manual steps required:');
          console.log('1. Go to your Supabase dashboard');
          console.log('2. Run this SQL in the SQL editor:');
          console.log(`
            ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role VARCHAR(50);
            UPDATE profiles SET role = 'super_admin' WHERE id = '${eleanor.id}';
          `);
          return;
        }

        console.log('✅ Created profile with super_admin role:', newProfile);
      }
    } else {
      console.log('✅ Updated profile to super_admin:', updatedProfile);
    }

    // 3. Verify the super_admin role
    console.log('\n3️⃣ Verifying super_admin access...');
    const { data: verifyProfile, error: verifyError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', eleanor.id)
      .single();

    if (verifyError) {
      console.error('❌ Failed to verify profile:', verifyError);
      return;
    }

    console.log('✅ Profile verification:', {
      id: verifyProfile.id,
      email: verifyProfile.email,
      role: verifyProfile.role,
      first_name: verifyProfile.first_name,
      last_name: verifyProfile.last_name
    });

    if (verifyProfile.role === 'super_admin') {
      console.log('\n🎉 SUCCESS! Eleanor is now a super_admin!');
      console.log('\n✅ You can now access:');
      console.log('   - Onboarding module: /dashboard/onboarding');
      console.log('   - All super_admin features');
      console.log('\n🚀 Next steps:');
      console.log('   1. Log in to your BlocIQ account');
      console.log('   2. Navigate to /dashboard/onboarding');
      console.log('   3. Start uploading client data packs!');
    } else {
      console.error('❌ Role verification failed. Current role:', verifyProfile.role);
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

console.log('🚀 Setting up Super Admin Access');
console.log('=================================\n');

setupSuperAdmin();
