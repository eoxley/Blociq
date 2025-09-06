#!/usr/bin/env node

/**
 * OCR System Test Script
 * Tests both small and large file processing through the Ask AI system
 */

const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const fetch = require('node-fetch');

// Configuration
const CONFIG = {
  // Update these URLs to match your deployment
  MAIN_APP_URL: process.env.MAIN_APP_URL || 'https://your-app.vercel.app',
  RENDER_OCR_URL: process.env.RENDER_OCR_URL || 'https://your-render-service.onrender.com',
  RENDER_OCR_TOKEN: process.env.RENDER_OCR_TOKEN || 'your-token-here',
  
  // Test files (create these for testing)
  SMALL_PDF: './test-files/small-lease.pdf',      // < 5MB
  LARGE_PDF: './test-files/large-lease.pdf',      // > 5MB
  IMAGE_FILE: './test-files/test-image.png'       // Any image file
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step, message) {
  log(`\n${step}. ${message}`, 'cyan');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

// Test functions
async function testRenderServiceHealth() {
  logStep(1, 'Testing Render OCR Service Health');
  
  try {
    const response = await fetch(`${CONFIG.RENDER_OCR_URL}/health`);
    const data = await response.json();
    
    if (response.ok) {
      logSuccess('Render service is healthy');
      logInfo(`Status: ${data.status}`);
      logInfo(`Google Vision: ${data.services.google_vision_available ? 'Available' : 'Not Available'}`);
      logInfo(`Supabase: ${data.services.supabase_available ? 'Available' : 'Not Available'}`);
      return true;
    } else {
      logError(`Health check failed: ${response.status} ${response.statusText}`);
      return false;
    }
  } catch (error) {
    logError(`Cannot connect to Render service: ${error.message}`);
    return false;
  }
}

async function testMainAppOCRCheck() {
  logStep(2, 'Testing Main App OCR Configuration');
  
  try {
    const response = await fetch(`${CONFIG.MAIN_APP_URL}/api/render-ocr-check`);
    const data = await response.json();
    
    if (response.ok && data.success) {
      logSuccess('Main app OCR configuration is correct');
      logInfo(`Render URL: ${data.config.urlPreview}`);
      logInfo(`Token configured: ${data.config.hasToken ? 'Yes' : 'No'}`);
      return true;
    } else {
      logError(`OCR configuration check failed: ${data.message || 'Unknown error'}`);
      return false;
    }
  } catch (error) {
    logError(`Cannot connect to main app: ${error.message}`);
    return false;
  }
}

async function testSmallFileProcessing() {
  logStep(3, 'Testing Small File Processing (Quick Processing)');
  
  if (!fs.existsSync(CONFIG.SMALL_PDF)) {
    logWarning(`Test file not found: ${CONFIG.SMALL_PDF}`);
    logInfo('Create a small PDF file (< 5MB) for testing');
    return false;
  }
  
  try {
    const formData = new FormData();
    formData.append('file', fs.createReadStream(CONFIG.SMALL_PDF));
    
    const response = await fetch(`${CONFIG.MAIN_APP_URL}/api/ask-ai/upload`, {
      method: 'POST',
      body: formData
    });
    
    const data = await response.json();
    
    if (response.ok && data.success) {
      logSuccess('Small file processing successful');
      logInfo(`Text length: ${data.textLength} characters`);
      logInfo(`OCR source: ${data.ocrSource}`);
      logInfo(`Document type: ${data.documentType}`);
      return true;
    } else {
      logError(`Small file processing failed: ${data.error || 'Unknown error'}`);
      return false;
    }
  } catch (error) {
    logError(`Small file processing error: ${error.message}`);
    return false;
  }
}

async function testLargeFileProcessing() {
  logStep(4, 'Testing Large File Processing (Background Processing)');
  
  if (!fs.existsSync(CONFIG.LARGE_PDF)) {
    logWarning(`Test file not found: ${CONFIG.LARGE_PDF}`);
    logInfo('Create a large PDF file (> 5MB) for testing');
    return false;
  }
  
  try {
    // First, upload to Supabase storage
    const uploadFormData = new FormData();
    uploadFormData.append('file', fs.createReadStream(CONFIG.LARGE_PDF));
    
    const uploadResponse = await fetch(`${CONFIG.MAIN_APP_URL}/api/upload-and-analyse`, {
      method: 'POST',
      body: uploadFormData
    });
    
    const uploadData = await uploadResponse.json();
    
    if (!uploadResponse.ok) {
      logError(`File upload failed: ${uploadData.error || 'Unknown error'}`);
      return false;
    }
    
    logInfo('File uploaded to storage successfully');
    
    // Now test OCR processing with storage key
    const ocrFormData = new FormData();
    ocrFormData.append('storageKey', uploadData.storageKey);
    ocrFormData.append('filename', uploadData.filename);
    ocrFormData.append('mime', uploadData.mime);
    
    const ocrResponse = await fetch(`${CONFIG.MAIN_APP_URL}/api/ocr/process`, {
      method: 'POST',
      body: ocrFormData
    });
    
    const ocrData = await ocrResponse.json();
    
    if (ocrResponse.ok && ocrData.success) {
      logSuccess('Large file processing successful');
      logInfo(`Text length: ${ocrData.textLength} characters`);
      logInfo(`OCR source: ${ocrData.source}`);
      logInfo(`Processing mode: ${ocrData.processingMode}`);
      return true;
    } else {
      logError(`Large file processing failed: ${ocrData.error || 'Unknown error'}`);
      return false;
    }
  } catch (error) {
    logError(`Large file processing error: ${error.message}`);
    return false;
  }
}

async function testDirectRenderService() {
  logStep(5, 'Testing Direct Render Service (with authentication)');
  
  if (!fs.existsSync(CONFIG.SMALL_PDF)) {
    logWarning(`Test file not found: ${CONFIG.SMALL_PDF}`);
    return false;
  }
  
  try {
    const formData = new FormData();
    formData.append('file', fs.createReadStream(CONFIG.SMALL_PDF));
    formData.append('use_google_vision', 'true');
    
    const response = await fetch(`${CONFIG.RENDER_OCR_URL}/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CONFIG.RENDER_OCR_TOKEN}`
      },
      body: formData
    });
    
    const data = await response.json();
    
    if (response.ok && data.success) {
      logSuccess('Direct Render service processing successful');
      logInfo(`Text length: ${data.text_length} characters`);
      logInfo(`OCR source: ${data.source}`);
      logInfo(`Processing mode: ${data.processing_mode}`);
      return true;
    } else {
      logError(`Direct Render service processing failed: ${data.detail || 'Unknown error'}`);
      return false;
    }
  } catch (error) {
    logError(`Direct Render service error: ${error.message}`);
    return false;
  }
}

