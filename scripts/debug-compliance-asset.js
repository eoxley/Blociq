#!/usr/bin/env node

/**
 * DEBUG COMPLIANCE ASSET
 * 
 * Checks if the specific asset ID exists in the database
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function debugComplianceAsset() {
  log('🔧 DEBUGGING COMPLIANCE ASSET', 'bright');
  log('============================================', 'bright');
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    log('❌ Missing environment variables', 'red');
    return;
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  const assetId = 'b63c4eb1-2696-42b4-aa56-e50c2b811e10';
  const buildingId = '2beeec1d-a94e-4058-b881-213d74cc6830';
  
  try {
    log(`ℹ️ Looking for asset: ${assetId}`, 'blue');
    log(`ℹ️ In building: ${buildingId}`, 'blue');
    
    // Check if asset exists at all
    log('\n1. Checking if asset exists in building_compliance_assets...', 'cyan');
    const { data: asset, error: assetError } = await supabase
      .from('building_compliance_assets')
      .select('*')
      .eq('id', assetId);
    
    if (assetError) {
      log(`❌ Query error: ${assetError.message}`, 'red');
      return;
    }
    
    if (!asset || asset.length === 0) {
      log('❌ Asset not found in building_compliance_assets table', 'red');
      
      // Check if it might be in compliance_assets instead
      log('\n2. Checking compliance_assets table...', 'cyan');
      const { data: baseAsset, error: baseError } = await supabase
        .from('compliance_assets')
        .select('*')
        .eq('id', assetId);
      
      if (baseError) {
        log(`❌ Base asset query error: ${baseError.message}`, 'red');
      } else if (baseAsset && baseAsset.length > 0) {
        log('✅ Found in compliance_assets table:', 'green');
        console.log(baseAsset[0]);
      } else {
        log('❌ Asset not found in compliance_assets either', 'red');
      }
    } else {
      log('✅ Found asset in building_compliance_assets:', 'green');
      console.log(asset[0]);
      
      if (asset[0].building_id !== buildingId) {
        log(`❌ Building ID mismatch!`, 'red');
        log(`   Expected: ${buildingId}`, 'red');
        log(`   Found: ${asset[0].building_id}`, 'red');
      } else {
        log('✅ Building ID matches', 'green');
      }
    }
    
    // Check building exists
    log('\n3. Checking building exists...', 'cyan');
    const { data: building, error: buildingError } = await supabase
      .from('buildings')
      .select('id, name')
      .eq('id', buildingId);
    
    if (buildingError) {
      log(`❌ Building query error: ${buildingError.message}`, 'red');
    } else if (!building || building.length === 0) {
      log('❌ Building not found', 'red');
    } else {
      log(`✅ Building found: ${building[0].name}`, 'green');
    }
    
    // List all building compliance assets for this building
    log('\n4. Listing all compliance assets for this building...', 'cyan');
    const { data: allAssets, error: allError } = await supabase
      .from('building_compliance_assets')
      .select('id, building_id, status, notes')
      .eq('building_id', buildingId)
      .limit(10);
    
    if (allError) {
      log(`❌ All assets query error: ${allError.message}`, 'red');
    } else {
      log(`ℹ️ Found ${allAssets.length} compliance assets for this building:`, 'blue');
      allAssets.forEach((asset, i) => {
        log(`   ${i+1}. ${asset.id} - ${asset.status}`, 'reset');
      });
    }
    
  } catch (error) {
    log(`❌ Error: ${error.message}`, 'red');
  }
}

if (require.main === module) {
  debugComplianceAsset()
    .then(() => {
      log('✅ Debug completed', 'green');
      process.exit(0);
    })
    .catch((error) => {
      log(`❌ Debug failed: ${error.message}`, 'red');
      process.exit(1);
    });
}