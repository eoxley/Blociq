#!/usr/bin/env node

/**
 * BlocIQ Add-in URL Test Script
 * Tests all URLs referenced in the manifest
 */

const https = require('https');
const http = require('http');

async function testUrl(url) {
  return new Promise((resolve) => {
    const client = url.startsWith('https:') ? https : http;
    
    const request = client.get(url, (response) => {
      resolve({
        url,
        status: response.statusCode,
        success: response.statusCode >= 200 && response.statusCode < 400
      });
    });
    
    request.on('error', (error) => {
      resolve({
        url,
        status: 'ERROR',
        success: false,
        error: error.message
      });
    });
    
    request.setTimeout(10000, () => {
      request.destroy();
      resolve({
        url,
        status: 'TIMEOUT',
        success: false,
        error: 'Request timeout'
      });
    });
  });
}

async function testAddinUrls() {
  console.log('🧪 Testing BlocIQ Add-in URLs...\n');
  
  // URLs to test
  const urlsToTest = [
    'https://www.blociq.co.uk/outlook-addin/manifest.xml',
    'https://www.blociq.co.uk/addin/ask',
    'https://www.blociq.co.uk/addin/reply',
    'https://www.blociq.co.uk/addin/reply/functions.js',
    'https://www.blociq.co.uk/api/addin/chat',
    'https://www.blociq.co.uk/api/addin/generate-reply',
    'https://www.blociq.co.uk/icons/icon-16.png',
    'https://www.blociq.co.uk/icons/icon-32.png',
    'https://www.blociq.co.uk/icons/icon-64.png',
    'https://www.blociq.co.uk/icons/icon-80.png',
    'https://www.blociq.co.uk/privacy',
    'https://www.blociq.co.uk/terms'
  ];

  let allPassed = true;
  const results = [];

  for (const url of urlsToTest) {
    const result = await testUrl(url);
    results.push(result);
    
    const statusEmoji = result.success ? '✅' : '❌';
    const statusText = typeof result.status === 'number' ? result.status : result.status;
    
    console.log(`${statusEmoji} ${url} (${statusText})`);
    
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
    
    if (!result.success) {
      allPassed = false;
    }
  }

  console.log('\n📊 Summary:');
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(`   ✅ Passed: ${passed}`);
  console.log(`   ❌ Failed: ${failed}`);
  
  if (allPassed) {
    console.log('\n🎉 All URLs are accessible! Your add-in should sideload successfully.');
  } else {
    console.log('\n⚠️  Some URLs failed. Please fix these before deploying:');
    results.filter(r => !r.success).forEach(result => {
      console.log(`   - ${result.url}: ${result.error || result.status}`);
    });
  }

  return allPassed;
}

// Run the test
testAddinUrls().catch(console.error);
