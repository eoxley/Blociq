require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testComplianceData() {
  try {
    console.log('🧪 Testing compliance data access...\n');
    
    // Test 1: Check if Eleanor has buildings
    console.log('1️⃣ Checking Eleanor\'s buildings...');
    const { data: eleanor, error: eleanorError } = await supabase
      .from('users')
      .select('id, email, full_name')
      .eq('email', 'eleanor.oxley@blociq.co.uk')
      .single();
    
    if (eleanorError || !eleanor) {
      console.error('❌ Could not find Eleanor:', eleanorError?.message);
      return;
    }
    
    console.log('✅ Found Eleanor:', eleanor.full_name || eleanor.email);
    console.log('   User ID:', eleanor.id);
    
    // Test 2: Check Eleanor's buildings
    console.log('\n2️⃣ Checking Eleanor\'s buildings...');
    const { data: buildings, error: buildingsError } = await supabase
      .from('buildings')
      .select('id, name, is_hrb, user_id, agency_id')
      .eq('user_id', eleanor.id);
    
    if (buildingsError) {
      console.error('❌ Error fetching buildings:', buildingsError);
    } else {
      console.log(`✅ Found ${buildings?.length || 0} buildings for Eleanor`);
      if (buildings && buildings.length > 0) {
        buildings.forEach((building, index) => {
          console.log(`   ${index + 1}. ${building.name} (ID: ${building.id})`);
          console.log(`      HRB: ${building.is_hrb ? 'Yes' : 'No'}`);
          console.log(`      Agency ID: ${building.agency_id || 'None'}`);
        });
      }
    }
    
    // Test 3: Check building_members table
    console.log('\n3️⃣ Checking building_members table...');
    const { data: memberBuildings, error: memberError } = await supabase
      .from('building_members')
      .select('building_id, user_id, buildings!building_id(id, name, is_hrb)')
      .eq('user_id', eleanor.id);
    
    if (memberError) {
      console.error('❌ Error fetching building members:', memberError);
    } else {
      console.log(`✅ Found ${memberBuildings?.length || 0} building memberships for Eleanor`);
      if (memberBuildings && memberBuildings.length > 0) {
        memberBuildings.forEach((member, index) => {
          console.log(`   ${index + 1}. Building ID: ${member.building_id}`);
          if (member.buildings) {
            console.log(`      Name: ${member.buildings.name}`);
            console.log(`      HRB: ${member.buildings.is_hrb ? 'Yes' : 'No'}`);
          }
        });
      }
    }
    
    // Test 4: Check compliance_assets table
    console.log('\n4️⃣ Checking compliance_assets table...');
    const { data: complianceAssets, error: assetsError } = await supabase
      .from('compliance_assets')
      .select('id, name, category, description')
      .limit(5);
    
    if (assetsError) {
      console.error('❌ Error fetching compliance assets:', assetsError);
    } else {
      console.log(`✅ Found ${complianceAssets?.length || 0} compliance assets`);
      if (complianceAssets && complianceAssets.length > 0) {
        complianceAssets.forEach((asset, index) => {
          console.log(`   ${index + 1}. ${asset.name} (${asset.category})`);
        });
      }
    }
    
    // Test 5: Check building_compliance_assets table
    console.log('\n5️⃣ Checking building_compliance_assets table...');
    const { data: buildingComplianceAssets, error: bcaError } = await supabase
      .from('building_compliance_assets')
      .select(`
        id,
        building_id,
        asset_id,
        status,
        next_due_date,
        notes,
        compliance_assets!asset_id (
          id,
          name,
          category,
          description
        )
      `)
      .limit(5);
    
    if (bcaError) {
      console.error('❌ Error fetching building compliance assets:', bcaError);
      console.log('   This might be the cause of the 500 error');
    } else {
      console.log(`✅ Found ${buildingComplianceAssets?.length || 0} building compliance assets`);
      if (buildingComplianceAssets && buildingComplianceAssets.length > 0) {
        buildingComplianceAssets.forEach((asset, index) => {
          console.log(`   ${index + 1}. Building ID: ${asset.building_id}, Asset ID: ${asset.asset_id}`);
          console.log(`      Status: ${asset.status}`);
          console.log(`      Due Date: ${asset.next_due_date || 'Not set'}`);
          if (asset.compliance_assets) {
            console.log(`      Asset Name: ${asset.compliance_assets.name}`);
          }
        });
      }
    }
    
    // Test 6: Check if Eleanor has any compliance data
    console.log('\n6️⃣ Checking Eleanor\'s compliance data...');
    const allBuildings = [...(buildings || []), ...(memberBuildings?.map(m => m.buildings).filter(Boolean) || [])];
    const buildingIds = allBuildings.map(b => b.id);
    
    if (buildingIds.length > 0) {
      const { data: eleanorCompliance, error: eleanorComplianceError } = await supabase
        .from('building_compliance_assets')
        .select(`
          id,
          building_id,
          asset_id,
          status,
          next_due_date,
          notes,
          compliance_assets!asset_id (
            id,
            name,
            category,
            description
          )
        `)
        .in('building_id', buildingIds);
      
      if (eleanorComplianceError) {
        console.error('❌ Error fetching Eleanor\'s compliance data:', eleanorComplianceError);
      } else {
        console.log(`✅ Found ${eleanorCompliance?.length || 0} compliance assets for Eleanor's buildings`);
      }
    } else {
      console.log('⚠️ No buildings found for Eleanor, so no compliance data to check');
    }
    
    console.log('\n📝 Summary:');
    console.log('The 500 error is likely caused by:');
    console.log('1. Missing or incorrect foreign key relationships');
    console.log('2. Database schema issues with compliance tables');
    console.log('3. Missing data in compliance_assets or building_compliance_assets tables');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testComplianceData();
