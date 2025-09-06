#!/usr/bin/env node

/**
 * Manual Test Script for Outlook Add-in Domain Lock
 * 
 * Tests the domain locking, acronym interpretation, and intent detection
 * for the Outlook Add-in system.
 */

// Use built-in fetch for Node.js 18+ or fallback to node-fetch
let fetch;
try {
  fetch = globalThis.fetch;
  if (!fetch) {
    fetch = require('node-fetch');
  }
} catch (error) {
  console.error('❌ Fetch not available. Please install node-fetch or use Node.js 18+');
  process.exit(1);
}

const BASE_URL = process.env.SITE_URL || 'http://localhost:3000';

async function testAddinAPI() {
  console.log('🧪 Testing Outlook Add-in Domain Lock System\n');
  
  const testCases = [
    // Acronym tests
    {
      name: 'RCA Acronym Test',
      input: 'What should I consider when carrying out an RCA?',
      expectedBehavior: 'Should treat RCA as Restatement Cost Analysis',
      type: 'qa'
    },
    {
      name: 'Section 20 Q&A Test',
      input: 'What is Section 20?',
      expectedBehavior: 'Should provide Q&A answer about consultation requirements',
      type: 'qa'
    },
    {
      name: 'Reply Intent Test',
      input: 'Draft a reply explaining Section 20 to the board',
      expectedBehavior: 'Should generate a drafted email reply',
      type: 'reply'
    },
    {
      name: 'Out of Scope Test',
      input: 'How do I rotate AWS keys?',
      expectedBehavior: 'Should return out of scope message',
      type: 'out_of_scope'
    },
    {
      name: 'Lease Facts Test',
      input: 'Who pays for windows in Flat 8 Ashwood House?',
      expectedBehavior: 'Should cite repair_matrix from lease summary if available',
      type: 'qa'
    },
    {
      name: 'Ambiguity Test',
      input: 'Do an RCA for the leak',
      expectedBehavior: 'Should ask for clarification about RCA meaning',
      type: 'clarification_needed'
    }
  ];

  for (const testCase of testCases) {
    console.log(`\n📋 ${testCase.name}`);
    console.log(`Input: "${testCase.input}"`);
    console.log(`Expected: ${testCase.expectedBehavior}`);
    
    try {
      const response = await fetch(`${BASE_URL}/api/addin/ask`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userInput: testCase.input,
          emailContext: testCase.type === 'reply' ? {
            from: 'tenant@example.com',
            subject: 'Test Email',
            receivedDateTime: new Date().toISOString(),
            hasSelection: true
          } : undefined
        })
      });

      if (!response.ok) {
        console.log(`❌ HTTP Error: ${response.status} ${response.statusText}`);
        continue;
      }

      const result = await response.json();
      
      if (result.success) {
        console.log(`✅ Success: ${result.type}`);
        console.log(`Response: ${result.response?.substring(0, 200)}...`);
        
        if (result.facts && result.facts.length > 0) {
          console.log(`📊 Facts: ${result.facts.length} found`);
        }
        
        if (result.sources && result.sources.length > 0) {
          console.log(`📚 Sources: ${result.sources.join(', ')}`);
        }
        
        // Validate expected behavior
        if (testCase.type === 'out_of_scope' && result.type === 'out_of_scope') {
          console.log('✅ Correctly identified as out of scope');
        } else if (testCase.type === 'clarification_needed' && result.type === 'clarification_needed') {
          console.log('✅ Correctly requested clarification');
        } else if (testCase.type === 'qa' && result.type === 'qa') {
          console.log('✅ Correctly handled as Q&A');
        } else if (testCase.type === 'reply' && result.type === 'reply') {
          console.log('✅ Correctly generated reply');
        } else {
          console.log(`⚠️ Unexpected response type: ${result.type}`);
        }
      } else {
        console.log(`❌ API Error: ${result.error}`);
        console.log(`Message: ${result.message}`);
      }
      
    } catch (error) {
      console.log(`❌ Request Error: ${error.message}`);
    }
  }
}

async function testGenerateReplyAPI() {
  console.log('\n\n📧 Testing Generate Reply API\n');
  
  const replyTests = [
    {
      name: 'Section 20 Reply Test',
      input: 'Draft a reply about Section 20 consultation requirements',
      outlookContext: {
        from: 'leaseholder@example.com',
        subject: 'Section 20 Consultation Query',
        receivedDateTime: new Date().toISOString(),
        bodyPreview: 'I received a notice about major works...'
      }
    },
    {
      name: 'Repair Obligation Reply Test',
      input: 'Respond to this repair request',
      outlookContext: {
        from: 'tenant@example.com',
        subject: 'Window Repair - Flat 5',
        receivedDateTime: new Date().toISOString(),
        bodyPreview: 'The window in my flat is broken...'
      }
    }
  ];

  for (const test of replyTests) {
    console.log(`\n📋 ${test.name}`);
    console.log(`Input: "${test.input}"`);
    
    try {
      const response = await fetch(`${BASE_URL}/api/addin/generate-reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userInput: test.input,
          outlookContext: test.outlookContext
        })
      });

      if (!response.ok) {
        console.log(`❌ HTTP Error: ${response.status} ${response.statusText}`);
        continue;
      }

      const result = await response.json();
      
      if (result.success) {
        console.log(`✅ Success: ${result.type}`);
        console.log(`Subject: ${result.subjectSuggestion}`);
        console.log(`Body: ${result.bodyHtml?.substring(0, 200)}...`);
        
        if (result.usedFacts && result.usedFacts.length > 0) {
          console.log(`📊 Facts Used: ${result.usedFacts.length}`);
        }
      } else {
        console.log(`❌ API Error: ${result.error}`);
        console.log(`Message: ${result.message}`);
      }
      
    } catch (error) {
      console.log(`❌ Request Error: ${error.message}`);
    }
  }
}

async function runTests() {
  console.log('🚀 Starting Outlook Add-in Domain Lock Tests');
  console.log(`Base URL: ${BASE_URL}\n`);
  
  await testAddinAPI();
  await testGenerateReplyAPI();
  
  console.log('\n✅ All tests completed!');
  console.log('\n📝 Manual Verification Checklist:');
  console.log('□ RCA should always mean Restatement Cost Analysis');
  console.log('□ Replies generated only on explicit triggers or with selected Outlook message');
  console.log('□ Q&A uses deterministic facts; LLM only phrases');
  console.log('□ Clear refusals for out-of-scope or unknowns');
  console.log('□ British English everywhere');
  console.log('□ No off-domain answers for property acronyms');
}

// Run tests if called directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { testAddinAPI, testGenerateReplyAPI, runTests };
