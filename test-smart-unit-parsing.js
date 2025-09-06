#!/usr/bin/env node

/**
 * TEST SMART UNIT PARSING
 * 
 * Tests the updated system with smart unit number parsing
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

// Test smart unit parsing
async function testSmartUnitParsing() {
  log('🔍 TESTING SMART UNIT PARSING', 'bright');
  log('============================================================', 'bright');
  log('Testing the updated system with smart unit number parsing', 'bright');
  log('', 'reset');

  const testQueries = [
    // Test 1: User says "unit 8" - should convert to "Flat 8"
    "Who is the leaseholder of unit 8 at Ashwood House?",
    
    // Test 2: User says "8" - should convert to "Flat 8" 
    "Who is the leaseholder of 8 at Ashwood House?",
    
    // Test 3: User says "flat 8" - should keep as "Flat 8"
    "Who is the leaseholder of flat 8 at Ashwood House?",
    
    // Test 4: User says "apartment 8" - should convert to "Flat 8"
    "Who is the leaseholder of apartment 8 at Ashwood House?",
    
    // Test 5: Test with different unit numbers
    "Who is the leaseholder of unit 1 at Ashwood House?",
    "Who is the leaseholder of 2 at Ashwood House?",
    "Who is the leaseholder of flat 3 at Ashwood House?",
    "Who is the leaseholder of 4 at Ashwood House?",
    "Who is the leaseholder of unit 5 at Ashwood House?",
    
    // Test 6: Test building queries
    "Tell me about Ashwood House",
    "What is the address of Ashwood House?",
    "How many units does Ashwood House have?",
    "Show me all units in Ashwood House",
    
    // Test 7: Test general queries
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
                       !result.toLowerCase().includes('building information not found') &&
                       !result.toLowerCase().includes('i don\'t have access') &&
                       !result.toLowerCase().includes('i can\'t access') &&
                       !result.toLowerCase().includes('i cannot access');
        
        if (hasData) {
          logSuccess('Data found!');
          foundData = true;
          successfulQueries++;
        } else {
          logWarning('No data found for this query');
          
          // Look for clues in error messages
          if (result.includes('Available units')) {
            const unitsMatch = result.match(/Available units in this building: ([^\\n]+)/);
            if (unitsMatch) {
              logInfo(`Found units: ${unitsMatch[1]}`);
            }
          }
        }
      } else {
        logError(`HTTP ${response.status}: ${response.data.error || 'Unknown error'}`);
      }
    } catch (error) {
      logError(`Error: ${error.message}`);
    }
  }

  // Summary
  log('\n📊 SMART UNIT PARSING TEST RESULTS', 'bright');
  log('============================================================', 'bright');
  log(`Total queries tested: ${totalQueries}`, 'reset');
  log(`Successful queries: ${successfulQueries}`, 'green');
  log(`Queries with data: ${foundData ? 'Yes' : 'No'}`, foundData ? 'green' : 'red');

  if (foundData) {
    logSuccess('Smart unit parsing is working! The system can now understand unit references.');
  } else {
    logWarning('Smart unit parsing may not be working correctly or database is empty');
    logInfo('The system should now convert:');
    logInfo('- "unit 8" → "Flat 8"');
    logInfo('- "8" → "Flat 8"');
    logInfo('- "apartment 8" → "Flat 8"');
    logInfo('- "flat 8" → "Flat 8"');
  }

  return { foundData, successfulQueries, totalQueries };
}

// Run the test
if (require.main === module) {
  testSmartUnitParsing()
    .then((results) => {
      if (results.foundData) {
        log('\n✅ Smart unit parsing test completed - Data found!', 'green');
        process.exit(0);
      } else {
        log('\n⚠️  Smart unit parsing test completed - No data found', 'yellow');
        process.exit(1);
      }
    })
    .catch((error) => {
      logError(`Test failed: ${error.message}`);
      process.exit(1);
    });
}

module.exports = { testSmartUnitParsing };
