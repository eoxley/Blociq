#!/usr/bin/env node

/**
 * TEST PARSING LOGIC
 * 
 * Tests the parsing logic directly to see if it's working
 */

// Load environment variables
require('dotenv').config({ path: '.env.local' });

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

// Test parsing logic
async function testParsingLogic() {
  log('🔍 TESTING PARSING LOGIC', 'bright');
  log('============================================================', 'bright');
  log('Testing the parsing logic directly', 'bright');
  log('', 'reset');

  // Import the parsing functions
  try {
    const { ComprehensiveQueryParser } = await import('./lib/ai/comprehensiveUnifiedSystem.ts');
    
    const testQueries = [
      "Tell me about Ashwood House building",
      "What is the address of Ashwood House building",
      "Show me information about Ashwood House building",
      "Ashwood House building details",
      "How many units does Ashwood House have?",
      "List all units in Ashwood House",
      "Show me all units in Ashwood House",
      "What units are in Ashwood House?",
      "Who is the leaseholder of Flat 1 at Ashwood House?",
      "Who is the leaseholder of Flat 2 at Ashwood House?",
      "Who is the leaseholder of unit 8 at Ashwood House?",
      "Who is the leaseholder of 8 at Ashwood House?"
    ];

    for (let i = 0; i < testQueries.length; i++) {
      const query = testQueries[i];
      
      logStep(i + 1, `Testing: "${query}"`);
      
      // Test building parsing
      const buildingResult = ComprehensiveQueryParser.parseBuildingQuery(query);
      logInfo(`Building parsing result: ${JSON.stringify(buildingResult)}`);
      
      // Test leaseholder parsing
      const leaseholderResult = ComprehensiveQueryParser.parseLeaseholderQuery(query);
      logInfo(`Leaseholder parsing result: ${JSON.stringify(leaseholderResult)}`);
      
      if (buildingResult.building || leaseholderResult.unit) {
        logSuccess('Parsing found data!');
      } else {
        logWarning('Parsing found no data');
      }
    }

  } catch (error) {
    logError(`Error importing parsing functions: ${error.message}`);
  }

  log('\n📊 PARSING LOGIC TEST RESULTS', 'bright');
  log('============================================================', 'bright');
  log('This test shows us:', 'reset');
  log('1. Whether the parsing logic is working correctly', 'reset');
  log('2. Whether building names are being extracted', 'reset');
  log('3. Whether unit numbers are being extracted', 'reset');
  log('4. Whether the issue is in parsing or database queries', 'reset');
}

// Run the test
if (require.main === module) {
  testParsingLogic()
    .then(() => {
      log('\n✅ Parsing logic test completed', 'green');
      process.exit(0);
    })
    .catch((error) => {
      logError(`Test failed: ${error.message}`);
      process.exit(1);
    });
}

module.exports = { testParsingLogic };
