#!/usr/bin/env node

/**
 * Test script for the minimal generate reply functionality
 */

const testContext = {
  subject: "Service Charge Query - Ashwood House",
  from: "tenant@example.com",
  bodyPreview: "I have a question about the service charge increase for this year. Can you please explain the breakdown?",
  intent: "REPLY"
};

async function testMinimalReply() {
  console.log('🧪 Testing minimal generate reply with /api/ask-ai...\n');
  
  try {
    const response = await fetch('http://localhost:3000/api/ask-ai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testContext)
    });

    console.log('Response status:', response.status);
    
    const result = await response.json();
    console.log('Response body:', JSON.stringify(result, null, 2));
    
    if (result.text) {
      console.log('\n✅ Minimal generate reply working correctly!');
      console.log('📝 Draft HTML preview:', result.text.substring(0, 200) + '...');
    } else {
      console.log('\n❌ No text returned from /api/ask-ai');
    }
    
  } catch (error) {
    console.error('❌ Error testing minimal reply:', error.message);
    console.log('\n💡 Make sure the development server is running: npm run dev');
  }
}

// Run the test
testMinimalReply();
