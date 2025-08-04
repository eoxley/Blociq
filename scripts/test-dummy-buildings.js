const { createClient } = require('@supabase/supabase-js');

// Get environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testDummyBuildings() {
  try {
    console.log('🧪 Testing dummy buildings functionality...');

    // Check if there are any buildings in the database
    const { data: buildings, error } = await supabase
      .from('buildings')
      .select('id, name, address')
      .limit(5);

    if (error) {
      console.error('❌ Error fetching buildings:', error);
      return;
    }

    console.log(`📊 Found ${buildings?.length || 0} buildings in database`);

    if (buildings && buildings.length > 0) {
      console.log('✅ Database has buildings, dummy data will not be used');
      buildings.forEach((building, index) => {
        console.log(`  ${index + 1}. ${building.name} (${building.address})`);
      });
    } else {
      console.log('📝 No buildings in database, dummy data will be used');
      console.log('🌐 Visit /buildings to see the dummy buildings');
    }

    // Test the API endpoint
    console.log('\n🔗 Testing API endpoint...');
    const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/buildings`);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ API returned ${data.buildings?.length || 0} buildings`);
      console.log(`📊 Total units: ${data.totalUnits || 0}`);
      console.log(`🎭 Is dummy data: ${data.isDummyData || false}`);
      
      if (data.buildings && data.buildings.length > 0) {
        console.log('\n📋 Sample buildings:');
        data.buildings.slice(0, 3).forEach((building, index) => {
          console.log(`  ${index + 1}. ${building.name} - ${building.liveUnitCount || 0} units`);
        });
      }
    } else {
      console.error('❌ API request failed:', response.status);
    }

  } catch (error) {
    console.error('❌ Error in test:', error);
  }
}

// Run the test
testDummyBuildings().then(() => {
  console.log('\n✅ Test completed');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Test failed:', error);
  process.exit(1);
}); 