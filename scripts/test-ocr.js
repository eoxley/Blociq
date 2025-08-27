#!/usr/bin/env node

/**
 * Test script for OCR API endpoints
 * Tests both /api/ocr and /api/ocr-test endpoints
 */

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

async function testOCREndpoints() {
  console.log('🧪 Testing OCR API endpoints...\n');

  // Test 1: OCR Test endpoint (GET)
  console.log('1️⃣ Testing /api/ocr-test (GET)...');
  try {
    const response = await fetch(`${BASE_URL}/api/ocr-test`);
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ OCR Test GET successful:', data.message);
      console.log('   Credentials:', data.credentials);
    } else {
      console.log('❌ OCR Test GET failed:', data.error);
      if (data.missing) {
        console.log('   Missing:', data.missing);
      }
    }
  } catch (error) {
    console.log('❌ OCR Test GET error:', error.message);
  }

  console.log('');

  // Test 2: OCR Test endpoint (POST) with sample base64
  console.log('2️⃣ Testing /api/ocr-test (POST)...');
  try {
    // Simple test image (1x1 pixel transparent PNG)
    const testImage = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    
    const response = await fetch(`${BASE_URL}/api/ocr-test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ testImage })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ OCR Test POST successful:', data.message);
      console.log('   Result:', data.result);
    } else {
      console.log('❌ OCR Test POST failed:', data.error);
      if (data.details) {
        console.log('   Details:', data.details);
      }
    }
  } catch (error) {
    console.log('❌ OCR Test POST error:', error.message);
  }

  console.log('');

  // Test 3: Main OCR endpoint
  console.log('3️⃣ Testing /api/ocr (POST)...');
  try {
    const response = await fetch(`${BASE_URL}/api/ocr`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        base64Image: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==' 
      })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ OCR endpoint successful:', data.success);
      console.log('   Text length:', data.text?.length || 0);
      console.log('   Confidence:', data.confidence);
    } else {
      console.log('❌ OCR endpoint failed:', data.error);
      if (data.details) {
        console.log('   Details:', data.details);
      }
    }
  } catch (error) {
    console.log('❌ OCR endpoint error:', error.message);
  }

  console.log('\n🏁 OCR API testing completed!');
}

// Run tests
testOCREndpoints().catch(console.error);
