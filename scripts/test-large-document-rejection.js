#!/usr/bin/env node

/**
 * Test script to verify large document rejection in Ask AI and processing in Lease Lab
 */

const fs = require('fs');
const path = require('path');

// Create a large test document (simulate a large PDF)
function createLargeTestDocument() {
  const largeContent = 'A'.repeat(6 * 1024 * 1024); // 6MB of content
  const testDocPath = path.join(__dirname, 'test-large-document.txt');
  
  fs.writeFileSync(testDocPath, largeContent);
  console.log(`📄 Created large test document: ${testDocPath} (${(fs.statSync(testDocPath).size / 1024 / 1024).toFixed(2)} MB)`);
  
  return testDocPath;
}

async function testAskAIRejection() {
  console.log('\n🧪 Testing Ask AI with large document (should be rejected)...');
  
  try {
    const response = await fetch('http://localhost:3000/api/ask-ai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userInput: 'Please analyze this large document',
        intent: 'ANALYZE',
        fileSize: 6 * 1024 * 1024, // 6MB
        fileName: 'large-test-document.pdf'
      })
    });

    const result = await response.json();
    console.log('Ask AI Response Status:', response.status);
    console.log('Ask AI Response:', JSON.stringify(result, null, 2));
    
    if (response.status === 413 || result.message?.includes('5MB') || result.message?.includes('too large')) {
      console.log('✅ Ask AI correctly rejected large document');
    } else {
      console.log('❌ Ask AI should have rejected large document but did not');
    }
    
  } catch (error) {
    console.error('❌ Error testing Ask AI:', error.message);
  }
}

async function testLeaseLabProcessing() {
  console.log('\n🔬 Testing Lease Lab with large document (should be processed)...');
  
  try {
    // First, create a test document
    const testDocPath = createLargeTestDocument();
    
    // Read the file as base64 for upload
    const fileBuffer = fs.readFileSync(testDocPath);
    const base64Content = fileBuffer.toString('base64');
    
    const response = await fetch('http://localhost:3000/api/lease-lab/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileName: 'large-test-document.pdf',
        fileContent: base64Content,
        fileType: 'application/pdf',
        fileSize: fileBuffer.length
      })
    });

    const result = await response.json();
    console.log('Lease Lab Response Status:', response.status);
    console.log('Lease Lab Response:', JSON.stringify(result, null, 2));
    
    if (response.status === 200 && result.jobId) {
      console.log('✅ Lease Lab accepted large document for processing');
      console.log(`📋 Job ID: ${result.jobId}`);
      
      // Check job status
      await checkJobStatus(result.jobId);
    } else {
      console.log('❌ Lease Lab should have accepted large document but did not');
    }
    
    // Clean up test file
    fs.unlinkSync(testDocPath);
    console.log('🧹 Cleaned up test file');
    
  } catch (error) {
    console.error('❌ Error testing Lease Lab:', error.message);
  }
}

async function checkJobStatus(jobId) {
  console.log(`\n📊 Checking job status for ${jobId}...`);
  
  try {
    const response = await fetch(`http://localhost:3000/api/lease-lab/jobs/${jobId}`);
    const result = await response.json();
    
    console.log('Job Status:', result.status);
    console.log('Job Details:', JSON.stringify(result, null, 2));
    
    if (result.status === 'processing' || result.status === 'completed') {
      console.log('✅ Job is being processed or completed');
    } else {
      console.log('⚠️ Job status:', result.status);
    }
    
  } catch (error) {
    console.error('❌ Error checking job status:', error.message);
  }
}

async function runTests() {
  console.log('🚀 Starting large document rejection tests...\n');
  
  // Test Ask AI rejection
  await testAskAIRejection();
  
  // Test Lease Lab processing
  await testLeaseLabProcessing();
  
  console.log('\n✅ Tests completed!');
}

// Run the tests
runTests().catch(console.error);
