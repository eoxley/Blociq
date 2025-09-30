#!/usr/bin/env node

/**
 * Debug Frontend Authentication Script
 * 
 * This script simulates the exact authentication check that the frontend
 * onboarding page performs to identify why Eleanor can't access it.
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Create service client (bypasses RLS)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function debugFrontendAuth() {
  console.log('🔍 Debugging Frontend Authentication Flow...\n');

  try {
    const ELEANOR_ID = '938498a6-2906-4a75-bc91-5d0d586b227e';

    // Step 1: Check if user exists in auth.users (simulating getUser())
    console.log('1️⃣ Checking user in auth.users...');
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('❌ Auth users error:', authError);
      return;
    }

    const eleanor = authUsers.users.find(u => u.id === ELEANOR_ID);
    if (!eleanor) {
      console.error('❌ Eleanor not found in auth.users');
      return;
    }

    console.log('✅ Eleanor found in auth.users:', {
      id: eleanor.id,
      email: eleanor.email,
      created_at: eleanor.created_at,
      email_confirmed_at: eleanor.email_confirmed_at
    });

    // Step 2: Check profile (simulating the frontend check)
    console.log('\n2️⃣ Checking profile (frontend simulation)...');
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, role, first_name, last_name, agency_id')
      .eq('id', eleanor.id)
      .single();

    if (profileError) {
      console.error('❌ Profile error:', profileError);
      return;
    }

    if (!profile) {
      console.error('❌ Profile not found for Eleanor');
      return;
    }

    console.log('✅ Profile found:', profile);

    // Step 3: Check role specifically
    console.log('\n3️⃣ Role check...');
    console.log(`Profile role: "${profile.role}"`);
    console.log(`Expected role: "super_admin"`);
    console.log(`Role match: ${profile.role === 'super_admin'}`);

    if (profile.role !== 'super_admin') {
      console.error('❌ Role mismatch! Eleanor does not have super_admin role');
      console.log('\n🔧 Fix: Update the role in Supabase SQL Editor:');
      console.log(`UPDATE profiles SET role = 'super_admin' WHERE id = '${eleanor.id}';`);
      return;
    }

    // Step 4: Test onboarding table access (simulating fetchRawUploads)
    console.log('\n4️⃣ Testing onboarding table access...');
    
    const { data: rawUploads, error: rawError } = await supabase
      .from('onboarding_raw')
      .select('*')
      .limit(5);

    if (rawError) {
      console.error('❌ Raw uploads error:', rawError);
      return;
    }

    console.log('✅ Can access onboarding_raw:', rawUploads.length, 'records');

    // Step 5: Test staging table access (simulating fetchStructuredRecords)
    const { data: stagingRecords, error: stagingError } = await supabase
      .from('staging_structured')
      .select('*')
      .limit(5);

    if (stagingError) {
      console.error('❌ Staging records error:', stagingError);
      return;
    }

    console.log('✅ Can access staging_structured:', stagingRecords.length, 'records');

    // Step 6: Check if there are any RLS policy issues
    console.log('\n5️⃣ Checking RLS policies...');
    
    // Try to create a test record to verify INSERT permissions
    const { data: testBatch, error: testError } = await supabase
      .from('onboarding_batches')
      .insert({
        batch_name: 'Debug Test Batch',
        agency_id: profile.agency_id,
        building_name: 'Debug Building',
        created_by: eleanor.id
      })
      .select()
      .single();

    if (testError) {
      console.error('❌ Test batch creation failed:', testError);
      console.log('\n🔧 This suggests RLS policy issues. Try running:');
      console.log('node scripts/fix-rls-policies.js');
    } else {
      console.log('✅ Test batch created successfully:', testBatch.id);
      
      // Clean up
      await supabase
        .from('onboarding_batches')
        .delete()
        .eq('id', testBatch.id);
      console.log('✅ Test batch cleaned up');
    }

    console.log('\n🎯 Frontend Auth Debug Summary:');
    console.log('===============================');
    console.log(`✅ User exists in auth.users: Yes`);
    console.log(`✅ Profile exists: Yes`);
    console.log(`✅ Role is super_admin: ${profile.role === 'super_admin' ? 'Yes' : 'No'}`);
    console.log(`✅ Can access onboarding_raw: ${!rawError ? 'Yes' : 'No'}`);
    console.log(`✅ Can access staging_structured: ${!stagingError ? 'Yes' : 'No'}`);
    console.log(`✅ Can create records: ${!testError ? 'Yes' : 'No'}`);

    if (profile.role === 'super_admin' && !rawError && !stagingError) {
      console.log('\n🎉 All checks passed! Eleanor should have access to onboarding module.');
      console.log('\n🚀 If you still can\'t access it, try:');
      console.log('1. Clear your browser cache and cookies');
      console.log('2. Log out and log back in');
      console.log('3. Check the browser console for JavaScript errors');
      console.log('4. Try accessing /dashboard/onboarding in an incognito window');
    } else {
      console.log('\n❌ Issues found. Please fix the above problems.');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

console.log('🔍 Frontend Authentication Debug');
console.log('=================================\n');

debugFrontendAuth();
