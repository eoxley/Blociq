#!/usr/bin/env node

/**
 * Test script for the generate-reply endpoint
 */

const testContext = {
  subject: "Service Charge Query - Ashwood House",
  from: "tenant@example.com",
  to: ["manager@blociq.co.uk"],
  cc: [],
  bodyPreview: "I have a question about the service charge increase for this year. Can you please explain the breakdown?",
  intent: "REPLY"
};

async function testGenerateReply() {
  console.log('🧪 Testing generate-reply endpoint...\n');
  
  try {
    const response = await fetch('http://localhost:3000/api/generate-reply', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testContext)
    });

    console.log('Response status:', response.status);
    
    const result = await response.json();
    console.log('Response body:', JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log('\n✅ Generate-reply endpoint working correctly!');
      console.log('📧 Subject suggestion:', result.subjectSuggestion);
      console.log('📝 Draft HTML preview:', result.draftHtml?.substring(0, 200) + '...');
    } else {
      console.log('\n❌ Generate-reply endpoint failed:', result.message);
    }
    
  } catch (error) {
    console.error('❌ Error testing generate-reply endpoint:', error.message);
    console.log('\n💡 Make sure the development server is running: npm run dev');
  }
}

// Run the test
testGenerateReply();
