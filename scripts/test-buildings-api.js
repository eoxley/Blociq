#!/usr/bin/env node

/**
 * Test Buildings API
 * This script tests the buildings API endpoints to see what's working
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testBuildingsAPI() {
  console.log('🧪 Testing Buildings API...\n');

  try {
    // Test 1: Direct database query
    console.log('1. Testing direct database query...');
    const { data: buildings, error: buildingsError } = await supabase
      .from('buildings')
      .select('id, name, address, created_at')
      .order('name');

    if (buildingsError) {
      console.log('   ❌ Database query failed:', buildingsError.message);
    } else {
      console.log(`   ✅ Found ${buildings.length} buildings:`);
      buildings.forEach((building, index) => {
        console.log(`      ${index + 1}. ${building.name} (ID: ${building.id})`);
      });
    }

    // Test 2: Test units for each building
    console.log('\n2. Testing units for each building...');
    for (const building of buildings || []) {
      const { data: units, error: unitsError } = await supabase
        .from('units')
        .select('id, unit_number')
        .eq('building_id', building.id)
        .not('unit_number', 'is', null);

      if (unitsError) {
        console.log(`   ❌ Error fetching units for ${building.name}:`, unitsError.message);
      } else {
        console.log(`   ✅ ${building.name}: ${units.length} units`);
      }
    }

    // Test 3: Test the API endpoint logic
    console.log('\n3. Testing API endpoint logic...');
    
    // Simulate the list-buildings API logic
    const buildingsWithUnitCounts = await Promise.all(
      (buildings || []).map(async (building) => {
        const { count: unitCount, error: countError } = await supabase
          .from('units')
          .select('id', { count: 'exact', head: true })
          .eq('building_id', building.id)
          .not('unit_number', 'is', null);

        if (countError) {
          console.error(`❌ Error counting units for building ${building.id}:`, countError);
          return {
            ...building,
            unit_count: 0
          };
        }

        return {
          ...building,
          unit_count: unitCount || 0
        };
      })
    );

    console.log('   ✅ API logic test results:');
    buildingsWithUnitCounts.forEach((building, index) => {
      console.log(`      ${index + 1}. ${building.name}: ${building.unit_count} units`);
    });

    // Test 4: Check if the issue is with the frontend
    console.log('\n4. Summary:');
    console.log(`   📊 Total buildings: ${buildings?.length || 0}`);
    console.log(`   📊 Total units: ${buildingsWithUnitCounts.reduce((sum, b) => sum + b.unit_count, 0)}`);
    
    if (buildings && buildings.length > 0) {
      console.log('   ✅ Database has buildings - the issue is likely with the API endpoint or frontend');
    } else {
      console.log('   ❌ No buildings found in database');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the test
testBuildingsAPI();
