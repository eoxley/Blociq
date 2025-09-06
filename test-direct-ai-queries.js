#!/usr/bin/env node

/**
 * DIRECT AI QUERIES TEST
 * 
 * Tests the AI system with very specific queries to debug the issue
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

// Test direct AI queries
async function testDirectAIQueries() {
  log('🔍 DIRECT AI QUERIES TEST', 'bright');
  log('============================================================', 'bright');
  log('Testing the AI system with very specific queries to debug the issue', 'bright');
  log('', 'reset');

  const testQueries = [
    // Test 1: Very specific building queries
    "Tell me about Ashwood House building",
    "What is the address of Ashwood House building",
    "Show me information about Ashwood House building",
    "Ashwood House building details",
    
    // Test 2: Very specific unit queries
    "Who is the leaseholder of Flat 1 at Ashwood House?",
    "Who is the leaseholder of Flat 2 at Ashwood House?",
    "Who is the leaseholder of Flat 3 at Ashwood House?",
    "Who is the leaseholder of Flat 4 at Ashwood House?",
    "Who is the leaseholder of Flat 5 at Ashwood House?",
    
    // Test 3: Test with exact unit numbers from database
    "Who is the leaseholder of Flat 1 at Ashwood House?",
    "Who is the leaseholder of Flat 10 at Ashwood House?",
    "Who is the leaseholder of Flat 11 at Ashwood House?",
    
    // Test 4: Test building queries
    "How many units does Ashwood House have?",
    "List all units in Ashwood House",
    "Show me all units in Ashwood House",
    "What units are in Ashwood House?",
    
    // Test 5: Test general queries
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
        logInfo(`Response: ${result.substring(0, 300)}${result.length > 300 ? '...' : ''}`);
        
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
                       !result.toLowerCase().includes('i cannot access') &&
                       !result.toLowerCase().includes('unable to display') &&
                       !result.toLowerCase().includes('i\'m unable to');
        
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
  log('\n📊 DIRECT AI QUERIES TEST RESULTS', 'bright');
  log('============================================================', 'bright');
  log(`Total queries tested: ${totalQueries}`, 'reset');
  log(`Successful queries: ${successfulQueries}`, 'green');
  log(`Queries with data: ${foundData ? 'Yes' : 'No'}`, foundData ? 'green' : 'red');

  if (foundData) {
    logSuccess('AI system is working and finding data!');
  } else {
    logWarning('AI system is not finding data - there may be an issue with:');
    logInfo('1. Query logic in the comprehensive unified system');
    logInfo('2. Building name matching');
    logInfo('3. Unit number matching');
    logInfo('4. Leaseholder data linking');
  }

  return { foundData, successfulQueries, totalQueries };
}

// Run the test
if (require.main === module) {
  testDirectAIQueries()
    .then((results) => {
      if (results.foundData) {
        log('\n✅ Direct AI queries test completed - Data found!', 'green');
        process.exit(0);
      } else {
        log('\n⚠️  Direct AI queries test completed - No data found', 'yellow');
        process.exit(1);
      }
    })
    .catch((error) => {
      logError(`Test failed: ${error.message}`);
      process.exit(1);
    });
}

module.exports = { testDirectAIQueries };
