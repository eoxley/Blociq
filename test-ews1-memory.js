// Test script for EWS1 conversational memory example
// This tests the scenario described in the requirements:
// 1. User asks "What is an EWS1 form?"
// 2. User asks "write this as a notice to all leaseholders"
// 3. User asks "turn that into an email to leaseholders"

const API_BASE = 'http://localhost:3000';

async function testEWS1Memory() {
  console.log('🧪 Testing EWS1 Conversational Memory...\n');

  let conversationId = null;

  try {
    // Test 1: Ask about EWS1 form
    console.log('📝 Test 1: Asking about EWS1 form...');
    const response1 = await fetch(`${API_BASE}/api/assistant-query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userQuestion: 'What is an EWS1 form?',
        useMemory: true
      })
    });

    if (!response1.ok) {
      throw new Error(`HTTP error! status: ${response1.status}`);
    }

    const data1 = await response1.json();
    conversationId = data1.conversationId;
    
    console.log('✅ Response 1 received');
    console.log('📋 Answer:', data1.answer.substring(0, 200) + '...');
    console.log('🆔 Conversation ID:', conversationId);
    console.log('🧠 Memory used:', data1.memoryUsed);
    console.log('📊 Context:', data1.context.memoryContext);
    console.log('');

    // Test 2: Ask to write as notice
    console.log('📝 Test 2: Asking to write as notice...');
    const response2 = await fetch(`${API_BASE}/api/assistant-query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userQuestion: 'write this as a notice to all leaseholders',
        useMemory: true,
        conversationId: conversationId
      })
    });

    if (!response2.ok) {
      throw new Error(`HTTP error! status: ${response2.status}`);
    }

    const data2 = await response2.json();
    
    console.log('✅ Response 2 received');
    console.log('📋 Answer:', data2.answer.substring(0, 200) + '...');
    console.log('🧠 Memory used:', data2.memoryUsed);
    console.log('📊 Context:', data2.context.memoryContext);
    console.log('');

    // Test 3: Ask to turn into email
    console.log('📝 Test 3: Asking to turn into email...');
    const response3 = await fetch(`${API_BASE}/api/assistant-query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userQuestion: 'turn that into an email to leaseholders',
        useMemory: true,
        conversationId: conversationId
      })
    });

    if (!response3.ok) {
      throw new Error(`HTTP error! status: ${response3.status}`);
    }

    const data3 = await response3.json();
    
    console.log('✅ Response 3 received');
    console.log('📋 Answer:', data3.answer.substring(0, 200) + '...');
    console.log('🧠 Memory used:', data3.memoryUsed);
    console.log('📊 Context:', data3.context.memoryContext);
    console.log('');

    // Summary
    console.log('🎯 Test Summary:');
    console.log('✅ All three tests passed');
    console.log('🆔 Conversation maintained throughout:', conversationId);
    console.log('🧠 Memory system working:', data1.memoryUsed && data2.memoryUsed && data3.memoryUsed);
    console.log('📊 Context building:', data1.context.memoryContext?.factsUsed, '→', data2.context.memoryContext?.factsUsed, '→', data3.context.memoryContext?.factsUsed, 'facts');
    console.log('');

    // Check if responses are coherent (not asking user to repeat themselves)
    const responses = [data1.answer, data2.answer, data3.answer];
    const hasRepetition = responses.some(response => 
      response.toLowerCase().includes('what is an ews1') || 
      response.toLowerCase().includes('you asked about') ||
      response.toLowerCase().includes('as you mentioned')
    );

    if (!hasRepetition) {
      console.log('🎉 SUCCESS: Responses are coherent and don\'t ask user to repeat themselves!');
    } else {
      console.log('⚠️  WARNING: Some responses may be asking for repetition');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the test
if (require.main === module) {
  testEWS1Memory();
}

module.exports = { testEWS1Memory };
