#!/usr/bin/env node

/**
 * COMPREHENSIVE SYSTEM DEBUG TEST
 * 
 * Tests the comprehensive system directly to see what's happening
 */

const https = require('https');
const http = require('http');

// Configuration
const CONFIG = {
  MAIN_APP_URL: process.env.MAIN_APP_URL || 'http://localhost:3000'
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

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

// Helper function to make HTTP/HTTPS requests
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    };

    const client = isHttps ? https : http;
    const req = client.request(requestOptions, (res) => {
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

// Test comprehensive system debug
async function testComprehensiveDebug() {
  log('🔍 COMPREHENSIVE SYSTEM DEBUG TEST', 'bright');
  log('============================================================', 'bright');
  log('Testing the comprehensive system to see what\'s happening', 'bright');
  log('', 'reset');

  const testQueries = [
    // Test 1: Simple building query
    "Tell me about Ashwood House",
    
    // Test 2: Simple unit query
    "Who is the leaseholder of Flat 1 at Ashwood House?",
    
    // Test 3: Simple general query
    "What buildings do we have?",
    
    // Test 4: Test with debug info
    "Show me all units in Ashwood House"
  ];

  for (let i = 0; i < testQueries.length; i++) {
    const query = testQueries[i];
    
    logStep(i + 1, `Testing: "${query}"`);
    
    try {
      const response = await makeRequest(`${CONFIG.MAIN_APP_URL}/api/ask-ai`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt: query,
          building_id: null,
          contextType: 'general',
          tone: 'Professional'
        })
      });

      logInfo(`Status: ${response.status}`);
      
      if (response.status === 200) {
        const result = response.data;
        logInfo(`Response: ${JSON.stringify(result, null, 2)}`);
        
        // Check if it's using the comprehensive system
        if (result.metadata && result.metadata.comprehensive) {
          logSuccess('Using comprehensive system!');
        } else {
          logWarning('Not using comprehensive system');
        }
        
        // Check if data was found
        const hasData = result.result && 
                       !result.result.toLowerCase().includes('not found') && 
                       !result.result.toLowerCase().includes('no data') &&
                       !result.result.toLowerCase().includes('building information not found');
        
        if (hasData) {
          logSuccess('Data found!');
        } else {
          logWarning('No data found');
        }
      } else {
        logError(`HTTP ${response.status}: ${JSON.stringify(response.data)}`);
      }
    } catch (error) {
      logError(`Error: ${error.message}`);
    }
  }

  log('\n📊 COMPREHENSIVE SYSTEM DEBUG RESULTS', 'bright');
  log('============================================================', 'bright');
  log('This test shows us:', 'reset');
  log('1. Whether the comprehensive system is being used', 'reset');
  log('2. Whether there are any errors in the comprehensive system', 'reset');
  log('3. Whether the database queries are working', 'reset');
  log('4. Whether the issue is in the comprehensive system or elsewhere', 'reset');
}

// Run the test
if (require.main === module) {
  testComprehensiveDebug()
    .then(() => {
      log('\n✅ Comprehensive system debug test completed', 'green');
      process.exit(0);
    })
    .catch((error) => {
      logError(`Test failed: ${error.message}`);
      process.exit(1);
    });
}

module.exports = { testComprehensiveDebug };
