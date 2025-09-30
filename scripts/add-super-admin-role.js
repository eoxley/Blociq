#!/usr/bin/env node

/**
 * Add Super Admin Role Support Script
 * 
 * This script adds the role column to profiles table and creates the necessary
 * functions and policies for super_admin access to the onboarding module.
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

async function addSuperAdminSupport() {
  console.log('🔧 Adding super_admin role support...\n');

  try {
    // 1. Add role column to profiles table if it doesn't exist
    console.log('1️⃣ Adding role column to profiles table...');
    const { error: alterError } = await supabase.rpc('exec_sql', {
      sql: `
        -- Add role column if it doesn't exist
        ALTER TABLE profiles 
        ADD COLUMN IF NOT EXISTS role VARCHAR(50);
        
        -- Add check constraint for valid roles
        ALTER TABLE profiles 
        DROP CONSTRAINT IF EXISTS profiles_role_check;
        
        ALTER TABLE profiles 
        ADD CONSTRAINT profiles_role_check 
        CHECK (role IN ('super_admin', 'admin', 'manager', 'staff', 'leaseholder', 'director'));
        
        -- Create index on role for performance
        CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
      `
    });

    if (alterError) {
      console.error('❌ Failed to add role column:', alterError);
      return;
    }

    console.log('✅ Role column added to profiles table');

    // 2. Create super_admin access function
    console.log('\n2️⃣ Creating super_admin access function...');
    const { error: functionError } = await supabase.rpc('exec_sql', {
      sql: `
        -- Create super_admin access function
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
      `
    });

    if (functionError) {
      console.error('❌ Failed to create super_admin function:', functionError);
      return;
    }

    console.log('✅ Super admin access function created');

    // 3. Create audit_log table if it doesn't exist
    console.log('\n3️⃣ Creating audit_log table...');
    const { error: auditError } = await supabase.rpc('exec_sql', {
      sql: `
        -- Add audit_log table if it doesn't exist
        CREATE TABLE IF NOT EXISTS public.audit_log (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          staging_id UUID,
          user_id UUID REFERENCES auth.users(id),
          action TEXT NOT NULL,
          table_name TEXT,
          record_id UUID,
          timestamp TIMESTAMPTZ DEFAULT NOW(),
          status TEXT DEFAULT 'success',
          details JSONB,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Enable RLS on audit_log
        ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

        -- Create policy for super_admin access to audit_log
        DROP POLICY IF EXISTS "Super admins can view audit_log" ON public.audit_log;
        CREATE POLICY "Super admins can view audit_log" ON public.audit_log
          FOR SELECT USING (public.is_super_admin());

        -- Create indexes for audit_log performance
        CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
        CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp);
        CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
      `
    });

    if (auditError) {
      console.error('❌ Failed to create audit_log table:', auditError);
      return;
    }

    console.log('✅ Audit log table created');

    // 4. Update RLS policies for onboarding tables
    console.log('\n4️⃣ Updating RLS policies for onboarding tables...');
    
    // Check if onboarding tables exist and update their policies
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .in('table_name', ['onboarding_raw', 'staging_structured', 'onboarding_batches']);

    if (tablesError) {
      console.error('❌ Failed to check tables:', tablesError);
      return;
    }

    const existingTables = tables.map(t => t.table_name);
    console.log('Found onboarding tables:', existingTables);

    // Update policies for each existing table
    for (const tableName of existingTables) {
      const { error: policyError } = await supabase.rpc('exec_sql', {
        sql: `
          -- Drop existing policies if they exist
          DROP POLICY IF EXISTS "Super admins can manage ${tableName}" ON public.${tableName};
          
          -- Create super admin policy
          CREATE POLICY "Super admins can manage ${tableName}" ON public.${tableName}
            FOR ALL USING (public.is_super_admin());
        `
      });

      if (policyError) {
        console.error(`❌ Failed to update policy for ${tableName}:`, policyError);
        return;
      }

      console.log(`✅ Updated RLS policy for ${tableName}`);
    }

    console.log('\n🎉 Super admin role support added successfully!');
    console.log('\nNext steps:');
    console.log('1. Run: node scripts/make-super-admin.js <your-email>');
    console.log('2. Access the onboarding module at /dashboard/onboarding');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

console.log('🚀 Adding Super Admin Role Support');
console.log('===================================\n');

addSuperAdminSupport();
