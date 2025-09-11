#!/usr/bin/env node

/**
 * DEBUG COMPLIANCE OVERVIEW
 * 
 * Tests the compliance overview API endpoint
 */

require('dotenv').config({ path: '.env.local' });

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

async function debugComplianceOverview() {
  log('🔧 DEBUGGING COMPLIANCE OVERVIEW', 'bright');
  log('============================================', 'bright');
  
  const baseUrl = process.env.SUPABASE_URL || 'http://localhost:3000';
  
  try {
    log(`ℹ️ Testing API endpoint: /api/compliance/overview`, 'blue');
    
    // Test the API endpoint
    const response = await fetch(`${baseUrl.replace('supabase.co', 'localhost:3000')}/api/compliance/overview`);
    
    log(`ℹ️ Response status: ${response.status}`, 'blue');
    
    if (!response.ok) {
      const errorText = await response.text();
      log(`❌ API Error: ${errorText}`, 'red');
      return;
    }
    
    const result = await response.json();
    
    log('✅ API Response received:', 'green');
    console.log(JSON.stringify(result, null, 2));
    
    if (result.success) {
      const { overview, summary, templates } = result.data;
      
      log(`\n📊 SUMMARY:`, 'cyan');
      log(`Total Buildings: ${summary.totalBuildings}`, 'reset');
      log(`Total Assets: ${summary.totalAssets}`, 'reset');
      log(`Compliant Assets: ${summary.compliantAssets}`, 'reset');
      log(`Overdue Assets: ${summary.overdueAssets}`, 'reset');
      log(`Due Soon Assets: ${summary.dueSoonAssets}`, 'reset');
      log(`Pending Assets: ${summary.pendingAssets}`, 'reset');
      
      if (overview && overview.length > 0) {
        log(`\n🏢 BUILDINGS:`, 'cyan');
        overview.forEach((building, i) => {
          log(`${i+1}. ${building.building_name}:`, 'yellow');
          log(`   Total: ${building.total_assets}, Compliant: ${building.compliant_assets}, Overdue: ${building.overdue_assets}`, 'reset');
        });
      } else {
        log(`\n⚠️ No buildings found in overview`, 'yellow');
      }
      
      log(`\n📋 Templates: ${templates ? templates.length : 0} available`, 'cyan');
      
    } else {
      log(`❌ API returned success: false`, 'red');
    }
    
  } catch (error) {
    log(`❌ Error: ${error.message}`, 'red');
    console.error(error);
  }
}

if (require.main === module) {
  debugComplianceOverview()
    .then(() => {
      log('✅ Debug completed', 'green');
      process.exit(0);
    })
    .catch((error) => {
      log(`❌ Debug failed: ${error.message}`, 'red');
      process.exit(1);
    });
}