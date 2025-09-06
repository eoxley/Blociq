#!/usr/bin/env node

/**
 * OCR System Health Test - No Files Required
 * Tests the OCR system configuration and service availability
 */

const https = require('https');

// Configuration - Update these URLs to match your deployment
const CONFIG = {
  MAIN_APP_URL: process.env.MAIN_APP_URL || 'https://www.blociq.co.uk',
  RENDER_OCR_URL: process.env.RENDER_OCR_URL || 'https://ocr-server-2-ykmk.onrender.com',
  RENDER_OCR_TOKEN: process.env.RENDER_OCR_TOKEN || 'your-token-here'
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

// Helper function to make HTTPS requests
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    };

    const req = https.request(requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ status: res.statusCode, data: jsonData, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data: data, headers: res.headers });
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

// Test 1: Render Service Health
async function testRenderServiceHealth() {
  logStep(1, 'Testing Render OCR Service Health');
  
  try {
    const response = await makeRequest(`${CONFIG.RENDER_OCR_URL}/health`);
    
    if (response.status === 200) {
      logSuccess('Render service is healthy');
      logInfo(`Status: ${response.data.status}`);
      logInfo(`Google Vision: ${response.data.services?.google_vision_available ? 'Available' : 'Not Available'}`);
      logInfo(`Supabase: ${response.data.services?.supabase_available ? 'Available' : 'Not Available'}`);
      logInfo(`Tesseract: ${response.data.services?.tesseract_available ? 'Available' : 'Not Available'}`);
      
      // Check environment configuration
      if (response.data.environment) {
        logInfo('Environment Status:');
        Object.entries(response.data.environment).forEach(([key, value]) => {
          logInfo(`  ${key}: ${value ? 'Configured' : 'Not Configured'}`);
        });
      }
      
      return true;
    } else {
      logError(`Health check failed: ${response.status} ${JSON.stringify(response.data)}`);
      return false;
    }
  } catch (error) {
    logError(`Cannot connect to Render service: ${error.message}`);
    logInfo(`URL: ${CONFIG.RENDER_OCR_URL}/health`);
    return false;
  }
}

// Test 2: Render Service Basic Endpoint
async function testRenderServiceBasic() {
  logStep(2, 'Testing Render Service Basic Endpoint');
  
  try {
    const response = await makeRequest(`${CONFIG.RENDER_OCR_URL}/`);
    
    if (response.status === 200) {
      logSuccess('Render service basic endpoint accessible');
      logInfo(`Message: ${response.data.message}`);
      logInfo(`Google Vision: ${response.data.google_vision_available ? 'Available' : 'Not Available'}`);
      logInfo(`Supabase: ${response.data.supabase_available ? 'Available' : 'Not Available'}`);
      return true;
    } else {
      logError(`Basic endpoint failed: ${response.status}`);
      return false;
    }
  } catch (error) {
    logError(`Cannot connect to basic endpoint: ${error.message}`);
    return false;
  }
}

// Test 3: Main App OCR Configuration
async function testMainAppOCRConfig() {
  logStep(3, 'Testing Main App OCR Configuration');
  
  try {
    const response = await makeRequest(`${CONFIG.MAIN_APP_URL}/api/render-ocr-check`);
    
    if (response.status === 200 && response.data.success) {
      logSuccess('Main app OCR configuration is correct');
      logInfo(`Render URL: ${response.data.config?.urlPreview || 'Not shown'}`);
      logInfo(`Token configured: ${response.data.config?.hasToken ? 'Yes' : 'No'}`);
      return true;
    } else {
      logError(`OCR configuration check failed: ${response.data?.message || 'Unknown error'}`);
      return false;
    }
  } catch (error) {
    logError(`Cannot connect to main app: ${error.message}`);
    return false;
  }
}

