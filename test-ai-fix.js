// Test script to verify AI functionality is working
const testAIFunctionality = async () => {
  console.log('🧪 Testing AI functionality...');
  
  try {
    // Test 1: Environment check
    console.log('\n1️⃣ Testing environment variables...');
    const envResponse = await fetch('http://localhost:3000/api/check-env');
    if (envResponse.ok) {
      const envData = await envResponse.json();
      console.log('✅ Environment check passed');
      if (!envData.ok) {
        console.log('❌ Missing environment variables:', envData.missingRequired);
        return;
      }
    } else {
      console.log('❌ Environment check failed');
      return;
    }
    
    // Test 2: AI API with proper format
    console.log('\n2️⃣ Testing AI API with correct response format...');
    const aiResponse = await fetch('http://localhost:3000/api/ask-blociq', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: 'What is building management?',
        buildingId: 'test-building-123',
        userId: 'test-user-123'
      })
    });
    
    if (aiResponse.ok) {
      const data = await aiResponse.json();
      console.log('✅ AI API test successful');
      console.log('📝 Response format:', {
        hasAnswer: !!data.answer,
        hasSources: Array.isArray(data.sources),
        hasDocumentCount: typeof data.documentCount === 'number',
        answerLength: data.answer?.length || 0
      });
    } else {
      const errorData = await aiResponse.json();
      console.log('❌ AI API test failed:', errorData);
    }
    
    console.log('\n🎉 AI functionality test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
};

// Run the test
testAIFunctionality(); 