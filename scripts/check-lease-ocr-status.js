#!/usr/bin/env node

/**
 * Check Lease OCR Status
 * This script checks the current status of lease processing jobs
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

async function checkLeaseOCRStatus() {
  console.log('🔍 Checking Lease OCR Status...\n');

  try {
    // Get all lease processing jobs
    const { data: jobs, error: jobsError } = await supabase
      .from('document_jobs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (jobsError) {
      console.error('❌ Error fetching jobs:', jobsError);
      return;
    }

    if (!jobs || jobs.length === 0) {
      console.log('📋 No lease processing jobs found');
      return;
    }

    console.log(`📋 Found ${jobs.length} lease processing jobs:\n`);

    jobs.forEach((job, index) => {
      const status = job.status || 'unknown';
      const progress = job.progress || 0;
      const createdAt = new Date(job.created_at).toLocaleString();
      const updatedAt = new Date(job.updated_at).toLocaleString();
      
      let statusIcon = '⏳';
      let statusColor = '';
      
      switch (status) {
        case 'completed':
          statusIcon = '✅';
          statusColor = '\x1b[32m'; // Green
          break;
        case 'processing':
          statusIcon = '🔄';
          statusColor = '\x1b[33m'; // Yellow
          break;
        case 'failed':
          statusIcon = '❌';
          statusColor = '\x1b[31m'; // Red
          break;
        case 'pending':
          statusIcon = '⏳';
          statusColor = '\x1b[36m'; // Cyan
          break;
        default:
          statusIcon = '❓';
          statusColor = '\x1b[37m'; // White
      }

      console.log(`${index + 1}. ${statusIcon} ${job.filename || 'Unknown file'}`);
      console.log(`   Status: ${statusColor}${status}\x1b[0m`);
      console.log(`   Progress: ${progress}%`);
      console.log(`   Created: ${createdAt}`);
      console.log(`   Updated: ${updatedAt}`);
      
      if (job.error_message) {
        console.log(`   Error: \x1b[31m${job.error_message}\x1b[0m`);
      }
      
      if (job.analysis_result) {
        console.log(`   Analysis: \x1b[32mCompleted\x1b[0m`);
      }
      
      console.log('');
    });

    // Check for stuck jobs (processing for more than 10 minutes)
    const stuckJobs = jobs.filter(job => {
      if (job.status !== 'processing') return false;
      const createdAt = new Date(job.created_at);
      const now = new Date();
      const diffMinutes = (now - createdAt) / (1000 * 60);
      return diffMinutes > 10;
    });

    if (stuckJobs.length > 0) {
      console.log('⚠️  Stuck Jobs (processing for more than 10 minutes):');
      stuckJobs.forEach(job => {
        const createdAt = new Date(job.created_at);
        const now = new Date();
        const diffMinutes = Math.round((now - createdAt) / (1000 * 60));
        console.log(`   - ${job.filename}: ${diffMinutes} minutes`);
      });
      console.log('');
    }

    // Check OCR service health
    console.log('🔍 Checking OCR Service Health...');
    try {
      const response = await fetch(`${process.env.RENDER_OCR_URL}/health`);
      if (response.ok) {
        const health = await response.json();
        console.log('✅ OCR Service Status:', health);
      } else {
        console.log('❌ OCR Service not responding:', response.status);
      }
    } catch (error) {
      console.log('❌ OCR Service error:', error.message);
    }

  } catch (error) {
    console.error('❌ Error checking lease OCR status:', error);
  }
}

checkLeaseOCRStatus();
