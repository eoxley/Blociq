#!/usr/bin/env node

/**
 * Create Document Jobs Table
 * This script creates the document_jobs table with all necessary columns and RLS policies
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

async function createDocumentJobsTable() {
  console.log('🔧 Creating document_jobs table...\n');

  try {
    // Create the table
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS public.document_jobs (
        id uuid NOT NULL DEFAULT gen_random_uuid(),
        filename character varying(255) NOT NULL,
        status character varying(50) NOT NULL DEFAULT 'QUEUED',
        size_bytes integer NOT NULL,
        mime character varying(100) NOT NULL,
        page_count integer,
        doc_type_guess character varying(100),
        linked_building_id uuid,
        linked_unit_id uuid,
        error_code character varying(100),
        error_message text,
        ocr_artifact_url text,
        extracted_text text,
        extracted_json jsonb,
        summary_json jsonb,
        token_usage integer,
        latency_ms integer,
        created_at timestamp with time zone DEFAULT now(),
        updated_at timestamp with time zone DEFAULT now(),
        user_id uuid NOT NULL,
        agency_id uuid,
        CONSTRAINT document_jobs_pkey PRIMARY KEY (id),
        CONSTRAINT document_jobs_status_check CHECK (status IN ('QUEUED', 'OCR', 'EXTRACT', 'SUMMARISE', 'READY', 'FAILED'))
      );
    `;

    const { error: tableError } = await supabase.rpc('exec_sql', { sql: createTableSQL });
    
    if (tableError) {
      console.log('   ❌ Error creating table:', tableError.message);
      return;
    }
    
    console.log('   ✅ Table created successfully');

    // Enable RLS
    const enableRLSSQL = `ALTER TABLE public.document_jobs ENABLE ROW LEVEL SECURITY;`;
    const { error: rlsError } = await supabase.rpc('exec_sql', { sql: enableRLSSQL });
    
    if (rlsError) {
      console.log('   ❌ Error enabling RLS:', rlsError.message);
    } else {
      console.log('   ✅ RLS enabled');
    }

    // Create RLS policies
    const policiesSQL = `
      -- Drop existing policies if they exist
      DROP POLICY IF EXISTS "Users can view their own document jobs" ON public.document_jobs;
      DROP POLICY IF EXISTS "Users can insert their own document jobs" ON public.document_jobs;
      DROP POLICY IF EXISTS "Users can update their own document jobs" ON public.document_jobs;

      -- Create RLS policies
      CREATE POLICY "Users can view their own document jobs"
      ON public.document_jobs
      FOR SELECT
      USING (
        user_id = (
          current_setting('request.jwt.claims', true)::json->>'sub'
        )::uuid
      );

      CREATE POLICY "Users can insert their own document jobs"
      ON public.document_jobs
      FOR INSERT
      WITH CHECK (
        user_id = (
          current_setting('request.jwt.claims', true)::json->>'sub'
        )::uuid
      );

      CREATE POLICY "Users can update their own document jobs"
      ON public.document_jobs
      FOR UPDATE
      USING (
        user_id = (
          current_setting('request.jwt.claims', true)::json->>'sub'
        )::uuid
      );
    `;

    const { error: policiesError } = await supabase.rpc('exec_sql', { sql: policiesSQL });
    
    if (policiesError) {
      console.log('   ❌ Error creating policies:', policiesError.message);
    } else {
      console.log('   ✅ RLS policies created');
    }

    // Add foreign key constraints
    const constraintsSQL = `
      -- Add foreign key constraints
      ALTER TABLE public.document_jobs
      ADD CONSTRAINT IF NOT EXISTS document_jobs_linked_building_id_fkey
      FOREIGN KEY (linked_building_id) REFERENCES public.buildings(id) ON DELETE SET NULL;

      ALTER TABLE public.document_jobs
      ADD CONSTRAINT IF NOT EXISTS document_jobs_linked_unit_id_fkey
      FOREIGN KEY (linked_unit_id) REFERENCES public.units(id) ON DELETE SET NULL;

      ALTER TABLE public.document_jobs
      ADD CONSTRAINT IF NOT EXISTS document_jobs_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

      ALTER TABLE public.document_jobs
      ADD CONSTRAINT IF NOT EXISTS document_jobs_agency_id_fkey
      FOREIGN KEY (agency_id) REFERENCES public.agencies(id) ON DELETE SET NULL;
    `;

    const { error: constraintsError } = await supabase.rpc('exec_sql', { sql: constraintsSQL });
    
    if (constraintsError) {
      console.log('   ❌ Error adding constraints:', constraintsError.message);
    } else {
      console.log('   ✅ Foreign key constraints added');
    }

    // Create indexes
    const indexesSQL = `
      -- Create indexes for better performance
      CREATE INDEX IF NOT EXISTS idx_document_jobs_agency_id ON public.document_jobs USING btree (agency_id);
      CREATE INDEX IF NOT EXISTS idx_document_jobs_user_id ON public.document_jobs USING btree (user_id);
      CREATE INDEX IF NOT EXISTS idx_document_jobs_status ON public.document_jobs USING btree (status);
      CREATE INDEX IF NOT EXISTS idx_document_jobs_created_at ON public.document_jobs USING btree (created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_document_jobs_linked_building_id ON public.document_jobs USING btree (linked_building_id);
      CREATE INDEX IF NOT EXISTS idx_document_jobs_linked_unit_id ON public.document_jobs USING btree (linked_unit_id);
    `;

    const { error: indexesError } = await supabase.rpc('exec_sql', { sql: indexesSQL });
    
    if (indexesError) {
      console.log('   ❌ Error creating indexes:', indexesError.message);
    } else {
      console.log('   ✅ Indexes created');
    }

    console.log('\n🎉 document_jobs table created successfully!');
    console.log('   Now the lease lab endpoints should work properly.');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the creation
createDocumentJobsTable();
