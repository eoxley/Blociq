#!/usr/bin/env node

// Test script to debug Lease Lab upload issues
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function testLeaseLabUpload() {
  console.log('🔍 Testing Lease Lab upload database setup...');
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase environment variables');
    console.log('NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl);
    console.log('SUPABASE_SERVICE_ROLE_KEY:', !!supabaseKey);
    return;
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  try {
    // 1. Check if agencies table exists
    console.log('\n1. Checking agencies table...');
    const { data: agencies, error: agenciesError } = await supabase
      .from('agencies')
      .select('id, name')
      .limit(1);
    
    if (agenciesError) {
      console.error('❌ Agencies table error:', agenciesError.message);
      
      // Try to create a minimal agencies table
      console.log('🔧 Creating agencies table...');
      const { error: createAgenciesError } = await supabase.rpc('exec_sql', {
        sql: `
          CREATE TABLE IF NOT EXISTS public.agencies (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            name text NOT NULL,
            slug text UNIQUE,
            status text DEFAULT 'active',
            created_at timestamptz DEFAULT now(),
            updated_at timestamptz DEFAULT now()
          );
        `
      });
      
      if (createAgenciesError) {
        console.error('❌ Failed to create agencies table:', createAgenciesError.message);
      } else {
        console.log('✅ Created agencies table');
        
        // Insert a default agency
        const { error: insertAgencyError } = await supabase
          .from('agencies')
          .insert({
            name: 'BlocIQ',
            slug: 'blociq',
            status: 'active'
          });
        
        if (insertAgencyError) {
          console.error('❌ Failed to insert default agency:', insertAgencyError.message);
        } else {
          console.log('✅ Inserted default agency');
        }
      }
    } else {
      console.log('✅ Agencies table exists:', agencies?.length || 0, 'agencies found');
    }
    
    // 2. Check if document_jobs table exists
    console.log('\n2. Checking document_jobs table...');
    const { data: documentJobs, error: documentJobsError } = await supabase
      .from('document_jobs')
      .select('id')
      .limit(1);
    
    if (documentJobsError) {
      console.error('❌ Document jobs table error:', documentJobsError.message);
      
      // Try to create the document_jobs table
      console.log('🔧 Creating document_jobs table...');
      const { error: createDocumentJobsError } = await supabase.rpc('exec_sql', {
        sql: `
          CREATE TABLE IF NOT EXISTS public.document_jobs (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
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
            extracted_json jsonb,
            summary_json jsonb,
            token_usage integer,
            latency_ms integer,
            created_at timestamp with time zone DEFAULT now(),
            updated_at timestamp with time zone DEFAULT now(),
            user_id uuid NOT NULL,
            agency_id uuid NOT NULL,
            CONSTRAINT document_jobs_status_check CHECK (status IN ('QUEUED', 'OCR', 'EXTRACT', 'SUMMARISE', 'READY', 'FAILED'))
          );
        `
      });
      
      if (createDocumentJobsError) {
        console.error('❌ Failed to create document_jobs table:', createDocumentJobsError.message);
      } else {
        console.log('✅ Created document_jobs table');
      }
    } else {
      console.log('✅ Document jobs table exists:', documentJobs?.length || 0, 'jobs found');
    }
    
    // 3. Check if agency_members table exists
    console.log('\n3. Checking agency_members table...');
    const { data: agencyMembers, error: agencyMembersError } = await supabase
      .from('agency_members')
      .select('agency_id, user_id')
      .limit(1);
    
    if (agencyMembersError) {
      console.error('❌ Agency members table error:', agencyMembersError.message);
      
      // Try to create the agency_members table
      console.log('🔧 Creating agency_members table...');
      const { error: createAgencyMembersError } = await supabase.rpc('exec_sql', {
        sql: `
          CREATE TABLE IF NOT EXISTS public.agency_members (
            agency_id uuid NOT NULL,
            user_id uuid NOT NULL,
            role text DEFAULT 'manager',
            invitation_status text DEFAULT 'accepted',
            joined_at timestamptz DEFAULT now(),
            created_at timestamptz DEFAULT now(),
            updated_at timestamptz DEFAULT now(),
            PRIMARY KEY (agency_id, user_id)
          );
        `
      });
      
      if (createAgencyMembersError) {
        console.error('❌ Failed to create agency_members table:', createAgencyMembersError.message);
      } else {
        console.log('✅ Created agency_members table');
      }
    } else {
      console.log('✅ Agency members table exists:', agencyMembers?.length || 0, 'members found');
    }
    
    // 4. Test a sample document job creation
    console.log('\n4. Testing document job creation...');
    
    // Get a test agency
    const { data: testAgency } = await supabase
      .from('agencies')
      .select('id')
      .limit(1)
      .single();
    
    if (testAgency) {
      const testJobData = {
        filename: 'test-document.pdf',
        status: 'QUEUED',
        size_bytes: 1024,
        mime: 'application/pdf',
        user_id: '00000000-0000-0000-0000-000000000000', // Dummy UUID
        agency_id: testAgency.id
      };
      
      const { data: testJob, error: testJobError } = await supabase
        .from('document_jobs')
        .insert(testJobData)
        .select()
        .single();
      
      if (testJobError) {
        console.error('❌ Test job creation failed:', testJobError.message);
        console.error('Test data:', testJobData);
      } else {
        console.log('✅ Test job created successfully:', testJob.id);
        
        // Clean up test job
        await supabase
          .from('document_jobs')
          .delete()
          .eq('id', testJob.id);
        console.log('🧹 Cleaned up test job');
      }
    } else {
      console.log('⚠️ No agency found for testing');
    }
    
    console.log('\n✅ Database setup test completed');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testLeaseLabUpload().catch(console.error);
