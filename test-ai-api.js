// Simple test script to check AI API functionality
const testAIAPI = async () => {
  try {
    console.log('🧪 Testing AI API...');
    
    const response = await fetch('http://localhost:3000/api/check-env', {
      method: 'GET',
    });
    
    if (response.ok) {
      const envData = await response.json();
      console.log('✅ Environment check:', envData);
      
      if (!envData.ok) {
        console.log('❌ Missing required environment variables:', envData.missingRequired);
        return;
      }
    } else {
      console.log('❌ Environment check failed');
      return;
    }
    
    // Test the ask-blociq API
    const testResponse = await fetch('http://localhost:3000/api/ask-blociq', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        question: 'Hello, can you help me with building management?',
        buildingId: 'test-building-id',
        userId: 'test-user-id'
      }),
    });
    
    if (testResponse.ok) {
      const data = await testResponse.json();
      console.log('✅ AI API test successful:', data);
    } else {
      const errorData = await testResponse.json();
      console.log('❌ AI API test failed:', errorData);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
};

testAIAPI(); 