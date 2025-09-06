#!/usr/bin/env node

/**
 * Test script for the thread-based generate reply functionality
 */

const testThreadContext = {
  subject: "Service Charge Query - Ashwood House",
  from: "tenant@example.com",
  to: ["manager@blociq.co.uk", "admin@blociq.co.uk"],
  cc: ["accountant@blociq.co.uk"],
  bodyPreview: "I have a question about the service charge increase for this year. Can you please explain the breakdown?",
  internetMessageId: "<thread-12345@example.com>", // unique thread ID
  intent: "REPLY"
};

const testComposeContext = {
  subject: "New message",
  from: "Compose message",
  to: ["recipient@example.com"],
  cc: [],
  bodyPreview: "This is a new compose message",
  internetMessageId: null, // No thread ID for new compose
  intent: "REPLY"
};

async function testThreadReply() {
  console.log('🧪 Testing thread-based generate reply with /api/ask-ai...\n');
  
  try {
    console.log('📧 Testing read message context:');
    const readResponse = await fetch('http://localhost:3000/api/ask-ai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testThreadContext)
    });

    console.log('Read response status:', readResponse.status);
    const readResult = await readResponse.json();
    console.log('Read response body:', JSON.stringify(readResult, null, 2));
    
    if (readResult.text) {
      console.log('✅ Read message reply working correctly!');
      console.log('📝 Draft HTML preview:', readResult.text.substring(0, 200) + '...');
    } else {
      console.log('❌ No text returned from /api/ask-ai for read message');
    }
    
    console.log('\n📝 Testing compose message context:');
    const composeResponse = await fetch('http://localhost:3000/api/ask-ai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testComposeContext)
    });

    console.log('Compose response status:', composeResponse.status);
    const composeResult = await composeResponse.json();
    console.log('Compose response body:', JSON.stringify(composeResult, null, 2));
    
    if (composeResult.text) {
      console.log('✅ Compose message reply working correctly!');
      console.log('📝 Draft HTML preview:', composeResult.text.substring(0, 200) + '...');
    } else {
      console.log('❌ No text returned from /api/ask-ai for compose message');
    }
    
  } catch (error) {
    console.error('❌ Error testing thread reply:', error.message);
    console.log('\n💡 Make sure the development server is running: npm run dev');
  }
}

// Run the test
testThreadReply();
