#!/usr/bin/env node

/**
 * DATABASE STRUCTURE TEST
 * 
 * Tests what's actually in the database by querying through the API
 * with very specific queries to understand the data structure
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

// Test database structure
async function testDatabaseStructure() {
  log('🔍 DATABASE STRUCTURE TEST', 'bright');
  log('============================================================', 'bright');
  log('Testing what data actually exists in the database', 'bright');
  log('', 'reset');

  const testQueries = [
    // Test 1: Check if we can find any buildings at all
    "What is the name of any building in the database?",
    "Show me one building name",
    "List one property name",
    
    // Test 2: Check if we can find any units at all
    "What units exist in any building?",
    "Show me any unit number",
    "List one unit",
    
    // Test 3: Check if we can find any leaseholders at all
    "Who is any leaseholder in the database?",
    "Show me one leaseholder name",
    "List one person who lives in a unit",
    
    // Test 4: Test specific building variations
    "Is there a building called Ashwood House?",
    "Is there a building with 'ashwood' in the name?",
    "Is there a building with 'house' in the name?",
    
    // Test 5: Test unit variations
    "Are there any units numbered 1?",
    "Are there any units numbered 2?",
    "Are there any units with 'Flat' in the name?",
    
    // Test 6: Test leaseholder variations
    "Are there any leaseholders with names?",
    "Are there any people in the database?",
    "Who are the residents?",
    
    // Test 7: Test general data queries
    "What data is in the database?",
    "What information do we have?",
    "What can you tell me about the data?",
    
    // Test 8: Test error messages for clues
    "Show me all buildings",
    "Show me all units", 
    "Show me all leaseholders",
    "Show me all data"
  ];

  let foundData = false;
  let totalQueries = testQueries.length;
  let successfulQueries = 0;
  let dataClues = [];

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
                       !result.toLowerCase().includes('i cannot access');
        
        if (hasData) {
          logSuccess('Data found!');
          foundData = true;
          successfulQueries++;
          dataClues.push(result);
        } else {
          logWarning('No data found for this query');
          
          // Look for clues in error messages
          if (result.includes('Available units')) {
            const unitsMatch = result.match(/Available units in this building: ([^\\n]+)/);
            if (unitsMatch) {
              dataClues.push(`Found units: ${unitsMatch[1]}`);
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
  log('\n📊 DATABASE STRUCTURE TEST RESULTS', 'bright');
  log('============================================================', 'bright');
  log(`Total queries tested: ${totalQueries}`, 'reset');
  log(`Successful queries: ${successfulQueries}`, 'green');
  log(`Queries with data: ${foundData ? 'Yes' : 'No'}`, foundData ? 'green' : 'red');

  if (dataClues.length > 0) {
    log('\n🔍 DATA CLUES FOUND:', 'bright');
    dataClues.forEach((clue, index) => {
      log(`${index + 1}. ${clue}`, 'blue');
    });
  }

  if (foundData) {
    logSuccess('Database contains data and queries are working correctly!');
  } else {
    logWarning('No data found - the database may be empty or there are query issues');
    logInfo('Possible issues:');
    logInfo('1. Database is empty');
    logInfo('2. Query logic is not working correctly');
    logInfo('3. Data exists but in different format than expected');
    logInfo('4. Permission issues with database access');
  }

  return { foundData, successfulQueries, totalQueries, dataClues };
}

// Run the test
if (require.main === module) {
  testDatabaseStructure()
    .then((results) => {
      if (results.foundData) {
        log('\n✅ Database structure test completed - Data found!', 'green');
        process.exit(0);
      } else {
        log('\n⚠️  Database structure test completed - No data found', 'yellow');
        process.exit(1);
      }
    })
    .catch((error) => {
      logError(`Test failed: ${error.message}`);
      process.exit(1);
    });
}

module.exports = { testDatabaseStructure };
