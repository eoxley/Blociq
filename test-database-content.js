#!/usr/bin/env node

/**
 * DATABASE CONTENT TEST
 * 
 * Tests what data actually exists in the Supabase database
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

// Test database content via Ask Bloc AI
async function testDatabaseContent() {
  log('🔍 DATABASE CONTENT TEST', 'bright');
  log('============================================================', 'bright');
  log('Testing what data actually exists in the Supabase database', 'bright');
  log('', 'reset');

  const testQueries = [
    "Show me all buildings in the database",
    "List all units in the database", 
    "Show me all leaseholders",
    "What buildings do we have?",
    "List all properties",
    "Show me the building data",
    "What units are available?",
    "Who are the leaseholders?"
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

      if (response.status === 200) {
        const result = response.data.response || response.data.result || 'No response';
        logInfo(`Response: ${result.substring(0, 200)}${result.length > 200 ? '...' : ''}`);
        
        // Check if response indicates no data
        if (result.toLowerCase().includes('not found') || 
            result.toLowerCase().includes('no data') ||
            result.toLowerCase().includes('no buildings') ||
            result.toLowerCase().includes('no units') ||
            result.toLowerCase().includes('no leaseholders')) {
          logWarning('No data found for this query');
        } else {
          logSuccess('Data found!');
        }
      } else {
        logError(`HTTP ${response.status}: ${response.data.error || 'Unknown error'}`);
      }
    } catch (error) {
      logError(`Error: ${error.message}`);
    }
  }

  // Test specific building queries
  logStep(9, 'Testing specific building queries');
  
  const buildingQueries = [
    "Who is the leaseholder of unit 8 at Ashwood House?",
    "How many units does Ashwood House have?",
    "Show me information about Ashwood House",
    "What is the address of Ashwood House?",
    "List all units in Ashwood House"
  ];

  for (const query of buildingQueries) {
    logInfo(`Testing: "${query}"`);
    
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
        logInfo(`Response: ${result.substring(0, 150)}${result.length > 150 ? '...' : ''}`);
      } else {
        logError(`HTTP ${response.status}: ${response.data.error || 'Unknown error'}`);
      }
    } catch (error) {
      logError(`Error: ${error.message}`);
    }
  }

  log('\n📊 DATABASE CONTENT ANALYSIS', 'bright');
  log('============================================================', 'bright');
  log('Based on the responses above, we can determine:', 'reset');
  log('1. Whether the database contains any data', 'reset');
  log('2. What the data structure looks like', 'reset');
  log('3. Whether our queries are working correctly', 'reset');
  log('4. What needs to be fixed in the query logic', 'reset');
}

// Run the test
if (require.main === module) {
  testDatabaseContent()
    .then(() => {
      log('\n✅ Database content test completed', 'green');
      process.exit(0);
    })
    .catch((error) => {
      logError(`Test failed: ${error.message}`);
      process.exit(1);
    });
}

module.exports = { testDatabaseContent };
