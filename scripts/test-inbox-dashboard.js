#!/usr/bin/env node

/**
 * Test script for inbox dashboard API
 * This script tests the inbox dashboard endpoint to see if it's working properly
 */

// Using built-in fetch (Node.js 18+)

async function testInboxDashboard() {
  console.log('🧪 Testing inbox dashboard API...\n');

  try {
    const response = await fetch('http://localhost:3000/api/inbox/dashboard?timeRange=week', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('📊 Response status:', response.status);
    console.log('📊 Response headers:', Object.fromEntries(response.headers.entries()));

    const data = await response.json();
    
    console.log('\n📊 Response data:');
    console.log(JSON.stringify(data, null, 2));

    if (data.success) {
      console.log('\n✅ API call successful!');
      console.log(`📧 Data source: ${data.dataSource}`);
      console.log(`📧 Email count: ${data.emailCount || 0}`);
      console.log(`📧 Total emails: ${data.data?.total || 0}`);
      console.log(`📧 Unread emails: ${data.data?.unread || 0}`);
      console.log(`📧 Urgent emails: ${data.data?.urgent || 0}`);
      
      if (data.outlookError) {
        console.log(`⚠️ Outlook error: ${data.outlookError}`);
      }
    } else {
      console.log('\n❌ API call failed!');
      console.log(`Error: ${data.error}`);
      console.log(`Message: ${data.message}`);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testInboxDashboard();