#!/usr/bin/env node

/**
 * Fix Cookie Parsing Issues
 * 
 * This script helps identify and fix cookie parsing issues that might
 * be causing the "Unexpected identifier 'base64'" error.
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function fixCookieParsing() {
  console.log('🔧 Fixing Cookie Parsing Issues...\n');

  try {
    // Test different authentication methods
    console.log('1️⃣ Testing authentication methods...');
    
    const ELEANOR_ID = '938498a6-2906-4a75-bc91-5d0d586b227e';
    
    // Method 1: Direct profile check
    console.log('\n📋 Method 1: Direct profile check');
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', ELEANOR_ID)
      .single();

    if (profileError) {
      console.error('❌ Profile error:', profileError);
    } else {
      console.log('✅ Profile check successful:', {
        id: profile.id,
        email: profile.email,
        role: profile.role
      });
    }

    // Method 2: Test onboarding table access
    console.log('\n📋 Method 2: Test onboarding table access');
    const { data: batches, error: batchesError } = await supabase
      .from('onboarding_batches')
      .select('*')
      .limit(1);

    if (batchesError) {
      console.error('❌ Batches error:', batchesError);
    } else {
      console.log('✅ Batches access successful:', batches.length, 'records');
    }

    // Method 3: Test API endpoint simulation
    console.log('\n📋 Method 3: Test API endpoint simulation');
    
    // Simulate what the API endpoint does
    const testProfile = await supabase
      .from('profiles')
      .select('role, agency_id')
      .eq('id', ELEANOR_ID)
      .single();

    if (testProfile.error || !testProfile.data || testProfile.data.role !== 'super_admin') {
      console.error('❌ API simulation failed:', testProfile.error);
    } else {
      console.log('✅ API simulation successful:', testProfile.data);
    }

    console.log('\n🎯 Cookie Parsing Fix Recommendations:');
    console.log('=====================================');
    console.log('1. Clear browser cookies and localStorage');
    console.log('2. Log out and log back in');
    console.log('3. Try in incognito/private browsing mode');
    console.log('4. Check if there are malformed cookies in browser dev tools');
    console.log('5. The "base64" error suggests a cookie value is malformed');

    console.log('\n🔧 Technical Fixes to Try:');
    console.log('==========================');
    console.log('1. Update the onboarding page to use server-side auth');
    console.log('2. Add better error handling for cookie parsing');
    console.log('3. Use a different Supabase client initialization method');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

console.log('🔧 Cookie Parsing Fix Tool');
console.log('===========================\n');

fixCookieParsing();
