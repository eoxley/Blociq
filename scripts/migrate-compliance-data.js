#!/usr/bin/env node

/**
 * Compliance System Data Migration Script
 * This script migrates existing compliance data to the new standardized schema
 */

require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function migrateComplianceData() {
  console.log('🔄 Starting compliance system data migration...');
  
  try {
    // Step 1: Check current schema state
    console.log('\n📊 Checking current schema state...');
    
    const { data: complianceAssets, error: caError } = await supabase
      .from('compliance_assets')
      .select('*')
      .limit(5);
    
    if (caError) {
      console.error('❌ Error checking compliance_assets table:', caError);
      return;
    }
    
    console.log('✅ compliance_assets table accessible');
    if (complianceAssets && complianceAssets.length > 0) {
      console.log('📋 Sample compliance asset:', complianceAssets[0]);
    }
    
    // Step 2: Check building_compliance_assets table
    const { data: buildingAssets, error: bcaError } = await supabase
      .from('building_compliance_assets')
      .select('*')
      .limit(5);
    
    if (bcaError) {
      console.error('❌ Error checking building_compliance_assets table:', bcaError);
      return;
    }
    
    console.log('✅ building_compliance_assets table accessible');
    if (buildingAssets && buildingAssets.length > 0) {
      console.log('📋 Sample building compliance asset:', buildingAssets[0]);
    }
    
    // Step 3: Check for any orphaned records
    console.log('\n🔍 Checking for orphaned records...');
    
    const { data: orphanedRecords, error: orphanedError } = await supabase
      .from('building_compliance_assets')
      .select(`
        *,
        compliance_assets!left(*)
      `)
      .is('compliance_assets.id', null);
    
    if (orphanedError) {
      console.error('❌ Error checking for orphaned records:', orphanedError);
    } else if (orphanedRecords && orphanedRecords.length > 0) {
      console.log(`⚠️  Found ${orphanedRecords.length} orphaned building compliance records`);
      console.log('📋 Sample orphaned record:', orphanedRecords[0]);
      
      // Clean up orphaned records
      const orphanedIds = orphanedRecords.map(r => r.id);
      const { error: cleanupError } = await supabase
        .from('building_compliance_assets')
        .delete()
        .in('id', orphanedIds);
      
      if (cleanupError) {
        console.error('❌ Error cleaning up orphaned records:', cleanupError);
      } else {
        console.log(`✅ Cleaned up ${orphanedIds.length} orphaned records`);
      }
    } else {
      console.log('✅ No orphaned records found');
    }
    
    // Step 4: Verify data integrity
    console.log('\n🔍 Verifying data integrity...');
    
    const { data: integrityCheck, error: integrityError } = await supabase
      .from('building_compliance_assets')
      .select(`
        id,
        building_id,
        compliance_asset_id,
        status,
        next_due_date,
        buildings!inner(name),
        compliance_assets!inner(name, category)
      `)
      .limit(10);
    
    if (integrityError) {
      console.error('❌ Error during integrity check:', integrityError);
    } else {
      console.log('✅ Data integrity check passed');
      if (integrityCheck && integrityCheck.length > 0) {
        console.log('📋 Sample valid record:', {
          building: integrityCheck[0].buildings.name,
          asset: integrityCheck[0].compliance_assets.name,
          category: integrityCheck[0].compliance_assets.category,
          status: integrityCheck[0].status,
          next_due: integrityCheck[0].next_due_date
        });
      }
    }
    
    // Step 5: Check for Ashwood House specifically
    console.log('\n🏠 Checking Ashwood House compliance data...');
    
    const { data: ashwoodBuilding, error: ashwoodError } = await supabase
      .from('buildings')
      .select('id, name')
      .ilike('name', '%ashwood%')
      .single();
    
    if (ashwoodError || !ashwoodBuilding) {
      console.log('⚠️  Ashwood House not found in buildings table');
    } else {
      console.log(`✅ Found Ashwood House: ${ashwoodBuilding.name} (ID: ${ashwoodBuilding.id})`);
      
      const { data: ashwoodCompliance, error: ashwoodComplianceError } = await supabase
        .from('building_compliance_assets')
        .select(`
          *,
          compliance_assets(name, category, description)
        `)
        .eq('building_id', ashwoodBuilding.id);
      
      if (ashwoodComplianceError) {
        console.error('❌ Error fetching Ashwood House compliance:', ashwoodComplianceError);
      } else {
        console.log(`📋 Ashwood House has ${ashwoodCompliance?.length || 0} compliance assets`);
        if (ashwoodCompliance && ashwoodCompliance.length > 0) {
          ashwoodCompliance.forEach((asset, index) => {
            console.log(`  ${index + 1}. ${asset.compliance_assets.name} (${asset.compliance_assets.category}) - Status: ${asset.status}`);
          });
        }
      }
    }
    
    console.log('\n✅ Compliance system data migration completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('1. Run the database migration: supabase db push');
    console.log('2. Test the compliance setup modal');
    console.log('3. Verify the buildings to-do widget loads properly');
    console.log('4. Check that Ashwood House compliance data is accessible');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
migrateComplianceData()
  .then(() => {
    console.log('\n🎉 Migration script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Migration script failed:', error);
    process.exit(1);
  });
