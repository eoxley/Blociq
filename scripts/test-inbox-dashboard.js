const fetch = require('node-fetch');

async function testInboxDashboard() {
  try {
    console.log('🧪 Testing inbox dashboard API...');
    
    const response = await fetch('http://localhost:3000/api/inbox/dashboard?timeRange=week', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('📊 Response status:', response.status);
    console.log('📊 Response headers:', Object.fromEntries(response.headers.entries()));

    const data = await response.json();
    console.log('📊 Response data:', JSON.stringify(data, null, 2));

    if (data.success) {
      console.log('✅ Dashboard API working');
      console.log('📈 Data source:', data.dataSource || 'unknown');
      console.log('📧 Total emails:', data.data?.total || 0);
      console.log('🚨 Urgent emails:', data.data?.urgent || 0);
    } else {
      console.log('❌ Dashboard API failed:', data.message);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testInboxDashboard();