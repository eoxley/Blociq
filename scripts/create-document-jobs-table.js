#!/usr/bin/env node

/**
 * Create Document Jobs Table
 * This script creates the document_jobs table directly
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
    // Create the table using SQL
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

    const { error: createError } = await supabase.rpc('exec_sql', { sql: createTableSQL });
    
    if (createError) {
      console.log('   ❌ Error creating table:', createError.message);
      return;
    }

    console.log('   ✅ document_jobs table created');

    // Create indexes
    const createIndexesSQL = `
      CREATE INDEX IF NOT EXISTS idx_document_jobs_user_id ON public.document_jobs USING btree (user_id);
      CREATE INDEX IF NOT EXISTS idx_document_jobs_status ON public.document_jobs USING btree (status);
      CREATE INDEX IF NOT EXISTS idx_document_jobs_created_at ON public.document_jobs USING btree (created_at DESC);
    `;

    const { error: indexError } = await supabase.rpc('exec_sql', { sql: createIndexesSQL });
    
    if (indexError) {
      console.log('   ⚠️ Error creating indexes:', indexError.message);
    } else {
      console.log('   ✅ Indexes created');
    }

    // Enable RLS
    const enableRLSSQL = `ALTER TABLE public.document_jobs ENABLE ROW LEVEL SECURITY;`;
    const { error: rlsError } = await supabase.rpc('exec_sql', { sql: enableRLSSQL });
    
    if (rlsError) {
      console.log('   ⚠️ Error enabling RLS:', rlsError.message);
    } else {
      console.log('   ✅ RLS enabled');
    }

    // Create RLS policies
    const createPoliciesSQL = `
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

    const { error: policyError } = await supabase.rpc('exec_sql', { sql: createPoliciesSQL });
    
    if (policyError) {
      console.log('   ⚠️ Error creating policies:', policyError.message);
    } else {
      console.log('   ✅ RLS policies created');
    }

    console.log('\n🎉 document_jobs table setup complete!');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the creation
createDocumentJobsTable();
