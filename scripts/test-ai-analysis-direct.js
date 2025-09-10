#!/usr/bin/env node

/**
 * Test AI Analysis Direct - Test OpenAI analysis with actual lease text
 */

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
require('dotenv').config({ path: '.env.local' });

async function testAIAnalysisDirect() {
  console.log('🤖 Testing AI Analysis Direct...\n');

  try {
    // Get actual extracted text from the job
    const { createClient } = require('@supabase/supabase-js');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: job } = await supabase
      .from('document_jobs')
      .select('extracted_text')
      .eq('id', '6c8ae83a-40ed-40d3-9296-ee1f7a148812')
      .single();

    if (!job || !job.extracted_text) {
      console.log('❌ No extracted text found');
      return;
    }

    console.log(`📄 Using extracted text (${job.extracted_text.length} characters)`);
    console.log(`   Preview: "${job.extracted_text.substring(0, 200)}..."`);

    // Call OpenAI directly with the same prompt as the analysis endpoint
    const analysisPrompt = `
Analyze this lease document and extract key information. Return a structured JSON response with the following format:

{
  "doc_type": "lease",
  "overview": "Brief overview of the document",
  "parties": ["Party 1: Name", "Party 2: Name"],
  "key_dates": [
    {"title": "Lease Start Date", "date": "YYYY-MM-DD", "description": "Description"}
  ],
  "financials": [
    {"title": "Monthly Rent", "amount": "£X,XXX", "description": "Description"}
  ],
  "obligations": [
    {"title": "Maintenance", "description": "Description"}
  ],
  "restrictions": [
    {"title": "No Pets", "description": "Description"}
  ],
  "variations": [],
  "actions": [
    {"title": "Action Required", "description": "Description"}
  ],
  "source_spans": [],
  "unknowns": ["Items that need clarification"]
}

Document text:
${job.extracted_text.substring(0, 8000)} // Limit to avoid token limits
`;

    console.log('\n🔄 Calling OpenAI API...');

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are a legal document analyst specializing in UK lease agreements. Extract key information and return only valid JSON.'
          },
          {
            role: 'user',
            content: analysisPrompt
          }
        ],
        temperature: 0.1,
        max_tokens: 2000
      })
    });

    console.log(`📨 OpenAI response status: ${openaiResponse.status}`);

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.log('❌ OpenAI API error:', errorText);
      return;
    }

    const openaiResult = await openaiResponse.json();
    console.log('✅ OpenAI response received');

    if (!openaiResult.choices || !openaiResult.choices[0]) {
      console.log('❌ No choices in OpenAI response');
      console.log('Raw response:', JSON.stringify(openaiResult, null, 2));
      return;
    }

    const analysisText = openaiResult.choices[0]?.message?.content;
    
    console.log('\n📝 Raw AI Response:');
    console.log('---START---');
    console.log(analysisText);
    console.log('---END---');

    if (!analysisText) {
      console.log('❌ No analysis text returned');
      return;
    }

    console.log('\n🔍 Parsing JSON response...');

    try {
      const summary = JSON.parse(analysisText);
      console.log('✅ JSON parsing successful');
      
      console.log('\n📊 Parsed Analysis:');
      console.log(`   - doc_type: ${summary.doc_type}`);
      console.log(`   - overview: "${summary.overview || 'none'}"`);
      console.log(`   - parties: ${summary.parties?.length || 0} (${summary.parties?.join(', ') || 'none'})`);
      console.log(`   - key_dates: ${summary.key_dates?.length || 0}`);
      console.log(`   - financials: ${summary.financials?.length || 0}`);
      console.log(`   - obligations: ${summary.obligations?.length || 0}`);
      console.log(`   - restrictions: ${summary.restrictions?.length || 0}`);
      
      if (summary.key_dates && summary.key_dates.length > 0) {
        console.log('\n📅 KEY DATES FOUND:');
        summary.key_dates.forEach((date, i) => {
          console.log(`   ${i + 1}. ${date.title}: ${date.date} - ${date.description}`);
        });
      }
      
      if (summary.financials && summary.financials.length > 0) {
        console.log('\n💰 FINANCIALS FOUND:');
        summary.financials.forEach((financial, i) => {
          console.log(`   ${i + 1}. ${financial.title}: ${financial.amount} - ${financial.description}`);
        });
      }
      
      if (summary.obligations && summary.obligations.length > 0) {
        console.log('\n📝 OBLIGATIONS FOUND:');
        summary.obligations.forEach((obligation, i) => {
          console.log(`   ${i + 1}. ${obligation.title}: ${obligation.description}`);
        });
      }

      console.log('\n🎯 CONCLUSION:');
      if (summary.key_dates?.length > 0 || summary.financials?.length > 0 || summary.obligations?.length > 0) {
        console.log('✅ AI analysis is working and extracting real lease data!');
        console.log('   The issue is likely in the fallback handling or JSON parsing in the endpoint');
      } else {
        console.log('❌ AI analysis is not extracting meaningful lease data');
        console.log('   May need to improve the prompt or use a different approach');
      }

    } catch (parseError) {
      console.log('❌ JSON parsing failed:', parseError.message);
      console.log('   This explains why the endpoint is falling back to generic data');
      console.log('   Raw response likely contains non-JSON content');
    }

  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

testAIAnalysisDirect();