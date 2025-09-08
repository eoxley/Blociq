#!/usr/bin/env node

/**
 * Test List Buildings Endpoint
 * This script tests the actual /api/list-buildings endpoint
 */

const https = require('https');
const http = require('http');

async function testListBuildingsEndpoint() {
  console.log('🧪 Testing /api/list-buildings endpoint...\n');

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const endpoint = `${baseUrl}/api/list-buildings`;

  console.log(`📡 Testing endpoint: ${endpoint}`);

  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log(`📊 Response status: ${response.status}`);
    console.log(`📊 Response headers:`, Object.fromEntries(response.headers.entries()));

    const responseText = await response.text();
    console.log(`📊 Response body:`, responseText);

    if (response.ok) {
      try {
        const data = JSON.parse(responseText);
        console.log('\n✅ API Response parsed successfully:');
        console.log(`   Buildings: ${data.buildings?.length || 0}`);
        if (data.buildings && data.buildings.length > 0) {
          data.buildings.forEach((building, index) => {
            console.log(`      ${index + 1}. ${building.name} (${building.unit_count} units)`);
          });
        }
      } catch (parseError) {
        console.log('❌ Failed to parse JSON response:', parseError.message);
      }
    } else {
      console.log(`❌ API request failed with status ${response.status}`);
    }

  } catch (error) {
    console.error('❌ Error testing endpoint:', error.message);
  }
}

// Run the test
testListBuildingsEndpoint();
