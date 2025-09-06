#!/usr/bin/env node

/**
 * API DATABASE ACCESS TEST
 * 
 * Tests database access through the API endpoints to see what data exists
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

// Test database access through API
async function testAPIDatabaseAccess() {
  log('🔍 API DATABASE ACCESS TEST', 'bright');
  log('============================================================', 'bright');
  log('Testing database access through API endpoints', 'bright');
  log('', 'reset');

  const testQueries = [
    // Direct database queries
    "What buildings are in the database?",
    "Show me all buildings",
    "List all properties",
    "What buildings do we manage?",
    "Show me the building list",
    
    // Specific building queries
    "Tell me about Ashwood House",
    "What is the address of Ashwood House?",
    "Show me details for Ashwood House",
    "Information about Ashwood House building",
    
    // Unit queries
    "What units are in Ashwood House?",
    "List all units in Ashwood House",
    "How many units does Ashwood House have?",
    "Show me units in Ashwood House",
    
    // Leaseholder queries
    "Who lives in unit 8 at Ashwood House?",
    "Who is the leaseholder of unit 8 at Ashwood House?",
    "Show me leaseholder for unit 8 Ashwood House",
    "Who owns unit 8 at Ashwood House?",
    
    // General data queries
    "Show me all leaseholders",
    "List all leaseholders in the database",
    "Who are the leaseholders?",
    "Show me leaseholder information",
    
    // Building search queries
    "Find buildings with 'house' in the name",
    "Search for buildings containing 'ashwood'",
    "Look for buildings with 'court' in the name",
    "Find all buildings"
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
  log('\n📊 API DATABASE ACCESS RESULTS', 'bright');
  log('============================================================', 'bright');
  log(`Total queries tested: ${totalQueries}`, 'reset');
  log(`Successful queries: ${successfulQueries}`, 'green');
  log(`Queries with data: ${foundData ? 'Yes' : 'No'}`, foundData ? 'green' : 'red');

  if (foundData) {
    logSuccess('Database contains data and is accessible through API!');
  } else {
    logWarning('No data found in database or queries are not working correctly.');
    logInfo('This could mean:');
    logInfo('1. The database is empty');
    logInfo('2. The query logic is not finding the data');
    logInfo('3. The data exists but in a different format than expected');
    logInfo('4. There are permission issues with the database access');
  }

  return { foundData, successfulQueries, totalQueries };
}

// Run the test
if (require.main === module) {
  testAPIDatabaseAccess()
    .then((results) => {
      if (results.foundData) {
        log('\n✅ Database access test completed - Data found!', 'green');
        process.exit(0);
      } else {
        log('\n⚠️  Database access test completed - No data found', 'yellow');
        process.exit(1);
      }
    })
    .catch((error) => {
      logError(`Test failed: ${error.message}`);
      process.exit(1);
    });
}

module.exports = { testAPIDatabaseAccess };
