const fetch = require('node-fetch');

async function testThreadReply() {
  try {
    console.log('🧪 Testing Outlook Add-in thread reply functionality...');
    
    // Simulate the context that would be sent from the Outlook Add-in
    const context = {
      subject: "URGENT: Water leak in Flat 8",
      from: "tenant@example.com",
      to: ["manager@blociq.co.uk"],
      cc: [],
      bodyPreview: "There is a significant water leak coming from the ceiling in Flat 8. Water is dripping onto electrical outlets. This needs immediate attention.",
      internetMessageId: "thread-12345@outlook.com",
      intent: "REPLY"
    };

    console.log('📧 Sending thread context to /api/ask-ai...');
    console.log('Context:', JSON.stringify(context, null, 2));

    const response = await fetch('http://localhost:3000/api/ask-ai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(context),
    });

    console.log('📊 Response status:', response.status);
    console.log('📊 Response headers:', Object.fromEntries(response.headers.entries()));

    const data = await response.json();
    console.log('📊 Response data:', JSON.stringify(data, null, 2));

    if (response.ok && data.text) {
      console.log('✅ Thread reply generation working');
      console.log('📝 Generated reply preview:', data.text.substring(0, 200) + '...');
      
      // Check if the reply contains expected elements
      const replyText = data.text.toLowerCase();
      if (replyText.includes('dear') || replyText.includes('thank you') || replyText.includes('regards')) {
        console.log('✅ Reply appears to be properly formatted');
      } else {
        console.log('⚠️ Reply format may need adjustment');
      }
    } else {
      console.log('❌ Thread reply generation failed:', data.message || 'Unknown error');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testThreadReply();