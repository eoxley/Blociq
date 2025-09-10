#!/usr/bin/env node

/**
 * Reprocess Job With Fix - Test the fixed AI analysis with the stuck job
 */

const { createClient } = require('@supabase/supabase-js');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const JOB_ID = '6c8ae83a-40ed-40d3-9296-ee1f7a148812';

async function reprocessJobWithFix() {
  console.log(`🔄 Reprocessing job with AI analysis fix: ${JOB_ID}\n`);

  try {
    // Get job details
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
    console.log(`   - Current status: ${job.status}`);
    console.log(`   - User ID: ${job.user_id}`);
    console.log(`   - Has extracted text: ${job.extracted_text ? 'Yes' : 'No'}`);

    if (!job.extracted_text) {
      console.log('❌ No extracted text available for analysis');
      return;
    }

    // Test the fixed AI analysis
    console.log('\n🤖 Testing fixed AI analysis...');
    
    const aiPayload = {
      jobId: job.id,
      extractedText: job.extracted_text,
      filename: job.filename,
      mime: job.mime,
      userId: job.user_id
    };

    const aiResponse = await fetch('https://www.blociq.co.uk/api/lease-lab/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(aiPayload)
    });

    console.log(`📨 AI analysis response: ${aiResponse.status}`);

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.log('❌ AI analysis failed:', errorText);
      return;
    }

    const aiResult = await aiResponse.json();
    console.log('✅ AI analysis succeeded!');
    console.log(`   - Success: ${aiResult.success}`);
    console.log(`   - Analysis length: ${aiResult.analysisLength}`);

    // Update the job with the new analysis
    console.log('\n💾 Updating job with new analysis...');
    
    const { error: updateError } = await supabase
      .from('document_jobs')
      .update({
        summary_json: aiResult.summary,
        updated_at: new Date().toISOString()
      })
      .eq('id', job.id);

    if (updateError) {
      console.log('❌ Failed to update job:', updateError.message);
      return;
    }

    console.log('✅ Job updated successfully!');

    // Display the new analysis content
    console.log('\n📋 NEW ANALYSIS CONTENT:');
    const summary = aiResult.summary;
    
    if (summary) {
      console.log(`   📄 Document Type: ${summary.doc_type}`);
      console.log(`   📖 Overview: ${summary.overview}`);
      
      if (summary.parties && summary.parties.length > 0) {
        console.log(`   👥 Parties (${summary.parties.length}):`);
        summary.parties.forEach((party, i) => {
          console.log(`      ${i + 1}. ${party}`);
        });
      }
      
      if (summary.key_dates && summary.key_dates.length > 0) {
        console.log(`   📅 Key Dates (${summary.key_dates.length}):`);
        summary.key_dates.forEach((date, i) => {
          console.log(`      ${i + 1}. ${date.title}: ${date.date} - ${date.description}`);
        });
      }
      
      if (summary.financials && summary.financials.length > 0) {
        console.log(`   💰 Financials (${summary.financials.length}):`);
        summary.financials.forEach((financial, i) => {
          console.log(`      ${i + 1}. ${financial.title}: ${financial.amount} - ${financial.description}`);
        });
      }
      
      if (summary.obligations && summary.obligations.length > 0) {
        console.log(`   📝 Obligations (${summary.obligations.length}):`);
        summary.obligations.forEach((obligation, i) => {
          console.log(`      ${i + 1}. ${obligation.title}: ${obligation.description}`);
        });
      }
      
      if (summary.restrictions && summary.restrictions.length > 0) {
        console.log(`   🚫 Restrictions (${summary.restrictions.length}):`);
        summary.restrictions.forEach((restriction, i) => {
          console.log(`      ${i + 1}. ${restriction.title}: ${restriction.description}`);
        });
      }
    }

    // Final verification
    console.log('\n🔍 Final verification...');
    const { data: finalJob, error: finalError } = await supabase
      .from('document_jobs')
      .select('id, status, summary_json')
      .eq('id', JOB_ID)
      .single();

    if (finalError) {
      console.log('❌ Could not verify final job state:', finalError.message);
    } else {
      console.log(`✅ Job ${finalJob.id} is now ${finalJob.status}`);
      
      const finalSummary = finalJob.summary_json;
      const hasRealData = finalSummary && (
        (finalSummary.parties && finalSummary.parties.length > 2) ||
        (finalSummary.key_dates && finalSummary.key_dates.length > 0) ||
        (finalSummary.financials && finalSummary.financials.length > 0) ||
        (finalSummary.obligations && finalSummary.obligations.length > 0)
      );
      
      if (hasRealData) {
        console.log('🎉 SUCCESS: Job now contains real lease data!');
      } else {
        console.log('⚠️  WARNING: Job still contains generic or minimal data');
      }
    }

  } catch (error) {
    console.error('❌ Reprocessing error:', error);
  }
}

reprocessJobWithFix();