#!/usr/bin/env node

/**
 * Check Enhanced Analysis - Display the enhanced clause analysis for a completed job
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const JOB_ID = '87e33651-500c-4043-97b5-3e0fbb1efeaa';

async function checkEnhancedAnalysis() {
  console.log(`🔍 Checking enhanced clause analysis for job: ${JOB_ID}\n`);

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

    console.log('📊 Job Details:');
    console.log(`   - Filename: ${job.filename}`);
    console.log(`   - Status: ${job.status}`);
    console.log(`   - Updated: ${job.updated_at}`);

    if (!job.summary_json) {
      console.log('❌ No analysis found in job');
      return;
    }

    const summary = job.summary_json;
    
    console.log('\n🎯 ENHANCED CLAUSE ANALYSIS RESULTS:\n');
    
    // Basic info
    console.log(`📄 Document Type: ${summary.doc_type}`);
    console.log(`📖 Overview: ${summary.overview}\n`);
    
    // Property details
    if (summary.property_details) {
      console.log('🏠 PROPERTY DETAILS:');
      console.log(`   Address: ${summary.property_details.address}`);
      console.log(`   Description: ${summary.property_details.description}`);
      console.log(`   Lease Type: ${summary.property_details.lease_type}\n`);
    }
    
    // Parties
    if (summary.parties && summary.parties.length > 0) {
      console.log(`👥 PARTIES (${summary.parties.length}):`);
      summary.parties.forEach((party, i) => {
        console.log(`   ${i + 1}. ${party}`);
      });
      console.log();
    }
    
    // Key dates
    if (summary.key_dates && summary.key_dates.length > 0) {
      console.log(`📅 KEY DATES (${summary.key_dates.length}):`);
      summary.key_dates.forEach((date, i) => {
        console.log(`   ${i + 1}. ${date.title}: ${date.date}`);
        console.log(`      ${date.description}`);
      });
      console.log();
    }
    
    // Financials
    if (summary.financials && summary.financials.length > 0) {
      console.log(`💰 FINANCIALS (${summary.financials.length}):`);
      summary.financials.forEach((financial, i) => {
        console.log(`   ${i + 1}. ${financial.title}: ${financial.amount}`);
        console.log(`      ${financial.description}`);
      });
      console.log();
    }

    // *** ENHANCED CLAUSE SUMMARIES ***
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
      console.log();
    } else {
      console.log('⚠️  No enhanced clause summaries found');
    }

    // Key risks
    if (summary.key_risks && summary.key_risks.length > 0) {
      console.log(`⚠️  KEY RISKS (${summary.key_risks.length}):`);
      summary.key_risks.forEach((risk, i) => {
        console.log(`   ${i + 1}. ${risk.risk} (Impact: ${risk.impact})`);
        console.log(`      Mitigation: ${risk.mitigation}`);
      });
      console.log();
    }

    // Actions required
    if (summary.actions_required && summary.actions_required.length > 0) {
      console.log(`📋 ACTIONS REQUIRED (${summary.actions_required.length}):`);
      summary.actions_required.forEach((action, i) => {
        console.log(`   ${i + 1}. ${action.action}`);
        console.log(`      By: ${action.by_whom} | Deadline: ${action.deadline} | Priority: ${action.priority}`);
      });
      console.log();
    }
    
    // Traditional sections
    if (summary.obligations && summary.obligations.length > 0) {
      console.log(`📝 OBLIGATIONS (${summary.obligations.length}):`);
      summary.obligations.forEach((obligation, i) => {
        console.log(`   ${i + 1}. ${obligation.title}: ${obligation.description}`);
      });
      console.log();
    }
    
    if (summary.restrictions && summary.restrictions.length > 0) {
      console.log(`🚫 RESTRICTIONS (${summary.restrictions.length}):`);
      summary.restrictions.forEach((restriction, i) => {
        console.log(`   ${i + 1}. ${restriction.title}: ${restriction.description}`);
      });
      console.log();
    }

    if (summary.unknowns && summary.unknowns.length > 0) {
      console.log(`❓ UNKNOWNS (${summary.unknowns.length}):`);
      summary.unknowns.forEach((unknown, i) => {
        console.log(`   ${i + 1}. ${unknown}`);
      });
      console.log();
    }

    // Summary assessment
    const hasEnhancedClauses = summary.clause_summaries && summary.clause_summaries.length > 0;
    const hasDetailedData = summary.property_details || (summary.key_dates && summary.key_dates.length > 0) || (summary.financials && summary.financials.length > 0);
    
    console.log('🎯 ANALYSIS ASSESSMENT:');
    
    if (hasEnhancedClauses) {
      console.log('✅ Enhanced clause summaries are working!');
      console.log(`   Found ${summary.clause_summaries.length} detailed clause summaries`);
    } else {
      console.log('❌ Enhanced clause summaries missing or empty');
    }
    
    if (hasDetailedData) {
      console.log('✅ Detailed lease data extraction working');
    } else {
      console.log('❌ Lease data extraction appears generic');
    }

  } catch (error) {
    console.error('❌ Error checking analysis:', error);
  }
}

checkEnhancedAnalysis();