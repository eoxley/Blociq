#!/usr/bin/env node

/**
 * Test Local Analysis - Test the enhanced analysis locally
 */

const { createClient } = require('@supabase/supabase-js');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const JOB_ID = '87e33651-500c-4043-97b5-3e0fbb1efeaa';

async function testLocalAnalysis() {
  console.log(`🧪 Testing local enhanced analysis for job: ${JOB_ID}\n`);

  try {
    // Get job details with extracted text
    const { data: job, error: jobError } = await supabase
      .from('document_jobs')
      .select('*')
      .eq('id', JOB_ID)
      .single();

    if (jobError || !job) {
      console.log('❌ Job not found:', jobError?.message);
      return;
    }

    console.log('📊 Job found:');
    console.log(`   - Filename: ${job.filename}`);
    console.log(`   - Has extracted text: ${job.extracted_text ? 'Yes' : 'No'}`);
    console.log(`   - Text length: ${job.extracted_text?.length || 0} chars`);

    if (!job.extracted_text) {
      console.log('❌ No extracted text available');
      return;
    }

    // Test local analysis endpoint
    console.log('\n🤖 Testing LOCAL enhanced analysis...');
    
    const aiPayload = {
      jobId: job.id,
      extractedText: job.extracted_text,
      filename: job.filename,
      mime: job.mime,
      userId: job.user_id
    };

    const aiResponse = await fetch('http://localhost:3001/api/lease-lab/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(aiPayload)
    });

    console.log(`📨 Local AI analysis response: ${aiResponse.status}`);

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.log('❌ Local AI analysis failed:', errorText);
      return;
    }

    const aiResult = await aiResponse.json();
    console.log('✅ Local AI analysis succeeded!');
    console.log(`   - Success: ${aiResult.success}`);
    console.log(`   - Analysis length: ${aiResult.analysisLength}`);

    const summary = aiResult.summary;
    
    console.log('\n🎯 LOCAL ENHANCED CLAUSE ANALYSIS:\n');
    
    // Check for enhanced clause summaries
    if (summary.clause_summaries && summary.clause_summaries.length > 0) {
      console.log(`🔍 ENHANCED CLAUSE SUMMARIES (${summary.clause_summaries.length}):`);
      console.log('='.repeat(60));
      
      summary.clause_summaries.forEach((clause, i) => {
        console.log(`\n${i + 1}. ${clause.clause_type.toUpperCase()}`);
        console.log(`   Title: ${clause.title}`);
        console.log(`   Summary: ${clause.summary}`);
        
        if (clause.key_points && clause.key_points.length > 0) {
          console.log(`   Key Points:`);
          clause.key_points.forEach(point => {
            console.log(`     • ${point}`);
          });
        }
        
        if (clause.frequency) {
          console.log(`   Frequency: ${clause.frequency}`);
        }
        
        if (clause.impact) {
          console.log(`   Impact: ${clause.impact}`);
        }
      });
      
      console.log('\n🎉 SUCCESS: Enhanced clause summaries are working locally!');
    } else {
      console.log('❌ Enhanced clause summaries missing from local response');
      console.log('📊 Available fields:', Object.keys(summary));
      
      // Show first 500 chars of summary for debugging
      console.log('\n🔍 Summary preview:');
      console.log(JSON.stringify(summary, null, 2).substring(0, 500) + '...');
    }

  } catch (error) {
    console.error('❌ Local test error:', error);
  }
}

testLocalAnalysis();