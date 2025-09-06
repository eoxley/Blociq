#!/usr/bin/env node

/**
 * TEST CORRECT UNIT FORMAT
 * 
 * Tests with the actual unit formats that exist in the database
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

// Test with correct unit formats
async function testCorrectUnitFormats() {
  log('🔍 TESTING CORRECT UNIT FORMATS', 'bright');
  log('============================================================', 'bright');
  log('Testing with the actual unit formats that exist in the database', 'bright');
  log('', 'reset');

  const testQueries = [
    // Test with the actual unit formats that exist
    "Who is the leaseholder of Flat 1 at Ashwood House?",
    "Who is the leaseholder of Flat 2 at Ashwood House?",
    "Who is the leaseholder of Flat 3 at Ashwood House?",
    "Who is the leaseholder of Flat 4 at Ashwood House?",
    "Who is the leaseholder of Flat 5 at Ashwood House?",
    
    // Test building queries
    "Tell me about Ashwood House",
    "What is the address of Ashwood House?",
    "How many units does Ashwood House have?",
    "Show me all units in Ashwood House",
    
    // Test general building queries
    "What buildings do we have?",
    "List all buildings",
    "Show me all properties"
  ];

  let foundData = false;
  let totalQueries = testQueries.length;
  let successfulQueries = 0;

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

      if (response.status === 200) {
        const result = response.data.response || response.data.result || 'No response';
        logInfo(`Response: ${result.substring(0, 200)}${result.length > 200 ? '...' : ''}`);
        
        // Check if response indicates data was found
        const hasData = !result.toLowerCase().includes('not found') && 
                       !result.toLowerCase().includes('no data') &&
                       !result.toLowerCase().includes('no buildings') &&
                       !result.toLowerCase().includes('no units') &&
                       !result.toLowerCase().includes('no leaseholders') &&
                       !result.toLowerCase().includes('building information not found') &&
                       !result.toLowerCase().includes('specified unit in the specified building') &&
                       !result.toLowerCase().includes('no units found for') &&
                       !result.toLowerCase().includes('building information not found');
        
        if (hasData) {
          logSuccess('Data found!');
          foundData = true;
          successfulQueries++;
        } else {
          logWarning('No data found for this query');
        }
      } else {
        logError(`HTTP ${response.status}: ${response.data.error || 'Unknown error'}`);
      }
    } catch (error) {
      logError(`Error: ${error.message}`);
    }
  }

  // Summary
  log('\n📊 CORRECT UNIT FORMAT TEST RESULTS', 'bright');
  log('============================================================', 'bright');
  log(`Total queries tested: ${totalQueries}`, 'reset');
  log(`Successful queries: ${successfulQueries}`, 'green');
  log(`Queries with data: ${foundData ? 'Yes' : 'No'}`, foundData ? 'green' : 'red');

  if (foundData) {
    logSuccess('Database contains data and queries are working correctly!');
    logInfo('The issue was unit number format - the database uses "Flat X" format');
  } else {
    logWarning('Still no data found - there may be other issues');
  }

  return { foundData, successfulQueries, totalQueries };
}

// Run the test
if (require.main === module) {
  testCorrectUnitFormats()
    .then((results) => {
      if (results.foundData) {
        log('\n✅ Correct unit format test completed - Data found!', 'green');
        process.exit(0);
      } else {
        log('\n⚠️  Correct unit format test completed - No data found', 'yellow');
        process.exit(1);
      }
    })
    .catch((error) => {
      logError(`Test failed: ${error.message}`);
      process.exit(1);
    });
}

module.exports = { testCorrectUnitFormats };
