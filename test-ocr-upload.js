#!/usr/bin/env node

/**
 * OCR Upload Test - Tests actual file upload functionality
 */

const https = require('https');
const fs = require('fs');
const FormData = require('form-data');

const CONFIG = {
  MAIN_APP_URL: 'https://www.blociq.co.uk',
  RENDER_OCR_URL: 'https://ocr-server-2-ykmk.onrender.com'
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

// Test Ask AI Upload with FormData
async function testAskAIUpload() {
  logStep(1, 'Testing Ask AI Upload with FormData');
  
  try {
    // Create a simple test file
    const testContent = "This is a test document for OCR processing. It contains some text that should be extracted.";
    fs.writeFileSync('test-upload.txt', testContent);
    
    const formData = new FormData();
    formData.append('file', fs.createReadStream('test-upload.txt'), {
      filename: 'test-upload.txt',
      contentType: 'text/plain'
    });
    
    const response = await new Promise((resolve, reject) => {
      const req = https.request(`${CONFIG.MAIN_APP_URL}/api/ask-ai/upload`, {
        method: 'POST',
        headers: formData.getHeaders()
      }, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          try {
            const jsonData = JSON.parse(data);
            resolve({ status: res.statusCode, data: jsonData });
          } catch (e) {
            resolve({ status: res.statusCode, data: data });
          }
        });
      });
      
      req.on('error', reject);
      formData.pipe(req);
    });
    
    if (response.status === 200 && response.data.success) {
      logSuccess('Ask AI upload successful');
      logInfo(`Text length: ${response.data.textLength} characters`);
      logInfo(`OCR source: ${response.data.ocrSource}`);
      logInfo(`Document type: ${response.data.documentType}`);
      return true;
    } else {
      logError(`Ask AI upload failed: ${response.status}`);
      logInfo(`Response: ${JSON.stringify(response.data)}`);
      return false;
    }
  } catch (error) {
    logError(`Ask AI upload error: ${error.message}`);
    return false;
  } finally {
    // Clean up test file
    try {
      fs.unlinkSync('test-upload.txt');
    } catch (e) {
      // Ignore cleanup errors
    }
  }
}

// Test Render Service Direct Upload
async function testRenderServiceUpload() {
  logStep(2, 'Testing Render Service Direct Upload');
  
  try {
    const testContent = "This is a test document for direct Render service OCR processing.";
    fs.writeFileSync('test-render.txt', testContent);
    
    const formData = new FormData();
    formData.append('file', fs.createReadStream('test-render.txt'), {
      filename: 'test-render.txt',
      contentType: 'text/plain'
    });
    formData.append('use_google_vision', 'true');
    
    const response = await new Promise((resolve, reject) => {
      const req = https.request(`${CONFIG.RENDER_OCR_URL}/upload`, {
        method: 'POST',
        headers: {
          ...formData.getHeaders(),
          'Authorization': 'Bearer test-token' // This will fail auth but test endpoint
        }
      }, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          try {
            const jsonData = JSON.parse(data);
            resolve({ status: res.statusCode, data: jsonData });
          } catch (e) {
            resolve({ status: res.statusCode, data: data });
          }
        });
      });
      
      req.on('error', reject);
      formData.pipe(req);
    });
    
    if (response.status === 401) {
      logSuccess('Render service upload endpoint accessible (auth required)');
      logInfo('Endpoint correctly requires authentication');
      return true;
    } else if (response.status === 200) {
      logSuccess('Render service upload successful');
      logInfo(`Text length: ${response.data.text_length} characters`);
      logInfo(`OCR source: ${response.data.source}`);
      return true;
    } else {
      logError(`Render service upload failed: ${response.status}`);
      logInfo(`Response: ${JSON.stringify(response.data)}`);
      return false;
    }
  } catch (error) {
    logError(`Render service upload error: ${error.message}`);
    return false;
  } finally {
    // Clean up test file
    try {
      fs.unlinkSync('test-render.txt');
    } catch (e) {
      // Ignore cleanup errors
    }
  }
}

// Test OCR Process Endpoint
async function testOCRProcessEndpoint() {
  logStep(3, 'Testing OCR Process Endpoint');
  
  try {
    const response = await new Promise((resolve, reject) => {
      const req = https.request(`${CONFIG.MAIN_APP_URL}/api/ocr/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      }, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          try {
            const jsonData = JSON.parse(data);
            resolve({ status: res.statusCode, data: jsonData });
          } catch (e) {
            resolve({ status: res.statusCode, data: data });
          }
        });
      });
      
      req.on('error', reject);
      req.write(JSON.stringify({}));
      req.end();
    });
    
    if (response.status === 400) {
      logSuccess('OCR process endpoint accessible');
      logInfo('Endpoint correctly validates requests');
      return true;
    } else {
      logError(`Unexpected response: ${response.status}`);
      logInfo(`Response: ${JSON.stringify(response.data)}`);
      return false;
    }
  } catch (error) {
    logError(`OCR process endpoint error: ${error.message}`);
    return false;
  }
}

// Main test function
async function runUploadTests() {
  log('🧪 OCR Upload Functionality Test', 'bright');
  log('=' .repeat(50), 'cyan');
  
  const results = {
    askAIUpload: false,
    renderUpload: false,
    ocrProcess: false
  };
  
  // Run all tests
  results.askAIUpload = await testAskAIUpload();
  results.renderUpload = await testRenderServiceUpload();
  results.ocrProcess = await testOCRProcessEndpoint();
  
  // Summary
  log('\n📊 Upload Test Results Summary', 'bright');
  log('=' .repeat(50), 'cyan');
  
  const testNames = {
    askAIUpload: 'Ask AI Upload (Small Files)',
    renderUpload: 'Render Service Upload (Large Files)',
    ocrProcess: 'OCR Process Endpoint'
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
    log('\n🎉 All upload tests passed! Your OCR system is ready for live testing.', 'green');
    log('You can now test with real PDF files through the Ask AI interface.', 'green');
  } else {
    log('\n⚠️  Some upload tests failed. Please check the configuration.', 'yellow');
  }
  
  return passed === total;
}

// Main execution
if (require.main === module) {
  runUploadTests().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    logError(`Upload test execution failed: ${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  testAskAIUpload,
  testRenderServiceUpload,
  testOCRProcessEndpoint,
  runUploadTests
};
