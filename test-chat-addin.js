// Simple test script to verify chat add-in responds conversationally
const testChatAddin = async () => {
  try {
    const response = await fetch('http://localhost:3001/api/addin/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'What is an ESW1?',
        emailContext: {
          subject: 'ESW1 Question',
          from: 'Emma Taylor'
        },
        source: 'test_script'
      })
    });

    const result = await response.json();

    console.log('Chat Response Test:');
    console.log('Status:', response.status);
    console.log('Success:', result.success);
    console.log('Response:', result.response);
    console.log('\nChecking for email formatting issues:');

    if (result.response.includes('Subject:')) {
      console.log('❌ PROBLEM: Response contains "Subject:" - still formatting as email');
    } else {
      console.log('✅ GOOD: No "Subject:" found');
    }

    if (result.response.includes('Dear ') && result.response.includes('Kind regards,')) {
      console.log('❌ PROBLEM: Response contains email greeting/closing format');
    } else {
      console.log('✅ GOOD: Conversational format detected');
    }

    if (result.response.includes('[Your Name]')) {
      console.log('❌ PROBLEM: Response contains placeholder [Your Name]');
    } else {
      console.log('✅ GOOD: No placeholder names found');
    }

  } catch (error) {
    console.error('Test failed:', error);
  }
};

// Run the test
testChatAddin();