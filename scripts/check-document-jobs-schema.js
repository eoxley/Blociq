#!/usr/bin/env node

/**
 * Check Document Jobs Schema
 * This script checks the actual schema of the document_jobs table
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDocumentJobsSchema() {
  console.log('🔍 Checking Document Jobs Schema...\n');

  try {
    // Get a sample job to see the actual columns
    const { data: jobs, error: jobsError } = await supabase
      .from('document_jobs')
      .select('*')
      .limit(1);

    if (jobsError) {
      console.error('❌ Error fetching jobs:', jobsError);
      return;
    }

    if (!jobs || jobs.length === 0) {
      console.log('📋 No jobs found to check schema');
      return;
    }

    const job = jobs[0];
    console.log('📋 Document Jobs Table Schema:');
    console.log('Available columns:');
    Object.keys(job).forEach(key => {
      console.log(`   - ${key}: ${typeof job[key]} (${job[key]})`);
    });
    console.log('');

    // Check if progress column exists
    if ('progress' in job) {
      console.log('✅ Progress column exists');
    } else {
      console.log('❌ Progress column does not exist');
    }

    // Check if status column exists
    if ('status' in job) {
      console.log('✅ Status column exists');
    } else {
      console.log('❌ Status column does not exist');
    }

  } catch (error) {
    console.error('❌ Error checking schema:', error);
  }
}

checkDocumentJobsSchema();
