#!/usr/bin/env node

/**
 * Simple Table Creation
 * This script creates the document_jobs table using a simple approach
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

async function createTable() {
  console.log('🔧 Creating document_jobs table...\n');

  try {
    // First, let's check if the table exists
    const { data: existingTable, error: checkError } = await supabase
      .from('document_jobs')
      .select('id')
      .limit(1);

    if (checkError && checkError.code === 'PGRST116') {
      console.log('   📋 Table does not exist, creating...');
      
      // Since we can't create tables directly via the client, let's create a simple test
      // by trying to insert a test record and see what happens
      console.log('   ⚠️ Cannot create table via client. Please run the migration manually.');
      console.log('   📝 Migration file: supabase/migrations/20250124_create_document_jobs_table.sql');
      console.log('   🔗 Or run this SQL in your Supabase dashboard:');
      console.log(`
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
      `);
    } else if (checkError) {
      console.log('   ❌ Error checking table:', checkError.message);
    } else {
      console.log('   ✅ Table already exists!');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the creation
createTable();
