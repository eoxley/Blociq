#!/usr/bin/env node

/**
 * Debug Unified AI System
 * 
 * This script tests the unified AI system directly to debug why
 * the systems are not returning identical responses.
 */

const https = require('https');

// Configuration
const CONFIG = {
  MAIN_APP_URL: process.env.MAIN_APP_URL || 'https://www.blociq.co.uk',
  TEST_QUERY: "Who is the leaseholder of unit 8 at Ashwood House?"
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
    
    req.setTimeout(15000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

// Test Ask Bloc AI endpoint with detailed logging
async function testAskBlocAI(query) {
  try {
    logStep('1', `Testing Ask Bloc AI: "${query}"`);
    
    const response = await makeRequest(`${CONFIG.MAIN_APP_URL}/api/ask-ai`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt: query,
        context_type: 'general',
        is_public: true
      })
    });
    
    logInfo(`Status: ${response.status}`);
    logInfo(`Response keys: ${Object.keys(response.data).join(', ')}`);
    
    if (response.data.metadata) {
      logInfo(`Metadata: ${JSON.stringify(response.data.metadata, null, 2)}`);
    }
    
    if (response.data.context) {
      logInfo(`Context: ${JSON.stringify(response.data.context, null, 2)}`);
    }
    
    if (response.status === 200) {
      return {
        success: true,
        response: response.data.response || response.data.result || response.data.answer,
        metadata: response.data.metadata || response.data.context,
        source: 'Ask Bloc AI'
      };
    } else {
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.data.error || 'Unknown error'}`,
        source: 'Ask Bloc AI'
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error.message,
      source: 'Ask Bloc AI'
    };
  }
}

// Test Outlook Add-in AI endpoint with detailed logging
async function testOutlookAddinAI(query) {
  try {
    logStep('2', `Testing Outlook Add-in AI: "${query}"`);
    
    // Create a mock token for testing
    const mockToken = Buffer.from(JSON.stringify({
      context: 'outlook_email_auth',
      user_id: 'test-user-id',
      email: 'test@blociq.co.uk',
      timestamp: Date.now()
    })).toString('base64');
    
    const response = await makeRequest(`${CONFIG.MAIN_APP_URL}/api/outlook-addin/ask-ai`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt: query,
        token: mockToken,
        is_outlook_addin: true
      })
    });
    
    logInfo(`Status: ${response.status}`);
    logInfo(`Response keys: ${Object.keys(response.data).join(', ')}`);
    
    if (response.data.metadata) {
      logInfo(`Metadata: ${JSON.stringify(response.data.metadata, null, 2)}`);
    }
    
    if (response.status === 200) {
      return {
        success: true,
        response: response.data.response,
        metadata: response.data.metadata,
        source: 'Outlook Add-in AI'
      };
    } else {
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.data.error || 'Unknown error'}`,
        source: 'Outlook Add-in AI'
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error.message,
      source: 'Outlook Add-in AI'
    };
  }
}

// Main debug function
async function debugUnifiedSystem() {
  log('🔍 Unified AI System Debug', 'bright');
  log('=' .repeat(60), 'cyan');
  log('Debugging why the systems are not returning identical responses', 'blue');
  
  const askBlocResult = await testAskBlocAI(CONFIG.TEST_QUERY);
  const outlookResult = await testOutlookAddinAI(CONFIG.TEST_QUERY);
  
  log('\n📊 Results Comparison', 'bright');
  log('=' .repeat(60), 'cyan');
  
  logInfo(`Ask Bloc AI Success: ${askBlocResult.success}`);
  logInfo(`Outlook AI Success: ${outlookResult.success}`);
  
  if (askBlocResult.success && outlookResult.success) {
    logInfo(`Ask Bloc Response: ${askBlocResult.response.substring(0, 200)}...`);
    logInfo(`Outlook Response: ${outlookResult.response.substring(0, 200)}...`);
    
    // Check if responses are identical
    if (askBlocResult.response === outlookResult.response) {
      logSuccess('Responses are IDENTICAL!');
    } else {
      logError('Responses are DIFFERENT!');
      
      // Check metadata for clues
      if (askBlocResult.metadata && outlookResult.metadata) {
        logInfo('Ask Bloc Metadata:');
        logInfo(JSON.stringify(askBlocResult.metadata, null, 2));
        logInfo('Outlook Metadata:');
        logInfo(JSON.stringify(outlookResult.metadata, null, 2));
      }
    }
  } else {
    logError('One or both requests failed');
    if (!askBlocResult.success) {
      logError(`Ask Bloc Error: ${askBlocResult.error}`);
    }
    if (!outlookResult.success) {
      logError(`Outlook Error: ${outlookResult.error}`);
    }
  }
}

// Main execution
if (require.main === module) {
  debugUnifiedSystem().catch(error => {
    logError(`Debug execution failed: ${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  testAskBlocAI,
  testOutlookAddinAI,
  debugUnifiedSystem
};
