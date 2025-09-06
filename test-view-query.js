#!/usr/bin/env node

/**
 * TEST VIEW QUERY
 * 
 * Tests the vw_units_leaseholders view directly
 */

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

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

// Test view query
async function testViewQuery() {
  log('🔍 TESTING VIEW QUERY', 'bright');
  log('============================================================', 'bright');
  log('Testing the vw_units_leaseholders view directly', 'bright');
  log('', 'reset');

  // Initialize Supabase client
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    // Test 1: Get all data from the view
    logStep(1, 'Getting all data from vw_units_leaseholders view');
    const { data: allData, error: allError } = await supabase
      .from('vw_units_leaseholders')
      .select('*')
      .limit(10);
    
    if (allError) {
      logError(`View query error: ${allError.message}`);
    } else {
      logInfo(`Found ${allData.length} records in view`);
      if (allData.length > 0) {
        logSuccess('View data:');
        allData.forEach((record, index) => {
          log(`  ${index + 1}. ${record.leaseholder_name} - Unit ${record.unit_number} - ${record.building_name}`, 'green');
        });
      } else {
        logWarning('No data found in view');
      }
    }

    // Test 2: Search for specific unit
    logStep(2, 'Searching for Flat 1');
    const { data: flat1Data, error: flat1Error } = await supabase
      .from('vw_units_leaseholders')
      .select('*')
      .eq('unit_number', 'Flat 1');
    
    if (flat1Error) {
      logError(`Flat 1 query error: ${flat1Error.message}`);
    } else {
      logInfo(`Found ${flat1Data.length} records for Flat 1`);
      if (flat1Data.length > 0) {
        logSuccess('Flat 1 data:');
        flat1Data.forEach((record, index) => {
          log(`  ${index + 1}. ${record.leaseholder_name} - Unit ${record.unit_number} - ${record.building_name}`, 'green');
        });
      } else {
        logWarning('No data found for Flat 1');
      }
    }

    // Test 3: Search for Ashwood House
    logStep(3, 'Searching for Ashwood House');
    const { data: ashwoodData, error: ashwoodError } = await supabase
      .from('vw_units_leaseholders')
      .select('*')
      .ilike('building_name', '%ashwood%');
    
    if (ashwoodError) {
      logError(`Ashwood query error: ${ashwoodError.message}`);
    } else {
      logInfo(`Found ${ashwoodData.length} records for Ashwood House`);
      if (ashwoodData.length > 0) {
        logSuccess('Ashwood House data:');
        ashwoodData.forEach((record, index) => {
          log(`  ${index + 1}. ${record.leaseholder_name} - Unit ${record.unit_number} - ${record.building_name}`, 'green');
        });
      } else {
        logWarning('No data found for Ashwood House');
      }
    }

    // Test 4: Search for Flat 1 at Ashwood House
    logStep(4, 'Searching for Flat 1 at Ashwood House');
    const { data: specificData, error: specificError } = await supabase
      .from('vw_units_leaseholders')
      .select('*')
      .eq('unit_number', 'Flat 1')
      .ilike('building_name', '%ashwood%');
    
    if (specificError) {
      logError(`Specific query error: ${specificError.message}`);
    } else {
      logInfo(`Found ${specificData.length} records for Flat 1 at Ashwood House`);
      if (specificData.length > 0) {
        logSuccess('Specific data:');
        specificData.forEach((record, index) => {
          log(`  ${index + 1}. ${record.leaseholder_name} - Unit ${record.unit_number} - ${record.building_name}`, 'green');
        });
      } else {
        logWarning('No data found for Flat 1 at Ashwood House');
      }
    }

  } catch (error) {
    logError(`Test failed: ${error.message}`);
  }

  log('\n📊 VIEW QUERY TEST RESULTS', 'bright');
  log('============================================================', 'bright');
  log('This test shows us:', 'reset');
  log('1. Whether the vw_units_leaseholders view exists and has data', 'reset');
  log('2. Whether the unit numbers match what we expect', 'reset');
  log('3. Whether the building names match what we expect', 'reset');
  log('4. Whether the specific query for Flat 1 at Ashwood House works', 'reset');
}

// Run the test
if (require.main === module) {
  testViewQuery()
    .then(() => {
      log('\n✅ View query test completed', 'green');
      process.exit(0);
    })
    .catch((error) => {
      logError(`Test failed: ${error.message}`);
      process.exit(1);
    });
}

module.exports = { testViewQuery };
