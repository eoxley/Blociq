#!/usr/bin/env node

/**
 * Test Lease Lab Endpoints
 * This script tests the lease lab API endpoints to see what's working
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

async function testLeaseLabEndpoints() {
  console.log('🧪 Testing Lease Lab Endpoints...\n');

  try {
    // Test 1: Check if document_jobs table exists
    console.log('1. Checking document_jobs table...');
    const { data: jobs, error: jobsError } = await supabase
      .from('document_jobs')
      .select('*')
      .limit(1);

    if (jobsError) {
      console.log('   ❌ document_jobs table error:', jobsError.message);
      console.log('   🔧 This is likely why the endpoints are failing');
      return;
    } else {
      console.log(`   ✅ document_jobs table exists (${jobs.length} records)`);
    }

    // Test 2: Check if agencies table exists
    console.log('\n2. Checking agencies table...');
    const { data: agencies, error: agenciesError } = await supabase
      .from('agencies')
      .select('*')
      .limit(1);

    if (agenciesError) {
      console.log('   ❌ agencies table error:', agenciesError.message);
    } else {
      console.log(`   ✅ agencies table exists (${agencies.length} records)`);
    }

    // Test 3: Check if default agency exists
    console.log('\n3. Checking for default agency...');
    const { data: defaultAgency, error: defaultAgencyError } = await supabase
      .from('agencies')
      .select('*')
      .eq('slug', 'default')
      .single();

    if (defaultAgencyError) {
      console.log('   ❌ No default agency found:', defaultAgencyError.message);
    } else {
      console.log('   ✅ Default agency exists:', defaultAgency.name);
    }

    // Test 4: Check if we can create a test job
    console.log('\n4. Testing job creation...');
    const testJob = {
      filename: 'test.pdf',
      status: 'QUEUED',
      size_bytes: 1024,
      mime: 'application/pdf',
      user_id: '00000000-0000-0000-0000-000000000000', // Dummy UUID
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: newJob, error: createError } = await supabase
      .from('document_jobs')
      .insert(testJob)
      .select()
      .single();

    if (createError) {
      console.log('   ❌ Error creating test job:', createError.message);
    } else {
      console.log('   ✅ Test job created successfully');
      
      // Clean up test job
      await supabase
        .from('document_jobs')
        .delete()
        .eq('id', newJob.id);
      console.log('   🧹 Test job cleaned up');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the test
testLeaseLabEndpoints();
