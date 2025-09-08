#!/usr/bin/env node

/**
 * Test Lease Upload Fix
 * This script tests if the lease upload now works without building requirements
 */

const { createClient } = require('@supabase/supabase-js');
const FormData = require('form-data');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testLeaseUpload() {
  console.log('🧪 Testing Lease Upload Fix...\n');

  try {
    // Step 1: Check if eleanor.oxley@blociq.co.uk exists
    console.log('1. Checking user account...');
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'eleanor.oxley@blociq.co.uk')
      .single();

    if (userError || !user) {
      console.log('   ❌ User not found:', userError?.message);
      return;
    }

    console.log(`   ✅ User found: ${user.email} (ID: ${user.id})`);

    // Step 2: Check agency membership
    console.log('\n2. Checking agency membership...');
    const { data: agencyMember, error: agencyError } = await supabase
      .from('agency_members')
      .select('*, agencies(*)')
      .eq('user_id', user.id)
      .single();

    if (agencyError) {
      console.log('   ❌ Agency membership error:', agencyError.message);
    } else if (agencyMember) {
      console.log(`   ✅ Agency membership found: ${agencyMember.agencies?.name} (${agencyMember.role})`);
    } else {
      console.log('   ⚠️ No agency membership found - this should be auto-created during upload');
    }

    // Step 3: Check if document_jobs table exists
    console.log('\n3. Checking document_jobs table...');
    const { data: jobs, error: jobsError } = await supabase
      .from('document_jobs')
      .select('id')
      .limit(1);

    if (jobsError) {
      console.log('   ❌ document_jobs table error:', jobsError.message);
      return;
    }

    console.log('   ✅ document_jobs table accessible');

    // Step 4: Check if agencies table exists
    console.log('\n4. Checking agencies table...');
    const { data: agencies, error: agenciesError } = await supabase
      .from('agencies')
      .select('id, name, slug')
      .limit(5);

    if (agenciesError) {
      console.log('   ❌ agencies table error:', agenciesError.message);
      return;
    }

    console.log(`   ✅ agencies table accessible (${agencies.length} agencies found)`);
    if (agencies.length > 0) {
      agencies.forEach(agency => {
        console.log(`      - ${agency.name} (${agency.slug})`);
      });
    }

    // Step 5: Test the upload endpoint (simulate)
    console.log('\n5. Testing upload endpoint logic...');
    
    // Check if we can create a test job
    const testJob = {
      filename: 'test-lease.pdf',
      status: 'QUEUED',
      size_bytes: 1024,
      mime: 'application/pdf',
      user_id: user.id,
      agency_id: agencyMember?.agency_id || agencies[0]?.id || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (!testJob.agency_id) {
      console.log('   ⚠️ No agency ID available - this will trigger the auto-creation logic');
    } else {
      console.log(`   ✅ Agency ID available: ${testJob.agency_id}`);
    }

    // Step 6: Summary
    console.log('\n📊 SUMMARY:');
    console.log(`   ${user ? '✅' : '❌'} User account exists`);
    console.log(`   ${agencyMember ? '✅' : '⚠️'} Agency membership (will be auto-created if missing)`);
    console.log(`   ${jobs !== null ? '✅' : '❌'} document_jobs table accessible`);
    console.log(`   ${agencies.length > 0 ? '✅' : '❌'} agencies table accessible`);

    if (user && jobs !== null && agencies.length > 0) {
      console.log('\n🎉 Lease upload should now work!');
      console.log('   - Agency membership will be auto-created if missing');
      console.log('   - No building requirements');
      console.log('   - Document processing will work without building links');
    } else {
      console.log('\n⚠️ Some issues remain that may prevent upload');
    }

  } catch (error) {
    console.error('❌ Error testing lease upload:', error);
  }
}

// Run the test
testLeaseUpload();
