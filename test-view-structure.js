#!/usr/bin/env node

/**
 * TEST VIEW STRUCTURE
 * 
 * Tests the structure of the vw_units_leaseholders view
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

// Test view structure
async function testViewStructure() {
  log('🔍 TESTING VIEW STRUCTURE', 'bright');
  log('============================================================', 'bright');
  log('Testing the structure of the vw_units_leaseholders view', 'bright');
  log('', 'reset');

  // Initialize Supabase client
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    // Test 1: Get one record to see the structure
    logStep(1, 'Getting one record to see the structure');
    const { data: oneRecord, error: oneError } = await supabase
      .from('vw_units_leaseholders')
      .select('*')
      .limit(1);
    
    if (oneError) {
      logError(`One record query error: ${oneError.message}`);
    } else if (oneRecord && oneRecord.length > 0) {
      logSuccess('View structure:');
      const record = oneRecord[0];
      Object.keys(record).forEach(key => {
        log(`  ${key}: ${record[key]}`, 'green');
      });
    } else {
      logWarning('No records found');
    }

    // Test 2: Try to get building information
    logStep(2, 'Trying to get building information');
    const { data: buildingData, error: buildingError } = await supabase
      .from('vw_units_leaseholders')
      .select('building_id, unit_number, leaseholder_name')
      .limit(5);
    
    if (buildingError) {
      logError(`Building data query error: ${buildingError.message}`);
    } else {
      logInfo(`Found ${buildingData.length} records with building_id`);
      if (buildingData.length > 0) {
        logSuccess('Building data:');
        buildingData.forEach((record, index) => {
          log(`  ${index + 1}. Unit ${record.unit_number} - Building ID: ${record.building_id} - ${record.leaseholder_name}`, 'green');
        });
      }
    }

    // Test 3: Try to join with buildings table
    logStep(3, 'Trying to join with buildings table');
    const { data: joinedData, error: joinedError } = await supabase
      .from('vw_units_leaseholders')
      .select(`
        unit_number,
        leaseholder_name,
        leaseholder_email,
        leaseholder_phone,
        building_id,
        buildings!inner(name, address)
      `)
      .limit(5);
    
    if (joinedError) {
      logError(`Joined query error: ${joinedError.message}`);
    } else {
      logInfo(`Found ${joinedData.length} records with building names`);
      if (joinedData.length > 0) {
        logSuccess('Joined data:');
        joinedData.forEach((record, index) => {
          log(`  ${index + 1}. ${record.leaseholder_name} - Unit ${record.unit_number} - ${record.buildings?.name || 'No building name'}`, 'green');
        });
      }
    }

  } catch (error) {
    logError(`Test failed: ${error.message}`);
  }

  log('\n📊 VIEW STRUCTURE TEST RESULTS', 'bright');
  log('============================================================', 'bright');
  log('This test shows us:', 'reset');
  log('1. What columns exist in the vw_units_leaseholders view', 'reset');
  log('2. Whether we can join with the buildings table', 'reset');
  log('3. How to properly query for building names', 'reset');
}

// Run the test
if (require.main === module) {
  testViewStructure()
    .then(() => {
      log('\n✅ View structure test completed', 'green');
      process.exit(0);
    })
    .catch((error) => {
      logError(`Test failed: ${error.message}`);
      process.exit(1);
    });
}

module.exports = { testViewStructure };
