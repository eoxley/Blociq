#!/usr/bin/env node

/**
 * Test script for compliance upload system
 * This script tests the compliance upload API
 */

const fs = require('fs');
const path = require('path');

async function testComplianceUpload() {
  console.log('📄 Testing compliance upload system...\n');

  try {
    // Check if test file exists
    const testFilePath = path.join(__dirname, '..', 'test-files', 'Ashwood_EICR_2023.pdf');
    
    if (!fs.existsSync(testFilePath)) {
      console.log('⚠️ Test file not found. Please place Ashwood_EICR_2023.pdf in test-files/ directory');
      console.log('   Expected location:', testFilePath);
      return;
    }

    console.log('✅ Test file found:', testFilePath);

    // Read file
    const fileBuffer = fs.readFileSync(testFilePath);
    const fileName = path.basename(testFilePath);
    
    console.log(`📄 File size: ${(fileBuffer.length / 1024).toFixed(2)} KB`);

    // Create form data
    const FormData = require('form-data');
    const formData = new FormData();
    formData.append('file', fileBuffer, {
      filename: fileName,
      contentType: 'application/pdf'
    });
    formData.append('building_id', 'test-building-123');
    formData.append('doc_type', 'EICR');

    console.log('🚀 Uploading to compliance API...');

    const response = await fetch('http://localhost:3003/api/compliance/upload', {
      method: 'POST',
      body: formData,
      headers: {
        ...formData.getHeaders(),
        // Note: In real usage, you'd need a valid auth token
        'Authorization': 'Bearer test-token'
      }
    });

    console.log('📊 Response status:', response.status);
    console.log('📊 Response headers:', Object.fromEntries(response.headers.entries()));

    const data = await response.json();
    
    console.log('\n📊 Response data:');
    console.log(JSON.stringify(data, null, 2));

    if (data.success) {
      console.log('\n✅ Upload successful!');
      console.log(`📄 Job ID: ${data.job?.id}`);
      console.log(`📄 Status: ${data.job?.status}`);
      console.log(`📄 Document Type: ${data.job?.doc_type}`);
      
      if (data.job?.summary_json) {
        console.log('\n📋 EICR Summary:');
        const summary = data.job.summary_json;
        console.log(`  Building: ${summary.building_name || 'Not detected'}`);
        console.log(`  Inspection Date: ${summary.inspection_date}`);
        console.log(`  Next Due: ${summary.next_due_date}`);
        console.log(`  Result: ${summary.result}`);
        console.log(`  Findings: ${summary.findings?.length || 0} categories`);
      }
    } else {
      console.log('\n❌ Upload failed!');
      console.log(`Error: ${data.error}`);
      console.log(`Message: ${data.message}`);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Check if we're in the right directory
const packageJsonPath = path.join(__dirname, '..', 'package.json');
if (!fs.existsSync(packageJsonPath)) {
  console.error('❌ Please run this script from the project root');
  process.exit(1);
}

// Run the test
testComplianceUpload();
