#!/usr/bin/env node

/**
 * SUPABASE CONNECTION TEST
 * 
 * Tests the actual Supabase connection and queries to see what's in the database
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

// Test Supabase connection
async function testSupabaseConnection() {
  log('🔍 SUPABASE CONNECTION TEST', 'bright');
  log('============================================================', 'bright');
  log('Testing direct Supabase connection and database queries', 'bright');
  log('', 'reset');

  // Check environment variables
  logStep(1, 'Checking environment variables');
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl) {
    logError('NEXT_PUBLIC_SUPABASE_URL is not set');
    return;
  }
  
  if (!supabaseKey) {
    logError('SUPABASE_SERVICE_ROLE_KEY is not set');
    return;
  }
  
  logInfo(`Supabase URL: ${supabaseUrl}`);
  logInfo(`Supabase Key: ${supabaseKey.substring(0, 20)}...`);
  
  // Initialize Supabase client
  logStep(2, 'Initializing Supabase client');
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  try {
    // Test 1: Check buildings table
    logStep(3, 'Testing buildings table');
    const { data: buildings, error: buildingsError } = await supabase
      .from('buildings')
      .select('id, name, address, unit_count')
      .limit(5);
    
    if (buildingsError) {
      logError(`Buildings query error: ${buildingsError.message}`);
    } else {
      logInfo(`Found ${buildings.length} buildings`);
      if (buildings.length > 0) {
        logSuccess('Buildings data:');
        buildings.forEach((building, index) => {
          log(`  ${index + 1}. ${building.name} - ${building.address || 'No address'} (${building.unit_count || 0} units)`, 'green');
        });
      } else {
        logWarning('No buildings found in database');
      }
    }

    // Test 2: Check units table
    logStep(4, 'Testing units table');
    const { data: units, error: unitsError } = await supabase
      .from('units')
      .select('id, unit_number, building_id')
      .limit(10);
    
    if (unitsError) {
      logError(`Units query error: ${unitsError.message}`);
    } else {
      logInfo(`Found ${units.length} units`);
      if (units.length > 0) {
        logSuccess('Units data:');
        units.forEach((unit, index) => {
          log(`  ${index + 1}. Unit ${unit.unit_number} - Building ID: ${unit.building_id}`, 'green');
        });
      } else {
        logWarning('No units found in database');
      }
    }

    // Test 3: Check leaseholders table
    logStep(5, 'Testing leaseholders table');
    const { data: leaseholders, error: leaseholdersError } = await supabase
      .from('leaseholders')
      .select('id, name, email, phone, unit_id')
      .limit(10);
    
    if (leaseholdersError) {
      logError(`Leaseholders query error: ${leaseholdersError.message}`);
    } else {
      logInfo(`Found ${leaseholders.length} leaseholders`);
      if (leaseholders.length > 0) {
        logSuccess('Leaseholders data:');
        leaseholders.forEach((leaseholder, index) => {
          log(`  ${index + 1}. ${leaseholder.name} - ${leaseholder.email || 'No email'} - Unit ID: ${leaseholder.unit_id}`, 'green');
        });
      } else {
        logWarning('No leaseholders found in database');
      }
    }

    // Test 4: Check vw_units_leaseholders view
    logStep(6, 'Testing vw_units_leaseholders view');
    const { data: viewData, error: viewError } = await supabase
      .from('vw_units_leaseholders')
      .select('*')
      .limit(10);
    
    if (viewError) {
      logError(`View query error: ${viewError.message}`);
    } else {
      logInfo(`Found ${viewData.length} records in view`);
      if (viewData.length > 0) {
        logSuccess('View data:');
        viewData.forEach((record, index) => {
          log(`  ${index + 1}. ${record.leaseholder_name} - Unit ${record.unit_number} - ${record.building_name}`, 'green');
        });
      } else {
        logWarning('No data found in vw_units_leaseholders view');
      }
    }

    // Test 5: Check relationships
    logStep(7, 'Testing relationships');
    if (buildings && buildings.length > 0 && units && units.length > 0) {
      const buildingIds = buildings.map(b => b.id);
      const unitBuildingIds = units.map(u => u.building_id);
      const matchingIds = buildingIds.filter(id => unitBuildingIds.includes(id));
      
      logInfo(`Building IDs: ${buildingIds.length}`);
      logInfo(`Unit Building IDs: ${unitBuildingIds.length}`);
      logInfo(`Matching IDs: ${matchingIds.length}`);
      
      if (matchingIds.length > 0) {
        logSuccess('Building IDs match between buildings and units tables!');
      } else {
        logError('Building IDs do not match between buildings and units tables!');
      }
    }

    // Test 6: Check for Ashwood House specifically
    logStep(8, 'Searching for Ashwood House');
    const { data: ashwoodBuildings, error: ashwoodError } = await supabase
      .from('buildings')
      .select('*')
      .ilike('name', '%ashwood%');
    
    if (ashwoodError) {
      logError(`Ashwood search error: ${ashwoodError.message}`);
    } else {
      logInfo(`Found ${ashwoodBuildings.length} buildings matching 'ashwood'`);
      if (ashwoodBuildings.length > 0) {
        logSuccess('Ashwood buildings:');
        ashwoodBuildings.forEach((building, index) => {
          log(`  ${index + 1}. ${building.name} - ${building.address || 'No address'} (${building.unit_count || 0} units)`, 'green');
        });
      } else {
        logWarning('No buildings found matching "ashwood"');
      }
    }

  } catch (error) {
    logError(`Test failed: ${error.message}`);
  }

  log('\n📊 SUPABASE CONNECTION TEST RESULTS', 'bright');
  log('============================================================', 'bright');
  log('This test shows us:', 'reset');
  log('1. Whether Supabase connection is working', 'reset');
  log('2. What data actually exists in the database', 'reset');
  log('3. Whether foreign key relationships are correct', 'reset');
  log('4. Whether building IDs match between tables', 'reset');
  log('5. Whether the issue is with our query logic or the database', 'reset');
}

// Run the test
if (require.main === module) {
  testSupabaseConnection()
    .then(() => {
      log('\n✅ Supabase connection test completed', 'green');
      process.exit(0);
    })
    .catch((error) => {
      logError(`Test failed: ${error.message}`);
      process.exit(1);
    });
}

module.exports = { testSupabaseConnection };
