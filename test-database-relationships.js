#!/usr/bin/env node

/**
 * DATABASE RELATIONSHIPS TEST
 * 
 * Tests the actual database relationships between buildings, units, and leaseholders
 * to verify if building IDs match and data exists
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

// Test database relationships
async function testDatabaseRelationships() {
  log('🔍 DATABASE RELATIONSHIPS TEST', 'bright');
  log('============================================================', 'bright');
  log('Testing relationships between buildings, units, and leaseholders', 'bright');
  log('', 'reset');

  const testQueries = [
    // Test 1: Check if we can find any buildings
    "What buildings are in the database?",
    "Show me all building names",
    "List all properties",
    
    // Test 2: Check if we can find units for any building
    "What units are in any building?",
    "Show me units from any property",
    "List all units in the database",
    
    // Test 3: Check if we can find leaseholders
    "Who are the leaseholders?",
    "Show me leaseholder names",
    "List all people in the database",
    
    // Test 4: Test specific building queries
    "Tell me about any building",
    "What is the address of any building?",
    "How many units does any building have?",
    
    // Test 5: Test unit queries
    "Who lives in any unit?",
    "Show me any unit information",
    "What units have leaseholders?",
    
    // Test 6: Test relationship queries
    "Show me buildings with their units",
    "Show me units with their leaseholders",
    "Show me the relationship between buildings and leaseholders",
    
    // Test 7: Test data counts
    "How many buildings are there?",
    "How many units are there?",
    "How many leaseholders are there?",
    
    // Test 8: Test specific data queries
    "Show me building IDs",
    "Show me unit IDs",
    "Show me leaseholder IDs",
    
    // Test 9: Test foreign key relationships
    "Are building IDs consistent?",
    "Do units reference correct buildings?",
    "Do leaseholders reference correct units?"
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
                       !result.toLowerCase().includes('i cannot access') &&
                       !result.toLowerCase().includes('unable to display') &&
                       !result.toLowerCase().includes('i\'m unable to');
        
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
          
          if (result.includes('building ID') || result.includes('unit ID') || result.includes('leaseholder ID')) {
            dataClues.push(`Found ID reference: ${result.substring(0, 100)}`);
            logInfo(`Found ID reference: ${result.substring(0, 100)}`);
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
  log('\n📊 DATABASE RELATIONSHIPS TEST RESULTS', 'bright');
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

  log('\n🔍 ANALYSIS:', 'bright');
  log('Based on the test results, we can determine:', 'reset');
  log('1. Whether buildings exist in the database', 'reset');
  log('2. Whether units exist and are linked to buildings', 'reset');
  log('3. Whether leaseholders exist and are linked to units', 'reset');
  log('4. Whether the foreign key relationships are working', 'reset');
  log('5. Whether building IDs match between tables', 'reset');

  if (foundData) {
    logSuccess('Database contains data and relationships are working!');
  } else {
    logWarning('No data found - there may be issues with:');
    logInfo('1. Database is empty');
    logInfo('2. Foreign key relationships are broken');
    logInfo('3. Building IDs don\'t match between tables');
    logInfo('4. Query logic is not working correctly');
  }

  return { foundData, successfulQueries, totalQueries, dataClues };
}

// Run the test
if (require.main === module) {
  testDatabaseRelationships()
    .then((results) => {
      if (results.foundData) {
        log('\n✅ Database relationships test completed - Data found!', 'green');
        process.exit(0);
      } else {
        log('\n⚠️  Database relationships test completed - No data found', 'yellow');
        process.exit(1);
      }
    })
    .catch((error) => {
      logError(`Test failed: ${error.message}`);
      process.exit(1);
    });
}

module.exports = { testDatabaseRelationships };
