const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function removePimlicoData() {
  console.log('🗑️  Starting Pimlico Place data removal...\n');

  // Find Pimlico Place building
  console.log('📍 Finding Pimlico Place building...');
  const { data: building, error: buildingError } = await supabase
    .from('buildings')
    .select('id, name, agency_id')
    .ilike('name', '%Pimlico%')
    .single();

  if (buildingError || !building) {
    console.log('✅ No Pimlico Place building found - nothing to remove');
    return;
  }

  console.log(`📦 Found building: ${building.name} (ID: ${building.id})`);

  const buildingId = building.id;

  // Remove all related data (cascading deletes should handle most of this)
  console.log('\n🔄 Removing related data...');

  // The buildings table has ON DELETE CASCADE, so deleting the building should cascade
  const { error: deleteError } = await supabase
    .from('buildings')
    .delete()
    .eq('id', buildingId);

  if (deleteError) {
    console.error('❌ Error removing building:', deleteError);
    return;
  }

  console.log('✅ Pimlico Place building removed (cascade deleted units, leaseholders, etc.)');
  console.log('\n✨ Cleanup complete!');
}

removePimlicoData().catch(console.error);
