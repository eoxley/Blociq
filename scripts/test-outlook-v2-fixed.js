require('dotenv').config({ path: '.env.local' });

async function testOutlookV2API() {
  console.log('🔍 Testing Outlook v2 API endpoint (fixed version)...');
  
  try {
    const response = await fetch('https://blociq-frontend.vercel.app/api/outlook/v2/messages/list?folderId=inbox', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    console.log('📧 Outlook v2 API response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log('❌ Error response:', errorText);
      return;
    }
    
    const data = await response.json();
    console.log('✅ Outlook v2 API success:', data.ok);
    console.log('📧 Emails count:', data.items?.length || 0);
    
    if (data.items && data.items.length > 0) {
      console.log('📧 Sample email:', {
        id: data.items[0].id,
        subject: data.items[0].subject,
        from: data.items[0].from?.emailAddress?.address,
        isRead: data.items[0].isRead,
        receivedDateTime: data.items[0].receivedDateTime
      });
    }
    
  } catch (error) {
    console.error('❌ Error testing Outlook v2 API:', error);
  }
}

testOutlookV2API();
