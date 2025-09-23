#!/usr/bin/env node

/**
 * Integration Test: Web vs Add-in Consistency
 *
 * This test verifies that identical prompts from the web client and Outlook add-in
 * yield the same Ask BlocIQ answers through both routes.
 */

const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3001';

// Test prompts to verify consistency
const TEST_PROMPTS = [
  {
    name: 'Section 20 Query',
    message: 'What is Section 20 consultation and when is it required?'
  },
  {
    name: 'Property Management Advice',
    message: 'How should I handle a maintenance request from a tenant?'
  },
  {
    name: 'Email Analysis with Context',
    message: 'Analyze this email',
    emailContext: {
      subject: 'Urgent: Leak in Flat 12B',
      from: 'tenant@example.com',
      itemType: 'Email'
    }
  }
];

async function testWebClient(prompt, emailContext) {
  const response = await fetch(`${BASE_URL}/api/ask-ai`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: prompt,
      is_public: true,
      contextType: emailContext ? 'email_reply' : 'general',
      outlook_email: emailContext
    })
  });

  if (!response.ok) {
    throw new Error(`Web client failed: ${response.status}`);
  }

  return await response.json();
}

async function testAddinClient(prompt, emailContext) {
  const response = await fetch(`${BASE_URL}/api/addin/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: prompt,
      emailContext: emailContext,
      source: 'integration_test'
    })
  });

  if (!response.ok) {
    throw new Error(`Add-in client failed: ${response.status}`);
  }

  return await response.json();
}

function compareResponses(webResult, addinResult, testName) {
  console.log(`\n🧪 Testing: ${testName}`);
  console.log('─'.repeat(50));

  // Check success status
  if (webResult.success !== addinResult.success) {
    console.log('❌ Success status mismatch');
    return false;
  }

  if (!webResult.success) {
    console.log('❌ Both requests failed');
    return false;
  }

  // Check if both used Ask BlocIQ
  const webUsedAskBlocIQ = webResult.metadata?.source === 'Comprehensive AI Processor';
  const addinUsedAskBlocIQ = addinResult.source === 'ask_blociq';

  console.log(`Web Client: ${webUsedAskBlocIQ ? '🧠 Ask BlocIQ' : '📝 Basic'}`);
  console.log(`Add-in Client: ${addinUsedAskBlocIQ ? '🧠 Ask BlocIQ' : '📝 Basic/Fallback'}`);

  // Check response similarity (basic check)
  const webWordCount = webResult.response.split(' ').length;
  const addinWordCount = addinResult.response.split(' ').length;
  const wordCountDiff = Math.abs(webWordCount - addinWordCount);
  const wordCountSimilarity = 1 - (wordCountDiff / Math.max(webWordCount, addinWordCount));

  console.log(`Word Count Similarity: ${(wordCountSimilarity * 100).toFixed(1)}%`);

  // Check metadata consistency
  if (webResult.metadata?.comprehensiveSearchUsed && addinResult.metadata?.comprehensiveSearchUsed) {
    console.log('✅ Both used comprehensive database search');
  }

  if (webResult.metadata?.searchMetadata?.industryKnowledge > 0 &&
      addinResult.metadata?.searchMetadata?.industryKnowledge > 0) {
    console.log('✅ Both used industry knowledge');
  }

  // Basic success criteria
  const isConsistent = webUsedAskBlocIQ === addinUsedAskBlocIQ && wordCountSimilarity > 0.7;

  if (isConsistent) {
    console.log('✅ PASS: Responses are consistent');
  } else {
    console.log('❌ FAIL: Responses differ significantly');
    console.log('\nWeb Response Preview:', webResult.response.substring(0, 200) + '...');
    console.log('\nAdd-in Response Preview:', addinResult.response.substring(0, 200) + '...');
  }

  return isConsistent;
}

async function runIntegrationTest() {
  console.log('🚀 Starting Web vs Add-in Integration Test');
  console.log('Testing Ask BlocIQ consistency across clients...\n');

  let passedTests = 0;
  let totalTests = TEST_PROMPTS.length;

  for (const testCase of TEST_PROMPTS) {
    try {
      // Test both clients with the same prompt
      const [webResult, addinResult] = await Promise.all([
        testWebClient(testCase.message, testCase.emailContext),
        testAddinClient(testCase.message, testCase.emailContext)
      ]);

      const passed = compareResponses(webResult, addinResult, testCase.name);
      if (passed) passedTests++;

    } catch (error) {
      console.log(`\n❌ Error testing ${testCase.name}:`, error.message);
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`🎯 Integration Test Results: ${passedTests}/${totalTests} tests passed`);

  if (passedTests === totalTests) {
    console.log('✅ SUCCESS: Web and add-in clients are consistent!');
    process.exit(0);
  } else {
    console.log('❌ FAILURE: Inconsistencies detected between clients');
    process.exit(1);
  }
}

// Run the test
runIntegrationTest().catch(error => {
  console.error('❌ Integration test failed:', error);
  process.exit(1);
});