require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testComplianceFix() {
  try {
    console.log('🧪 Testing compliance API fixes...\n');
    
    // Test 1: Check Eleanor's agency and buildings
    console.log('1️⃣ Checking Eleanor\'s agency and buildings...');
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
    
    // Test 2: Check buildings with agency_id
    console.log('\n2️⃣ Checking buildings with agency_id...');
    const { data: buildings, error: buildingsError } = await supabase
      .from('buildings')
      .select('id, name, is_hrb, agency_id')
      .eq('agency_id', eleanor.id);
    
    if (buildingsError) {
      console.error('❌ Error fetching buildings with agency_id:', buildingsError);
    } else {
      console.log(`✅ Found ${buildings?.length || 0} buildings for Eleanor's agency`);
      if (buildings && buildings.length > 0) {
        buildings.forEach((building, index) => {
          console.log(`   ${index + 1}. ${building.name} (ID: ${building.id})`);
          console.log(`      HRB: ${building.is_hrb ? 'Yes' : 'No'}`);
          console.log(`      Agency ID: ${building.agency_id}`);
        });
      }
    }
    
    // Test 3: Check all buildings (fallback)
    console.log('\n3️⃣ Checking all buildings (fallback)...');
    const { data: allBuildings, error: allBuildingsError } = await supabase
      .from('buildings')
      .select('id, name, is_hrb, agency_id')
      .limit(5);
    
    if (allBuildingsError) {
      console.error('❌ Error fetching all buildings:', allBuildingsError);
    } else {
      console.log(`✅ Found ${allBuildings?.length || 0} total buildings`);
      if (allBuildings && allBuildings.length > 0) {
        allBuildings.forEach((building, index) => {
          console.log(`   ${index + 1}. ${building.name} (ID: ${building.id})`);
          console.log(`      Agency ID: ${building.agency_id || 'None'}`);
        });
      }
    }
    
    // Test 4: Check building_compliance_assets without foreign key join
    console.log('\n4️⃣ Checking building_compliance_assets...');
    const { data: complianceAssets, error: complianceError } = await supabase
      .from('building_compliance_assets')
      .select(`
        id,
        building_id,
        asset_id,
        status,
        next_due_date,
        notes
      `)
      .limit(5);
    
    if (complianceError) {
      console.error('❌ Error fetching building compliance assets:', complianceError);
    } else {
      console.log(`✅ Found ${complianceAssets?.length || 0} building compliance assets`);
      if (complianceAssets && complianceAssets.length > 0) {
        complianceAssets.forEach((asset, index) => {
          console.log(`   ${index + 1}. Building ID: ${asset.building_id}, Asset ID: ${asset.asset_id}`);
          console.log(`      Status: ${asset.status}`);
          console.log(`      Due Date: ${asset.next_due_date || 'Not set'}`);
        });
      }
    }
    
    // Test 5: Test the API endpoints
    console.log('\n5️⃣ Testing API endpoints...');
    
    // Test compliance events API
    try {
      const response = await fetch('http://localhost:3000/api/events/compliance', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Compliance events API: Working');
        console.log(`   Status: ${response.status}`);
        console.log(`   Data: ${JSON.stringify(data).substring(0, 100)}...`);
      } else {
        console.log(`❌ Compliance events API: Error ${response.status}`);
        const errorText = await response.text();
        console.log(`   Error: ${errorText.substring(0, 200)}...`);
      }
    } catch (error) {
      console.log('❌ Compliance events API: Network error');
      console.log(`   Error: ${error.message}`);
    }
    
    // Test main compliance API
    try {
      const response = await fetch('http://localhost:3000/api/compliance', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Main compliance API: Working');
        console.log(`   Status: ${response.status}`);
        console.log(`   Data: ${JSON.stringify(data).substring(0, 100)}...`);
      } else {
        console.log(`❌ Main compliance API: Error ${response.status}`);
        const errorText = await response.text();
        console.log(`   Error: ${errorText.substring(0, 200)}...`);
      }
    } catch (error) {
      console.log('❌ Main compliance API: Network error');
      console.log(`   Error: ${error.message}`);
    }
    
    console.log('\n📝 Summary:');
    console.log('The fixes should resolve:');
    console.log('1. ✅ buildings.user_id column error (now using agency_id)');
    console.log('2. ✅ building_members table error (removed)');
    console.log('3. ✅ Foreign key relationship errors (removed joins)');
    console.log('4. ✅ 500 errors in compliance APIs');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testComplianceFix();
