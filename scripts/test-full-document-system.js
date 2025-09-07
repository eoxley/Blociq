#!/usr/bin/env node

/**
 * Full system test for document lookup functionality
 * Tests the complete flow from intent detection to document retrieval
 */

const API_BASE = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

async function testDocumentSystem() {
  console.log('🧪 Testing Full Document System\n');
  
  const testCases = [
    {
      name: 'Insurance Document Request',
      prompt: 'show the latest insurance document for Ashwood House',
      expectedDocType: 'insurance',
      expectedBuilding: 'Ashwood House'
    },
    {
      name: 'EICR Request',
      prompt: 'open the most recent EICR for the building',
      expectedDocType: 'EICR'
    },
    {
      name: 'Fire Risk Assessment',
      prompt: 'get the current FRA',
      expectedDocType: 'FRA'
    },
    {
      name: 'Non-document Request',
      prompt: 'what is the service charge for this building?',
      expectedDocType: null
    }
  ];
  
  let passed = 0;
  let total = testCases.length;
  
  for (const testCase of testCases) {
    console.log(`\n📋 Test: ${testCase.name}`);
    console.log(`Input: "${testCase.prompt}"`);
    
    try {
      const response = await fetch(`${API_BASE}/api/ask-ai`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: testCase.prompt,
          building_id: 'test-building-id', // Mock building ID
          is_public: false
        })
      });
      
      if (!response.ok) {
        console.log(`❌ FAIL - API request failed: ${response.status}`);
        continue;
      }
      
      const data = await response.json();
      
      if (testCase.expectedDocType === null) {
        // Should not be a document response
        if (data.route !== 'document_lookup') {
          console.log('✅ PASS - Correctly handled as non-document request');
          passed++;
        } else {
          console.log('❌ FAIL - Incorrectly detected as document request');
        }
      } else {
        // Should be a document response
        if (data.route === 'document_lookup' && data.result?.docType === testCase.expectedDocType) {
          console.log(`✅ PASS - Correctly detected ${testCase.expectedDocType} document intent`);
          console.log(`Response: ${data.answer?.substring(0, 100)}...`);
          passed++;
        } else {
          console.log(`❌ FAIL - Expected ${testCase.expectedDocType} document, got ${data.result?.docType || 'none'}`);
          console.log(`Route: ${data.route}`);
        }
      }
      
    } catch (error) {
      console.log(`❌ FAIL - Request failed: ${error.message}`);
    }
  }
  
  console.log(`\n🎉 Test Results: ${passed}/${total} tests passed (${Math.round(passed/total*100)}%)`);
  
  if (passed === total) {
    console.log('🎯 All tests passed! Document system is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Please review the implementation.');
  }
}

// Run the test
testDocumentSystem().catch(console.error);
