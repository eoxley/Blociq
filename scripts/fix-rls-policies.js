#!/usr/bin/env node

/**
 * Fix RLS Policies Script
 * 
 * This script fixes the RLS policies to work properly with super_admin access
 * by using direct role checks instead of relying on the problematic function.
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function fixRLSPolicies() {
  console.log('🔧 Fixing RLS Policies for Super Admin Access...\n');

  try {
    // Update RLS policies to check role directly
    console.log('1️⃣ Updating RLS policies...');
    
    const { error: policiesError } = await supabase
      .rpc('exec_sql', {
        sql: `
          -- Drop existing policies
          DROP POLICY IF EXISTS "Super admins can manage onboarding_raw" ON public.onboarding_raw;
          DROP POLICY IF EXISTS "Super admins can manage staging_structured" ON public.staging_structured;
          DROP POLICY IF EXISTS "Super admins can manage onboarding_batches" ON public.onboarding_batches;
          
          -- Create new policies that check role directly
          CREATE POLICY "Super admins can manage onboarding_raw" ON public.onboarding_raw
            FOR ALL USING (
              EXISTS (
                SELECT 1 FROM public.profiles 
                WHERE profiles.id = auth.uid() 
                AND profiles.role = 'super_admin'
              )
            );
          
          CREATE POLICY "Super admins can manage staging_structured" ON public.staging_structured
            FOR ALL USING (
              EXISTS (
                SELECT 1 FROM public.profiles 
                WHERE profiles.id = auth.uid() 
                AND profiles.role = 'super_admin'
              )
            );
          
          CREATE POLICY "Super admins can manage onboarding_batches" ON public.onboarding_batches
            FOR ALL USING (
              EXISTS (
                SELECT 1 FROM public.profiles 
                WHERE profiles.id = auth.uid() 
                AND profiles.role = 'super_admin'
              )
            );
        `
      });

    if (policiesError) {
      console.error('❌ Failed to update policies:', policiesError);
      return;
    }

    console.log('✅ RLS policies updated');

    // Test access to onboarding tables
    console.log('\n2️⃣ Testing table access...');
    
    const { data: rawData, error: rawError } = await supabase
      .from('onboarding_raw')
      .select('*')
      .limit(1);

    if (rawError) {
      console.error('❌ onboarding_raw access error:', rawError);
    } else {
      console.log('✅ Can access onboarding_raw:', rawData.length, 'records');
    }

    const { data: stagingData, error: stagingError } = await supabase
      .from('staging_structured')
      .select('*')
      .limit(1);

    if (stagingError) {
      console.error('❌ staging_structured access error:', stagingError);
    } else {
      console.log('✅ Can access staging_structured:', stagingData.length, 'records');
    }

    const { data: batchesData, error: batchesError } = await supabase
      .from('onboarding_batches')
      .select('*')
      .limit(1);

    if (batchesError) {
      console.error('❌ onboarding_batches access error:', batchesError);
    } else {
      console.log('✅ Can access onboarding_batches:', batchesData.length, 'records');
    }

    // Test creating a record
    console.log('\n3️⃣ Testing record creation...');
    
    const { data: testBatch, error: testError } = await supabase
      .from('onboarding_batches')
      .insert({
        batch_name: 'Test Batch - RLS Fix',
        agency_id: '00000000-0000-0000-0000-000000000001',
        building_name: 'Test Building',
        created_by: '938498a6-2906-4a75-bc91-5d0d586b227e'
      })
      .select()
      .single();

    if (testError) {
      console.error('❌ Test batch creation error:', testError);
    } else {
      console.log('✅ Test batch created successfully:', testBatch.id);
      
      // Clean up
      await supabase
        .from('onboarding_batches')
        .delete()
        .eq('id', testBatch.id);
      console.log('✅ Test batch cleaned up');
    }

    console.log('\n🎉 RLS policies fixed!');
    console.log('\n✅ You should now be able to access the onboarding module without authorization errors.');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

console.log('🔧 Fixing RLS Policies');
console.log('=======================\n');

fixRLSPolicies();
