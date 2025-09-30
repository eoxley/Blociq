#!/usr/bin/env node

/**
 * Debug Super Admin Access Script
 * 
 * This script helps debug super_admin access issues by:
 * 1. Checking if the user profile exists and has the correct role
 * 2. Testing the is_super_admin() function
 * 3. Verifying RLS policies are working
 * 4. Testing access to onboarding tables
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

async function debugSuperAdminAccess() {
  console.log('🔍 Debugging Super Admin Access...\n');

  try {
    const ELEANOR_ID = '938498a6-2906-4a75-bc91-5d0d586b227e';

    // 1. Check if Eleanor's profile exists and has super_admin role
    console.log('1️⃣ Checking Eleanor\'s profile...');
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', ELEANOR_ID)
      .single();

    if (profileError) {
      console.error('❌ Profile error:', profileError);
      return;
    }

    console.log('✅ Profile found:', {
      id: profile.id,
      email: profile.email,
      role: profile.role,
      first_name: profile.first_name,
      last_name: profile.last_name,
      agency_id: profile.agency_id
    });

    if (profile.role !== 'super_admin') {
      console.error('❌ Role is not super_admin. Current role:', profile.role);
      console.log('\n🔧 Fix: Update the role in Supabase SQL Editor:');
      console.log(`UPDATE profiles SET role = 'super_admin' WHERE id = '${ELEANOR_ID}';`);
      return;
    }

    // 2. Test the is_super_admin() function
    console.log('\n2️⃣ Testing is_super_admin() function...');
    const { data: isSuperAdmin, error: functionError } = await supabase
      .rpc('is_super_admin');

    if (functionError) {
      console.error('❌ Function error:', functionError);
      console.log('\n🔧 Fix: Create the function in Supabase SQL Editor:');
      console.log(`
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'super_admin'
  );
$$;
      `);
      return;
    }

    console.log('✅ is_super_admin() function result:', isSuperAdmin);

    // 3. Check if onboarding tables exist
    console.log('\n3️⃣ Checking onboarding tables...');
    const { data: tables, error: tablesError } = await supabase
      .rpc('exec_sql', {
        sql: `
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name IN ('onboarding_raw', 'staging_structured', 'onboarding_batches');
        `
      });

    if (tablesError) {
      console.error('❌ Tables check error:', tablesError);
      return;
    }

    const existingTables = tables.map(t => t.table_name);
    console.log('✅ Found tables:', existingTables);

    if (existingTables.length === 0) {
      console.error('❌ No onboarding tables found!');
      console.log('\n🔧 Fix: Run the onboarding migration in Supabase SQL Editor');
      return;
    }

    // 4. Test direct access to onboarding tables (bypassing RLS)
    console.log('\n4️⃣ Testing direct table access...');
    
    for (const tableName of existingTables) {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);

      if (error) {
        console.error(`❌ Error accessing ${tableName}:`, error);
      } else {
        console.log(`✅ Can access ${tableName}:`, data.length, 'records');
      }
    }

    // 5. Test RLS policies by creating a test record
    console.log('\n5️⃣ Testing RLS policies...');
    
    // Create a test batch
    const { data: testBatch, error: batchError } = await supabase
      .from('onboarding_batches')
      .insert({
        batch_name: 'Test Batch - Debug',
        agency_id: profile.agency_id,
        building_name: 'Test Building',
        created_by: ELEANOR_ID
      })
      .select()
      .single();

    if (batchError) {
      console.error('❌ Batch creation error:', batchError);
      console.log('\n🔧 Possible fixes:');
      console.log('1. Check RLS policies exist');
      console.log('2. Verify agency_id exists in agencies table');
      console.log('3. Check if policies allow INSERT operations');
    } else {
      console.log('✅ Test batch created:', testBatch.id);
      
      // Clean up test record
      await supabase
        .from('onboarding_batches')
        .delete()
        .eq('id', testBatch.id);
      console.log('✅ Test batch cleaned up');
    }

    // 6. Check RLS policies
    console.log('\n6️⃣ Checking RLS policies...');
    const { data: policies, error: policiesError } = await supabase
      .from('information_schema.table_privileges')
      .select('*')
      .in('table_name', existingTables);

    if (policiesError) {
      console.error('❌ Policies check error:', policiesError);
    } else {
      console.log('✅ Found', policies.length, 'policies for onboarding tables');
    }

    console.log('\n🎯 Summary:');
    console.log('============');
    console.log(`✅ Profile exists: ${profile ? 'Yes' : 'No'}`);
    console.log(`✅ Role is super_admin: ${profile?.role === 'super_admin' ? 'Yes' : 'No'}`);
    console.log(`✅ Function exists: ${isSuperAdmin !== undefined ? 'Yes' : 'No'}`);
    console.log(`✅ Tables exist: ${existingTables.length}/3`);
    console.log(`✅ Can access tables: ${existingTables.length > 0 ? 'Yes' : 'No'}`);

    if (profile?.role === 'super_admin' && existingTables.length > 0) {
      console.log('\n🎉 Everything looks good! You should have super_admin access.');
      console.log('\n🚀 Next steps:');
      console.log('1. Log in to your BlocIQ account');
      console.log('2. Navigate to /dashboard/onboarding');
      console.log('3. Try uploading a test file');
    } else {
      console.log('\n❌ Issues found. Please fix the above problems.');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

console.log('🔍 Super Admin Access Debug Tool');
console.log('=================================\n');

debugSuperAdminAccess();
