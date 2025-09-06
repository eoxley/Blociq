#!/usr/bin/env node

/**
 * Microsoft OAuth Configuration Diagnostic Script
 * Checks if the correct App ID is being used in production
 */

const https = require('https');

// Configuration
const CONFIG = {
  // Your production URLs
  MAIN_APP_URL: process.env.MAIN_APP_URL || 'https://www.blociq.co.uk',
  
  // Expected App IDs
  CORRECT_APP_ID: '03d6ee20-cbe3-4d98-867c-084b0419fd96',
  WRONG_APP_ID: '4ab4eae8-71e3-462b-ab41-a754b48d8839',
  
  // Test endpoints
  ENDPOINTS: [
    '/api/auth/outlook',
    '/api/connect-outlook',
    '/api/outlook/status',
    '/api/outlook/callback'
  ]
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
function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, (res) => {
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
  });
}

// Test function to check OAuth URL generation
async function testOAuthUrlGeneration() {
  logStep(1, 'Testing OAuth URL Generation');
  
  try {
    const response = await makeRequest(`${CONFIG.MAIN_APP_URL}/api/auth/outlook`);
    
    if (response.status === 200 && response.data.authUrl) {
      const authUrl = response.data.authUrl;
      logInfo(`Generated OAuth URL: ${authUrl}`);
      
      // Check if URL contains the correct App ID
      if (authUrl.includes(CONFIG.CORRECT_APP_ID)) {
        logSuccess('OAuth URL contains correct App ID');
        return true;
      } else if (authUrl.includes(CONFIG.WRONG_APP_ID)) {
        logError('OAuth URL contains WRONG App ID - environment variables not updated');
        return false;
      } else {
        logWarning('OAuth URL does not contain expected App ID');
        logInfo(`URL contains: ${authUrl.match(/client_id=([^&]+)/)?.[1] || 'No client_id found'}`);
        return false;
      }
    } else {
      logError(`OAuth URL generation failed: ${response.status} ${JSON.stringify(response.data)}`);
      return false;
    }
  } catch (error) {
    logError(`Cannot test OAuth URL generation: ${error.message}`);
    return false;
  }
}

// Test function to check environment variable configuration
async function testEnvironmentConfiguration() {
  logStep(2, 'Testing Environment Configuration');
  
  try {
    const response = await makeRequest(`${CONFIG.MAIN_APP_URL}/api/render-ocr-check`);
    
    if (response.status === 200) {
      logInfo('Environment check endpoint accessible');
      
      // Try to get more detailed environment info
      const endpoints = [
        '/api/outlook/status',
        '/api/connect-outlook'
      ];
      
      for (const endpoint of endpoints) {
        try {
          const epResponse = await makeRequest(`${CONFIG.MAIN_APP_URL}${endpoint}`);
          logInfo(`${endpoint}: ${epResponse.status} ${epResponse.status === 200 ? 'OK' : 'Error'}`);
        } catch (e) {
          logWarning(`${endpoint}: Not accessible`);
        }
      }
      
      return true;
    } else {
      logError(`Environment check failed: ${response.status}`);
      return false;
    }
  } catch (error) {
    logError(`Cannot test environment configuration: ${error.message}`);
    return false;
  }
}

// Test function to check Microsoft Graph API calls
async function testMicrosoftGraphCalls() {
  logStep(3, 'Testing Microsoft Graph API Calls');
  
  try {
    // Test the outlook status endpoint which should make Graph API calls
    const response = await makeRequest(`${CONFIG.MAIN_APP_URL}/api/outlook/status`);
    
    if (response.status === 200) {
      logInfo('Outlook status endpoint accessible');
      
      if (response.data.connected) {
        logSuccess('Outlook is connected and working');
        return true;
      } else {
        logWarning('Outlook not connected - this is expected if user hasn\'t authenticated');
        return true; // This is not an error, just means user needs to connect
      }
    } else {
      logError(`Outlook status check failed: ${response.status} ${JSON.stringify(response.data)}`);
      return false;
    }
  } catch (error) {
    logError(`Cannot test Microsoft Graph calls: ${error.message}`);
    return false;
  }
}

