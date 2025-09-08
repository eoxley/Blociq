#!/usr/bin/env node

/**
 * Check Buildings
 * This script checks what buildings exist in the database
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

async function checkBuildings() {
  console.log('🔍 Checking buildings in database...\n');

  try {
    // Check if buildings table exists
    console.log('1. Checking buildings table...');
    const { data: buildings, error: buildingsError } = await supabase
      .from('buildings')
      .select('*')
      .limit(10);

    if (buildingsError) {
      console.log('   ❌ Error accessing buildings table:', buildingsError.message);
      return;
    }

    console.log(`   📊 Found ${buildings.length} buildings:`);
    buildings.forEach((building, index) => {
      console.log(`      ${index + 1}. ${building.name} (ID: ${building.id})`);
      console.log(`         Address: ${building.address || 'No address'}`);
      console.log(`         Created: ${building.created_at}`);
    });

    // Check for Ashwood House specifically
    console.log('\n2. Looking for Ashwood House...');
    const { data: ashwoodBuildings, error: ashwoodError } = await supabase
      .from('buildings')
      .select('*')
      .ilike('name', '%ashwood%');

    if (ashwoodError) {
      console.log('   ❌ Error searching for Ashwood:', ashwoodError.message);
    } else if (ashwoodBuildings.length > 0) {
      console.log(`   ✅ Found ${ashwoodBuildings.length} Ashwood buildings:`);
      ashwoodBuildings.forEach((building, index) => {
        console.log(`      ${index + 1}. ${building.name} (ID: ${building.id})`);
      });
    } else {
      console.log('   ❌ No Ashwood House found');
    }

    // Check units table
    console.log('\n3. Checking units table...');
    const { data: units, error: unitsError } = await supabase
      .from('units')
      .select('id, building_id, unit_number')
      .limit(10);

    if (unitsError) {
      console.log('   ❌ Error accessing units table:', unitsError.message);
    } else {
      console.log(`   📊 Found ${units.length} units:`);
      units.forEach((unit, index) => {
        console.log(`      ${index + 1}. Unit ${unit.unit_number} (Building ID: ${unit.building_id})`);
      });
    }

    // Check if we need to create Ashwood House
    if (buildings.length === 0) {
      console.log('\n4. No buildings found. Creating Ashwood House...');
      
      const { data: newBuilding, error: createError } = await supabase
        .from('buildings')
        .insert({
          name: 'Ashwood House',
          address: '123 Ashwood Street, London SW1A 1AA',
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (createError) {
        console.log('   ❌ Error creating Ashwood House:', createError.message);
      } else {
        console.log('   ✅ Created Ashwood House:', newBuilding);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the check
checkBuildings();
