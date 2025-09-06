#!/usr/bin/env node

/**
 * Test script to verify inbox dashboard data
 */

async function testInboxDashboard() {
  console.log('🧪 Testing Inbox Dashboard API...\n');
  
  try {
    // Test the dashboard API directly
    const response = await fetch('http://localhost:3002/api/inbox/dashboard?timeRange=week', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('Response Status:', response.status);
    console.log('Response Headers:', Object.fromEntries(response.headers.entries()));
    
    const data = await response.json();
    console.log('\n📊 Dashboard Data:');
    console.log('Success:', data.success);
    console.log('Data Source:', data.dataSource);
    console.log('Time Range:', data.timeRange);
    
    if (data.data) {
      console.log('\n📈 Dashboard Metrics:');
      console.log('Total:', data.data.total);
      console.log('Unread:', data.data.unread);
      console.log('Handled:', data.data.handled);
      console.log('Urgent:', data.data.urgent);
      
      console.log('\n📋 Recent Activity:');
      console.log('Count:', data.data.recentActivity?.length || 0);
      if (data.data.recentActivity && data.data.recentActivity.length > 0) {
        data.data.recentActivity.slice(0, 3).forEach((activity, index) => {
          console.log(`  ${index + 1}. ${activity.subject} (${activity.urgencyLevel})`);
        });
      }
      
      console.log('\n🏢 Categories:');
      if (data.data.categories) {
        Object.entries(data.data.categories).forEach(([category, info]) => {
          console.log(`  ${category}: ${info.count} emails`);
        });
      }
      
      console.log('\n🎯 Smart Suggestions:');
      console.log('Count:', data.data.smartSuggestions?.length || 0);
      if (data.data.smartSuggestions && data.data.smartSuggestions.length > 0) {
        data.data.smartSuggestions.slice(0, 3).forEach((suggestion, index) => {
          console.log(`  ${index + 1}. ${suggestion.title}: ${suggestion.message}`);
        });
      }
    } else {
      console.log('❌ No data in response');
    }
    
    if (data.error) {
      console.log('\n❌ Error:', data.error);
      console.log('Message:', data.message);
    }
    
  } catch (error) {
    console.error('❌ Error testing dashboard:', error.message);
  }
}

// Run the test
testInboxDashboard().catch(console.error);