// Test function to check for hardcoded App IDs in responses
async function testForHardcodedAppIds() {
  logStep(4, 'Checking for Hardcoded App IDs in Responses');
  
  const testEndpoints = [
    '/api/auth/outlook',
    '/api/connect-outlook'
  ];
  
  let foundIssues = false;
  
  for (const endpoint of testEndpoints) {
    try {
      const response = await makeRequest(`${CONFIG.MAIN_APP_URL}${endpoint}`);
      
      if (response.status === 200) {
        const responseText = JSON.stringify(response.data);
        
        if (responseText.includes(CONFIG.WRONG_APP_ID)) {
          logError(`${endpoint}: Contains wrong App ID ${CONFIG.WRONG_APP_ID}`);
          foundIssues = true;
        } else if (responseText.includes(CONFIG.CORRECT_APP_ID)) {
          logSuccess(`${endpoint}: Contains correct App ID`);
        } else {
          logInfo(`${endpoint}: No App ID found in response`);
        }
      } else {
        logWarning(`${endpoint}: ${response.status} - ${JSON.stringify(response.data)}`);
      }
    } catch (error) {
      logWarning(`${endpoint}: ${error.message}`);
    }
  }
  
  return !foundIssues;
}

// Main diagnostic function
async function runDiagnostics() {
  log('🔍 Microsoft OAuth Configuration Diagnostics', 'bright');
  log('=' .repeat(60), 'cyan');
  
  const results = {
    oauthUrl: false,
    environment: false,
    graphCalls: false,
    hardcodedIds: false
  };
  
  // Run all tests
  results.oauthUrl = await testOAuthUrlGeneration();
  results.environment = await testEnvironmentConfiguration();
  results.graphCalls = await testMicrosoftGraphCalls();
  results.hardcodedIds = await testForHardcodedAppIds();
  
  // Summary
  log('\n📊 Diagnostic Results Summary', 'bright');
  log('=' .repeat(60), 'cyan');
  
  const testNames = {
    oauthUrl: 'OAuth URL Generation',
    environment: 'Environment Configuration',
    graphCalls: 'Microsoft Graph API Calls',
    hardcodedIds: 'Hardcoded App ID Check'
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
  log('\n💡 Recommendations:', 'bright');
  
  if (!results.oauthUrl) {
    log('1. Update environment variables in Vercel dashboard:', 'yellow');
    log('   - MICROSOFT_CLIENT_ID=03d6ee20-cbe3-4d98-867c-084b0419fd96', 'blue');
    log('   - OUTLOOK_CLIENT_ID=03d6ee20-cbe3-4d98-867c-084b0419fd96', 'blue');
    log('   - NEXT_PUBLIC_MICROSOFT_CLIENT_ID=03d6ee20-cbe3-4d98-867c-084b0419fd96', 'blue');
  }
  
  if (!results.environment) {
    log('2. Check that all required environment variables are set:', 'yellow');
    log('   - MICROSOFT_CLIENT_ID', 'blue');
    log('   - MICROSOFT_CLIENT_SECRET', 'blue');
    log('   - MICROSOFT_REDIRECT_URI', 'blue');
    log('   - AZURE_TENANT_ID', 'blue');
  }
  
  if (!results.graphCalls) {
    log('3. Verify Microsoft Graph API permissions are configured:', 'yellow');
    log('   - Check Azure App Registration has correct permissions', 'blue');
    log('   - Ensure client secret is valid and not expired', 'blue');
  }
  
  if (results.hardcodedIds) {
    log('4. All App IDs are correctly configured!', 'green');
  }
  
  log('\n🚀 Next Steps:', 'bright');
  log('1. Update environment variables in Vercel', 'cyan');
  log('2. Redeploy the application', 'cyan');
  log('3. Test the OAuth flow again', 'cyan');
  log('4. Check the property events widget', 'cyan');
  
  return passed === total;
}

// Main execution
if (require.main === module) {
  runDiagnostics().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    logError(`Diagnostic execution failed: ${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  testOAuthUrlGeneration,
  testEnvironmentConfiguration,
  testMicrosoftGraphCalls,
  testForHardcodedAppIds,
  runDiagnostics
};
