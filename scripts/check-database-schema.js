require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDatabaseSchema() {
  try {
    console.log('🔍 Checking database schema...\n');
    
    // Check building_compliance_assets table structure
    console.log('1️⃣ Checking building_compliance_assets table...');
    const { data: bcaData, error: bcaError } = await supabase
      .from('building_compliance_assets')
      .select('*')
      .limit(1);
    
    if (bcaError) {
      console.error('❌ Error accessing building_compliance_assets:', bcaError);
    } else {
      console.log('✅ building_compliance_assets table accessible');
      if (bcaData && bcaData.length > 0) {
        console.log('📋 Sample record structure:');
        Object.keys(bcaData[0]).forEach(key => {
          console.log(`   ${key}: ${typeof bcaData[0][key]} (${bcaData[0][key]})`);
        });
      } else {
        console.log('   No records found in building_compliance_assets');
      }
    }
    
    // Check compliance_assets table structure
    console.log('\n2️⃣ Checking compliance_assets table...');
    const { data: caData, error: caError } = await supabase
      .from('compliance_assets')
      .select('*')
      .limit(1);
    
    if (caError) {
      console.error('❌ Error accessing compliance_assets:', caError);
    } else {
      console.log('✅ compliance_assets table accessible');
      if (caData && caData.length > 0) {
        console.log('📋 Sample record structure:');
        Object.keys(caData[0]).forEach(key => {
          console.log(`   ${key}: ${typeof caData[0][key]} (${caData[0][key]})`);
        });
      } else {
        console.log('   No records found in compliance_assets');
      }
    }
    
    // Check buildings table structure
    console.log('\n3️⃣ Checking buildings table...');
    const { data: buildingsData, error: buildingsError } = await supabase
      .from('buildings')
      .select('*')
      .limit(1);
    
    if (buildingsError) {
      console.error('❌ Error accessing buildings:', buildingsError);
    } else {
      console.log('✅ buildings table accessible');
      if (buildingsData && buildingsData.length > 0) {
        console.log('📋 Sample record structure:');
        Object.keys(buildingsData[0]).forEach(key => {
          console.log(`   ${key}: ${typeof buildingsData[0][key]} (${buildingsData[0][key]})`);
        });
      } else {
        console.log('   No records found in buildings');
      }
    }
    
    // Check if there are any compliance records
    console.log('\n4️⃣ Checking for compliance records...');
    const { data: allBcaData, error: allBcaError } = await supabase
      .from('building_compliance_assets')
      .select('*');
    
    if (allBcaError) {
      console.error('❌ Error fetching all building_compliance_assets:', allBcaError);
    } else {
      console.log(`✅ Found ${allBcaData?.length || 0} building compliance assets`);
      if (allBcaData && allBcaData.length > 0) {
        console.log('📋 Sample records:');
        allBcaData.slice(0, 3).forEach((record, index) => {
          console.log(`   ${index + 1}. ID: ${record.id}`);
          Object.keys(record).forEach(key => {
            console.log(`      ${key}: ${record[key]}`);
          });
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkDatabaseSchema();