// Test 4: Main App Ask AI Upload Endpoint
async function testMainAppAskAIUpload() {
  logStep(4, 'Testing Main App Ask AI Upload Endpoint');
  
  try {
    // Test with a simple GET request to see if endpoint exists
    const response = await makeRequest(`${CONFIG.MAIN_APP_URL}/api/ask-ai/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });
    
    // We expect a 400 error for missing file, which means endpoint is working
    if (response.status === 400) {
      logSuccess('Ask AI upload endpoint is accessible');
      logInfo('Endpoint responds correctly to invalid requests');
      return true;
    } else if (response.status === 405) {
      logWarning('Ask AI upload endpoint exists but method not allowed');
      return true;
    } else {
      logError(`Unexpected response: ${response.status} ${JSON.stringify(response.data)}`);
      return false;
    }
  } catch (error) {
    logError(`Cannot test Ask AI upload endpoint: ${error.message}`);
    return false;
  }
}

// Test 5: OCR Process Endpoint
async function testOCRProcessEndpoint() {
  logStep(5, 'Testing OCR Process Endpoint');
  
  try {
    const response = await makeRequest(`${CONFIG.MAIN_APP_URL}/api/ocr/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });
    
    // We expect a 400 error for missing storageKey, which means endpoint is working
    if (response.status === 400) {
      logSuccess('OCR process endpoint is accessible');
      logInfo('Endpoint responds correctly to invalid requests');
      return true;
    } else {
      logError(`Unexpected response: ${response.status} ${JSON.stringify(response.data)}`);
      return false;
    }
  } catch (error) {
    logError(`Cannot test OCR process endpoint: ${error.message}`);
    return false;
  }
}

// Test 6: Environment Variables Check
async function testEnvironmentVariables() {
  logStep(6, 'Checking Environment Variables Configuration');
  
  const requiredVars = [
    'RENDER_OCR_URL',
    'RENDER_OCR_TOKEN',
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET'
  ];
  
  let allConfigured = true;
  
  logInfo('Required environment variables:');
  requiredVars.forEach(varName => {
    const value = process.env[varName];
    if (value) {
      logSuccess(`${varName}: Configured`);
    } else {
      logError(`${varName}: Not configured`);
      allConfigured = false;
    }
  });
  
  return allConfigured;
}

// Main test function
async function runHealthTests() {
  log('🔍 OCR System Health Test - No Files Required', 'bright');
  log('=' .repeat(60), 'cyan');
  
  const results = {
    renderHealth: false,
    renderBasic: false,
    mainAppConfig: false,
    askAIUpload: false,
    ocrProcess: false,
    environment: false
  };
  
  // Run all tests
  results.renderHealth = await testRenderServiceHealth();
  results.renderBasic = await testRenderServiceBasic();
  results.mainAppConfig = await testMainAppOCRConfig();
  results.askAIUpload = await testMainAppAskAIUpload();
  results.ocrProcess = await testOCRProcessEndpoint();
  results.environment = await testEnvironmentVariables();
  
  // Summary
  log('\n📊 Health Test Results Summary', 'bright');
  log('=' .repeat(60), 'cyan');
  
  const testNames = {
    renderHealth: 'Render Service Health Check',
    renderBasic: 'Render Service Basic Endpoint',
    mainAppConfig: 'Main App OCR Configuration',
    askAIUpload: 'Ask AI Upload Endpoint',
    ocrProcess: 'OCR Process Endpoint',
    environment: 'Environment Variables'
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
  
  // Recommendations
  if (!results.renderHealth || !results.renderBasic) {
    log('\n💡 Render Service Issues:', 'yellow');
    log('1. Check if Render service is deployed and running', 'blue');
    log('2. Verify RENDER_OCR_URL is correct', 'blue');
    log('3. Check Render service logs for errors', 'blue');
  }
  
  if (!results.mainAppConfig) {
    log('\n💡 Main App Configuration Issues:', 'yellow');
    log('1. Check RENDER_OCR_URL and RENDER_OCR_TOKEN in Vercel', 'blue');
    log('2. Verify environment variables are set correctly', 'blue');
  }
  
  if (!results.environment) {
    log('\n💡 Environment Variable Issues:', 'yellow');
    log('1. Set all required environment variables in Vercel', 'blue');
    log('2. Redeploy the application after updating variables', 'blue');
  }
  
  if (passed === total) {
    log('\n🎉 All health checks passed! Your OCR system is ready for testing.', 'green');
    log('You can now test with real files through the Ask AI interface.', 'green');
  } else {
    log('\n⚠️  Some health checks failed. Please fix the issues before testing.', 'yellow');
  }
  
  return passed === total;
}

// Main execution
if (require.main === module) {
  runHealthTests().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    logError(`Health test execution failed: ${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  testRenderServiceHealth,
  testRenderServiceBasic,
  testMainAppOCRConfig,
  testMainAppAskAIUpload,
  testOCRProcessEndpoint,
  testEnvironmentVariables,
  runHealthTests
};
