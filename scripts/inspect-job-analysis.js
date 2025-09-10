#!/usr/bin/env node

/**
 * Inspect Job Analysis - Check the actual content of the lease analysis
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const JOB_ID = '6c8ae83a-40ed-40d3-9296-ee1f7a148812';

async function inspectJobAnalysis() {
  console.log(`🔍 Inspecting analysis content for job: ${JOB_ID}\n`);

  try {
    // Get job details with analysis
    const { data: job, error: jobError } = await supabase
      .from('document_jobs')
      .select('*')
      .eq('id', JOB_ID)
      .single();

    if (jobError || !job) {
      console.log('❌ Job not found:', jobError?.message);
      return;
    }

    console.log('📊 Job Overview:');
    console.log(`   - ID: ${job.id}`);
    console.log(`   - Filename: ${job.filename}`);
    console.log(`   - Status: ${job.status}`);
    console.log(`   - Updated: ${job.updated_at}`);
    console.log(`   - User ID: ${job.user_id}`);

    // Check extracted text
    console.log('\n📄 Extracted Text:');
    if (job.extracted_text) {
      console.log(`   - Length: ${job.extracted_text.length} characters`);
      console.log(`   - Preview: "${job.extracted_text.substring(0, 200)}..."`);
      
      // Look for key lease terms in the text
      const keyTerms = ['lease', 'rent', 'tenant', 'landlord', 'lessor', 'lessee', 'premises', 'term', 'monthly'];
      const foundTerms = keyTerms.filter(term => 
        job.extracted_text.toLowerCase().includes(term.toLowerCase())
      );
      console.log(`   - Found key terms: ${foundTerms.join(', ')}`);
      
    } else {
      console.log('   ❌ No extracted text found');
    }

    // Check analysis summary
    console.log('\n🤖 AI Analysis Summary:');
    if (job.summary_json) {
      console.log(`   - Raw JSON length: ${JSON.stringify(job.summary_json).length} characters`);
      
      try {
        const summary = typeof job.summary_json === 'string' 
          ? JSON.parse(job.summary_json) 
          : job.summary_json;
        
        console.log('   - Summary structure:');
        console.log(`     * doc_type: ${summary.doc_type || 'missing'}`);
        console.log(`     * overview: ${summary.overview ? `"${summary.overview.substring(0, 100)}..."` : 'missing'}`);
        console.log(`     * parties: ${summary.parties ? `${summary.parties.length} parties` : 'missing'}`);
        console.log(`     * key_dates: ${summary.key_dates ? `${summary.key_dates.length} dates` : 'missing'}`);
        console.log(`     * financials: ${summary.financials ? `${summary.financials.length} items` : 'missing'}`);
        console.log(`     * obligations: ${summary.obligations ? `${summary.obligations.length} items` : 'missing'}`);
        console.log(`     * restrictions: ${summary.restrictions ? `${summary.restrictions.length} items` : 'missing'}`);
        console.log(`     * unknowns: ${summary.unknowns ? `${summary.unknowns.length} items` : 'missing'}`);
        
        // Show detailed content
        console.log('\n📋 Detailed Analysis Content:');
        
        if (summary.parties && summary.parties.length > 0) {
          console.log('   👥 PARTIES:');
          summary.parties.forEach((party, i) => {
            console.log(`      ${i + 1}. ${party}`);
          });
        }
        
        if (summary.key_dates && summary.key_dates.length > 0) {
          console.log('   📅 KEY DATES:');
          summary.key_dates.forEach((date, i) => {
            console.log(`      ${i + 1}. ${date.title}: ${date.date} - ${date.description || 'No description'}`);
          });
        }
        
        if (summary.financials && summary.financials.length > 0) {
          console.log('   💰 FINANCIALS:');
          summary.financials.forEach((financial, i) => {
            console.log(`      ${i + 1}. ${financial.title}: ${financial.amount} - ${financial.description || 'No description'}`);
          });
        }
        
        if (summary.obligations && summary.obligations.length > 0) {
          console.log('   📝 OBLIGATIONS:');
          summary.obligations.forEach((obligation, i) => {
            console.log(`      ${i + 1}. ${obligation.title}: ${obligation.description || 'No description'}`);
          });
        }
        
        if (summary.restrictions && summary.restrictions.length > 0) {
          console.log('   🚫 RESTRICTIONS:');
          summary.restrictions.forEach((restriction, i) => {
            console.log(`      ${i + 1}. ${restriction.title}: ${restriction.description || 'No description'}`);
          });
        }
        
        if (summary.unknowns && summary.unknowns.length > 0) {
          console.log('   ❓ UNKNOWNS:');
          summary.unknowns.forEach((unknown, i) => {
            console.log(`      ${i + 1}. ${unknown}`);
          });
        }
        
        // Check if analysis is mostly empty
        const hasContent = [
          summary.parties?.length > 0,
          summary.key_dates?.length > 0, 
          summary.financials?.length > 0,
          summary.obligations?.length > 0,
          summary.restrictions?.length > 0
        ].some(Boolean);
        
        if (!hasContent) {
          console.log('\n⚠️  ISSUE: Analysis appears to be empty or generic');
          console.log('   - No meaningful parties, dates, financials, or obligations found');
          console.log('   - This suggests the AI analysis failed to extract lease-specific information');
        } else {
          console.log('\n✅ Analysis contains meaningful lease information');
        }
        
      } catch (parseError) {
        console.log(`   ❌ Failed to parse summary JSON: ${parseError.message}`);
        console.log(`   - Raw content: ${JSON.stringify(job.summary_json).substring(0, 500)}...`);
      }
      
    } else {
      console.log('   ❌ No analysis summary found');
    }

    // Check for error messages
    if (job.error_message) {
      console.log(`\n❌ Error Message: ${job.error_message}`);
    }

  } catch (error) {
    console.error('❌ Inspection error:', error);
  }
}

inspectJobAnalysis();