#!/usr/bin/env node

/**
 * Simple Super Admin Debug Script
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function simpleDebug() {
  console.log('🔍 Simple Super Admin Debug\n');

  const ELEANOR_ID = '938498a6-2906-4a75-bc91-5d0d586b227e';

  try {
    // 1. Check profile
    console.log('1️⃣ Profile check:');
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, role')
      .eq('id', ELEANOR_ID)
      .single();

    if (profileError) {
      console.error('❌ Profile error:', profileError);
      return;
    }

    console.log('✅ Profile:', profile);

    // 2. Test onboarding_raw table access
    console.log('\n2️⃣ Testing onboarding_raw table:');
    const { data: rawData, error: rawError } = await supabase
      .from('onboarding_raw')
      .select('*')
      .limit(1);

    if (rawError) {
      console.error('❌ onboarding_raw error:', rawError);
      if (rawError.code === '42P01') {
        console.log('🔧 Table does not exist. Run the onboarding migration first.');
      }
    } else {
      console.log('✅ Can access onboarding_raw:', rawData.length, 'records');
    }

    // 3. Test staging_structured table access
    console.log('\n3️⃣ Testing staging_structured table:');
    const { data: stagingData, error: stagingError } = await supabase
      .from('staging_structured')
      .select('*')
      .limit(1);

    if (stagingError) {
      console.error('❌ staging_structured error:', stagingError);
    } else {
      console.log('✅ Can access staging_structured:', stagingData.length, 'records');
    }

    // 4. Test onboarding_batches table access
    console.log('\n4️⃣ Testing onboarding_batches table:');
    const { data: batchesData, error: batchesError } = await supabase
      .from('onboarding_batches')
      .select('*')
      .limit(1);

    if (batchesError) {
      console.error('❌ onboarding_batches error:', batchesError);
    } else {
      console.log('✅ Can access onboarding_batches:', batchesData.length, 'records');
    }

    // 5. Check if is_super_admin function works
    console.log('\n5️⃣ Testing is_super_admin function:');
    try {
      const { data: functionResult, error: functionError } = await supabase
        .rpc('is_super_admin');
      
      if (functionError) {
        console.error('❌ Function error:', functionError);
      } else {
        console.log('✅ Function result:', functionResult);
      }
    } catch (e) {
      console.error('❌ Function exception:', e.message);
    }

    console.log('\n🎯 Summary:');
    console.log(`Profile role: ${profile.role}`);
    console.log(`Tables exist: ${!rawError && !stagingError && !batchesError ? 'Yes' : 'No'}`);

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

simpleDebug();
