#!/usr/bin/env node

/**
 * Comprehensive Lease Upload Audit
 * This script traces every step of the lease upload process to identify stalling points
 */

const { createClient } = require('@supabase/supabase-js');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
require('dotenv').config({ path: '.env.local' });

const CONFIG = {
  SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001',
  RENDER_OCR_URL: process.env.RENDER_OCR_URL,
  RENDER_OCR_TOKEN: process.env.RENDER_OCR_TOKEN,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY
};

if (!CONFIG.SUPABASE_URL || !CONFIG.SUPABASE_KEY) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);

async function auditLeaseUploadSystem() {
  console.log('🔍 COMPREHENSIVE LEASE UPLOAD AUDIT\n');
  console.log('=' * 60);

  let auditResults = {
    database: { passed: 0, failed: 0, issues: [] },
    storage: { passed: 0, failed: 0, issues: [] },
    ocr: { passed: 0, failed: 0, issues: [] },
    ai: { passed: 0, failed: 0, issues: [] },
    environment: { passed: 0, failed: 0, issues: [] }
  };

  // STEP 1: Environment Variables Audit
  console.log('1️⃣  ENVIRONMENT VARIABLES AUDIT');
  console.log('-'.repeat(40));
  
  const requiredEnvVars = {
    'NEXT_PUBLIC_SUPABASE_URL': CONFIG.SUPABASE_URL,
    'SUPABASE_SERVICE_ROLE_KEY': CONFIG.SUPABASE_KEY,
    'RENDER_OCR_URL': CONFIG.RENDER_OCR_URL,
    'RENDER_OCR_TOKEN': CONFIG.RENDER_OCR_TOKEN,
    'OPENAI_API_KEY': CONFIG.OPENAI_API_KEY,
    'NEXT_PUBLIC_SITE_URL': CONFIG.SITE_URL
  };

  for (const [key, value] of Object.entries(requiredEnvVars)) {
    if (value) {
      console.log(`   ✅ ${key}: ${key.includes('TOKEN') || key.includes('KEY') ? '[HIDDEN]' : value}`);
      auditResults.environment.passed++;
    } else {
      console.log(`   ❌ ${key}: NOT SET`);
      auditResults.environment.failed++;
      auditResults.environment.issues.push(`Missing ${key}`);
    }
  }

  // STEP 2: Database Structure Audit
  console.log('\n2️⃣  DATABASE STRUCTURE AUDIT');
  console.log('-'.repeat(40));

  try {
    // Check document_jobs table
    const { data: jobsSchema, error: jobsError } = await supabase
      .from('document_jobs')
      .select('*')
      .limit(0);
    
    if (jobsError) {
      console.log('   ❌ document_jobs table:', jobsError.message);
      auditResults.database.failed++;
      auditResults.database.issues.push('document_jobs table not accessible');
    } else {
      console.log('   ✅ document_jobs table: EXISTS');
      auditResults.database.passed++;
      
      // Check for existing jobs
      const { data: existingJobs, error: existingJobsError } = await supabase
        .from('document_jobs')
        .select('id, status, created_at')
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (existingJobs && existingJobs.length > 0) {
        console.log(`   📊 Recent jobs found: ${existingJobs.length}`);
        existingJobs.forEach(job => {
          console.log(`      - Job ${job.id}: ${job.status} (${job.created_at})`);
        });
      } else {
        console.log('   📊 No recent jobs found');
      }
    }

    // Check users table
    const { data: usersSchema, error: usersError } = await supabase
      .from('users')
      .select('id')
      .limit(1);
    
    if (usersError) {
      console.log('   ❌ users table:', usersError.message);
      auditResults.database.failed++;
      auditResults.database.issues.push('users table not accessible');
    } else {
      console.log('   ✅ users table: EXISTS');
      auditResults.database.passed++;
    }

  } catch (dbError) {
    console.log('   ❌ Database connection failed:', dbError.message);
    auditResults.database.failed++;
    auditResults.database.issues.push('Database connection failed');
  }

  // STEP 3: Storage System Audit
  console.log('\n3️⃣  STORAGE SYSTEM AUDIT');
  console.log('-'.repeat(40));

  try {
    // Check building_documents bucket
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.log('   ❌ Storage buckets:', bucketsError.message);
      auditResults.storage.failed++;
      auditResults.storage.issues.push('Cannot access storage buckets');
    } else {
      const buildingDocsBucket = buckets.find(b => b.name === 'building_documents');
      if (buildingDocsBucket) {
        console.log('   ✅ building_documents bucket: EXISTS');
        auditResults.storage.passed++;
      } else {
        console.log('   ❌ building_documents bucket: NOT FOUND');
        auditResults.storage.failed++;
        auditResults.storage.issues.push('building_documents bucket missing');
      }
      
      console.log(`   📊 Available buckets: ${buckets.map(b => b.name).join(', ')}`);
    }

  } catch (storageError) {
    console.log('   ❌ Storage system error:', storageError.message);
    auditResults.storage.failed++;
    auditResults.storage.issues.push('Storage system error');
  }

  // STEP 4: OCR Service Audit
  console.log('\n4️⃣  OCR SERVICE AUDIT');
  console.log('-'.repeat(40));

  if (!CONFIG.RENDER_OCR_URL || !CONFIG.RENDER_OCR_TOKEN) {
    console.log('   ❌ OCR configuration incomplete');
    auditResults.ocr.failed++;
    auditResults.ocr.issues.push('Missing OCR configuration');
  } else {
    try {
      // Test OCR service health
      const healthResponse = await fetch(`${CONFIG.RENDER_OCR_URL.replace('/upload', '')}/health`);
      
      if (healthResponse.ok) {
        const healthData = await healthResponse.json();
        console.log('   ✅ OCR service: HEALTHY');
        console.log(`   📊 OCR capabilities: ${Object.entries(healthData.services || {}).map(([k,v]) => `${k}:${v}`).join(', ')}`);
        auditResults.ocr.passed++;
      } else {
        console.log(`   ❌ OCR service: HTTP ${healthResponse.status}`);
        auditResults.ocr.failed++;
        auditResults.ocr.issues.push(`OCR service returned ${healthResponse.status}`);
      }
      
    } catch (ocrError) {
      console.log('   ❌ OCR service connection:', ocrError.message);
      auditResults.ocr.failed++;
      auditResults.ocr.issues.push('Cannot connect to OCR service');
    }
  }

  // STEP 5: AI Analysis Audit
  console.log('\n5️⃣  AI ANALYSIS AUDIT');
  console.log('-'.repeat(40));

  if (!CONFIG.OPENAI_API_KEY) {
    console.log('   ❌ OpenAI API key not set');
    auditResults.ai.failed++;
    auditResults.ai.issues.push('Missing OpenAI API key');
  } else {
    try {
      // Test OpenAI API with minimal request
      const testResponse = await fetch('https://api.openai.com/v1/models', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${CONFIG.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      if (testResponse.ok) {
        console.log('   ✅ OpenAI API: ACCESSIBLE');
        auditResults.ai.passed++;
      } else {
        console.log(`   ❌ OpenAI API: HTTP ${testResponse.status}`);
        auditResults.ai.failed++;
        auditResults.ai.issues.push(`OpenAI API returned ${testResponse.status}`);
      }

    } catch (aiError) {
      console.log('   ❌ OpenAI API connection:', aiError.message);
      auditResults.ai.failed++;
      auditResults.ai.issues.push('Cannot connect to OpenAI API');
    }
  }

  // STEP 6: Trace Recent Failed Jobs
  console.log('\n6️⃣  RECENT FAILED JOBS ANALYSIS');
  console.log('-'.repeat(40));

  try {
    const { data: failedJobs, error: failedJobsError } = await supabase
      .from('document_jobs')
      .select('*')
      .in('status', ['FAILED', 'OCR', 'EXTRACT', 'SUMMARISE'])
      .order('updated_at', { ascending: false })
      .limit(10);

    if (failedJobsError) {
      console.log('   ❌ Cannot query failed jobs:', failedJobsError.message);
    } else if (failedJobs && failedJobs.length > 0) {
      console.log(`   📊 Found ${failedJobs.length} potentially stalled/failed jobs:`);
      failedJobs.forEach(job => {
        const age = Math.round((Date.now() - new Date(job.updated_at).getTime()) / (1000 * 60));
        console.log(`      - Job ${job.id}: ${job.status} (${job.filename}, ${age}min ago)`);
        if (job.error_message) {
          console.log(`        Error: ${job.error_message}`);
        }
      });
    } else {
      console.log('   ✅ No failed or stalled jobs found');
    }

  } catch (jobsError) {
    console.log('   ❌ Error analyzing jobs:', jobsError.message);
  }

  // STEP 7: Overall Assessment
  console.log('\n📊 AUDIT SUMMARY');
  console.log('='.repeat(60));

  const categories = ['environment', 'database', 'storage', 'ocr', 'ai'];
  let totalPassed = 0, totalFailed = 0;

  categories.forEach(category => {
    const result = auditResults[category];
    totalPassed += result.passed;
    totalFailed += result.failed;
    
    const status = result.failed === 0 ? '✅' : result.passed > result.failed ? '⚠️' : '❌';
    console.log(`${status} ${category.toUpperCase()}: ${result.passed} passed, ${result.failed} failed`);
    
    if (result.issues.length > 0) {
      result.issues.forEach(issue => {
        console.log(`   - ${issue}`);
      });
    }
  });

  console.log(`\nOVERALL: ${totalPassed} passed, ${totalFailed} failed`);

  // STEP 8: Root Cause Analysis
  console.log('\n🔍 ROOT CAUSE ANALYSIS');
  console.log('-'.repeat(40));

  const criticalIssues = [];
  
  categories.forEach(category => {
    const result = auditResults[category];
    if (result.failed > 0) {
      criticalIssues.push({
        category,
        issues: result.issues,
        severity: result.failed > result.passed ? 'HIGH' : 'MEDIUM'
      });
    }
  });

  if (criticalIssues.length === 0) {
    console.log('✅ No critical issues found - system should be working');
  } else {
    console.log('❌ Critical issues identified:');
    criticalIssues.forEach(issue => {
      console.log(`\n[${issue.severity}] ${issue.category.toUpperCase()}:`);
      issue.issues.forEach(problem => {
        console.log(`   - ${problem}`);
      });
    });
  }

  // STEP 9: Recommendations
  console.log('\n💡 RECOMMENDATIONS');
  console.log('-'.repeat(40));

  if (auditResults.environment.failed > 0) {
    console.log('🔧 Fix environment variables first - these are blocking');
  }
  
  if (auditResults.database.failed > 0) {
    console.log('🔧 Database issues prevent job tracking - critical');
  }
  
  if (auditResults.storage.failed > 0) {
    console.log('🔧 Storage issues prevent file uploads - critical');
  }
  
  if (auditResults.ocr.failed > 0) {
    console.log('🔧 OCR service issues prevent text extraction - jobs will stall at OCR stage');
  }
  
  if (auditResults.ai.failed > 0) {
    console.log('🔧 AI service issues prevent analysis - jobs will stall at SUMMARISE stage');
  }

  if (totalFailed === 0) {
    console.log('🎉 All systems operational - lease upload should work perfectly!');
  }

  console.log('\n' + '='.repeat(60));
}

// Run the comprehensive audit
auditLeaseUploadSystem().catch(error => {
  console.error('❌ Audit failed:', error);
  process.exit(1);
});