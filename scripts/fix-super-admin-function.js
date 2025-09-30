#!/usr/bin/env node

/**
 * Fix Super Admin Function Script
 * 
 * This script fixes the is_super_admin() function to work properly
 * with the current authentication setup.
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function fixSuperAdminFunction() {
  console.log('🔧 Fixing Super Admin Function...\n');

  try {
    // First, let's check the current function
    console.log('1️⃣ Checking current is_super_admin function...');
    const { data: currentFunction, error: functionError } = await supabase
      .rpc('is_super_admin');

    console.log('Current function result:', currentFunction);
    console.log('Function error:', functionError);

    // Now let's create a better version of the function
    console.log('\n2️⃣ Creating improved is_super_admin function...');
    
    const { error: createError } = await supabase
      .rpc('exec_sql', {
        sql: `
          -- Drop the existing function
          DROP FUNCTION IF EXISTS public.is_super_admin();
          
          -- Create a new version that works better
          CREATE OR REPLACE FUNCTION public.is_super_admin()
          RETURNS boolean
          LANGUAGE plpgsql
          SECURITY DEFINER
          STABLE
          AS $$
          DECLARE
            user_role text;
          BEGIN
            -- Get the current user's role from profiles
            SELECT role INTO user_role 
            FROM public.profiles 
            WHERE id = auth.uid();
            
            -- Return true if role is super_admin
            RETURN COALESCE(user_role = 'super_admin', false);
          END;
          $$;
        `
      });

    if (createError) {
      console.error('❌ Failed to create function:', createError);
      return;
    }

    console.log('✅ Function created successfully');

    // Test the new function
    console.log('\n3️⃣ Testing new function...');
    const { data: newResult, error: newError } = await supabase
      .rpc('is_super_admin');

    if (newError) {
      console.error('❌ New function error:', newError);
    } else {
      console.log('✅ New function result:', newResult);
    }

    // Also create a simpler version that takes a user_id parameter
    console.log('\n4️⃣ Creating user-specific super_admin check function...');
    
    const { error: paramFunctionError } = await supabase
      .rpc('exec_sql', {
        sql: `
          CREATE OR REPLACE FUNCTION public.is_user_super_admin(user_id_param UUID)
          RETURNS boolean
          LANGUAGE plpgsql
          SECURITY DEFINER
          STABLE
          AS $$
          DECLARE
            user_role text;
          BEGIN
            -- Get the user's role from profiles
            SELECT role INTO user_role 
            FROM public.profiles 
            WHERE id = user_id_param;
            
            -- Return true if role is super_admin
            RETURN COALESCE(user_role = 'super_admin', false);
          END;
          $$;
        `
      });

    if (paramFunctionError) {
      console.error('❌ Failed to create parameterized function:', paramFunctionError);
    } else {
      console.log('✅ Parameterized function created');
      
      // Test it with Eleanor's ID
      const { data: paramResult, error: paramError } = await supabase
        .rpc('is_user_super_admin', { user_id_param: '938498a6-2906-4a75-bc91-5d0d586b227e' });
      
      if (paramError) {
        console.error('❌ Parameterized function error:', paramError);
      } else {
        console.log('✅ Parameterized function result for Eleanor:', paramResult);
      }
    }

    console.log('\n🎉 Super admin functions fixed!');
    console.log('\n✅ You should now be able to access the onboarding module.');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

console.log('🔧 Fixing Super Admin Function');
console.log('===============================\n');

fixSuperAdminFunction();
