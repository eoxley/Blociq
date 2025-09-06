#!/usr/bin/env node

/**
 * DIRECT DATABASE QUERY TEST
 * 
 * Tests direct Supabase queries to see what data actually exists
 */

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xqxaatvykmaaynqeoemy.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhxeGFhdHZ5a21hYXlucWVvZW15Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNzQ0NzQ4MCwiZXhwIjoyMDUzMDIzNDgwfQ.8QZqZqZqZqZqZqZqZqZqZqZqZqZqZqZqZqZqZqZqZq'
);

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

async function testDirectDatabaseQueries() {
  log('🔍 DIRECT DATABASE QUERY TEST', 'bright');
  log('============================================================', 'bright');
  log('Testing direct Supabase queries to see actual database content', 'bright');
  log('', 'reset');

  try {
    // Test 1: Check buildings table
    logStep(1, 'Checking buildings table');
    const { data: buildings, error: buildingsError } = await supabase
      .from('buildings')
      .select('*')
      .limit(10);
    
    if (buildingsError) {
      logError(`Buildings query error: ${buildingsError.message}`);
    } else {
      logInfo(`Found ${buildings.length} buildings`);
      if (buildings.length > 0) {
        logSuccess('Buildings data:');
        buildings.forEach((building, index) => {
          log(`  ${index + 1}. ${building.name} - ${building.address || 'No address'}`, 'green');
        });
      } else {
        logWarning('No buildings found in database');
      }
    }

    // Test 2: Check units table
    logStep(2, 'Checking units table');
    const { data: units, error: unitsError } = await supabase
      .from('units')
      .select('*')
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
    logStep(3, 'Checking leaseholders table');
    const { data: leaseholders, error: leaseholdersError } = await supabase
      .from('leaseholders')
      .select('*')
      .limit(10);
    
    if (leaseholdersError) {
      logError(`Leaseholders query error: ${leaseholdersError.message}`);
    } else {
      logInfo(`Found ${leaseholders.length} leaseholders`);
      if (leaseholders.length > 0) {
        logSuccess('Leaseholders data:');
        leaseholders.forEach((leaseholder, index) => {
          log(`  ${index + 1}. ${leaseholder.name} - ${leaseholder.email || 'No email'}`, 'green');
        });
      } else {
        logWarning('No leaseholders found in database');
      }
    }

    // Test 4: Check vw_units_leaseholders view
    logStep(4, 'Checking vw_units_leaseholders view');
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

    // Test 5: Check for Ashwood House specifically
    logStep(5, 'Searching for Ashwood House specifically');
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
          log(`  ${index + 1}. ${building.name} - ${building.address || 'No address'}`, 'green');
        });
      } else {
        logWarning('No buildings found matching "ashwood"');
      }
    }

    // Test 6: Check all table names
    logStep(6, 'Checking available tables');
    const { data: tables, error: tablesError } = await supabase
      .rpc('get_table_names');
    
    if (tablesError) {
      logWarning(`Could not get table names: ${tablesError.message}`);
      // Try alternative approach
      const { data: schemaData, error: schemaError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public');
      
      if (schemaError) {
        logError(`Schema query error: ${schemaError.message}`);
      } else {
        logInfo(`Available tables: ${schemaData.map(t => t.table_name).join(', ')}`);
      }
    } else {
      logInfo(`Available tables: ${tables.join(', ')}`);
    }

  } catch (error) {
    logError(`Test failed: ${error.message}`);
  }

  log('\n📊 DIRECT DATABASE ANALYSIS', 'bright');
  log('============================================================', 'bright');
  log('This test shows us:', 'reset');
  log('1. What tables exist in the database', 'reset');
  log('2. What data is actually stored', 'reset');
  log('3. Whether our queries are targeting the right tables', 'reset');
  log('4. If there are any permission or connection issues', 'reset');
}

// Run the test
if (require.main === module) {
  testDirectDatabaseQueries()
    .then(() => {
      log('\n✅ Direct database query test completed', 'green');
      process.exit(0);
    })
    .catch((error) => {
      logError(`Test failed: ${error.message}`);
      process.exit(1);
    });
}

module.exports = { testDirectDatabaseQueries };