async function runAllTests() {
  log('🚀 Starting OCR System Tests', 'bright');
  log('=' .repeat(50), 'cyan');
  
  const results = {
    renderHealth: false,
    mainAppConfig: false,
    smallFile: false,
    largeFile: false,
    directRender: false
  };
  
  // Run tests
  results.renderHealth = await testRenderServiceHealth();
  results.mainAppConfig = await testMainAppOCRCheck();
  results.smallFile = await testSmallFileProcessing();
  results.largeFile = await testLargeFileProcessing();
  results.directRender = await testDirectRenderService();
  
  // Summary
  log('\n📊 Test Results Summary', 'bright');
  log('=' .repeat(50), 'cyan');
  
  const testNames = {
    renderHealth: 'Render Service Health',
    mainAppConfig: 'Main App Configuration',
    smallFile: 'Small File Processing',
    largeFile: 'Large File Processing',
    directRender: 'Direct Render Service'
  };
  
  let passed = 0;
  let total = 0;
  
  for (const [key, name] of Object.entries(testNames)) {
    total++;
    if (results[key]) {
      logSuccess(`${name}: PASSED`);
      passed++;
    } else {
      logError(`${name}: FAILED`);
    }
  }
  
  log(`\n🎯 Overall Result: ${passed}/${total} tests passed`, passed === total ? 'green' : 'yellow');
  
  if (passed === total) {
    log('\n🎉 All tests passed! Your OCR system is working correctly.', 'green');
  } else {
    log('\n⚠️  Some tests failed. Please check the configuration and try again.', 'yellow');
  }
  
  return passed === total;
}

// Main execution
if (require.main === module) {
  runAllTests().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    logError(`Test execution failed: ${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  testRenderServiceHealth,
  testMainAppOCRCheck,
  testSmallFileProcessing,
  testLargeFileProcessing,
  testDirectRenderService,
  runAllTests
};
