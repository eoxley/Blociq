#!/usr/bin/env node

/**
 * Test script for Outlook calendar sync
 * This script tests the calendar API to see if it's working properly
 */

// Using built-in fetch (Node.js 18+)

async function testCalendarSync() {
  console.log('📅 Testing Outlook calendar sync...\n');

  try {
    const response = await fetch('http://localhost:3000/api/outlook/calendar-v2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('📅 Response status:', response.status);
    console.log('📅 Response headers:', Object.fromEntries(response.headers.entries()));

    const data = await response.json();
    
    console.log('\n📅 Response data:');
    console.log(JSON.stringify(data, null, 2));

    if (data.success) {
      console.log('\n✅ Calendar sync successful!');
      console.log(`📅 Data source: ${data.data?.source || 'unknown'}`);
      console.log(`📅 Events count: ${data.data?.totalCount || 0}`);
      console.log(`📅 Token refreshed: ${data.data?.tokenRefreshed || false}`);
      
      if (data.data?.events && data.data.events.length > 0) {
        console.log('\n📅 Sample events:');
        data.data.events.slice(0, 3).forEach((event, index) => {
          console.log(`  ${index + 1}. ${event.title} - ${event.start_time}`);
        });
      }
    } else {
      console.log('\n❌ Calendar sync failed!');
      console.log(`Error: ${data.error}`);
      console.log(`Message: ${data.message}`);
      console.log(`Code: ${data.code || 'none'}`);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testCalendarSync();
