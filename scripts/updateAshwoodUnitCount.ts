// Update Ashwood House to have 31 units
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function updateAshwoodUnitCount() {
  console.log('🔍 Finding Ashwood House...');

  // Find Ashwood House
  const { data: building, error: findError } = await supabase
    .from('buildings')
    .select('id, name, unit_count')
    .ilike('name', '%ashwood%')
    .single();

  if (findError || !building) {
    console.error('❌ Ashwood House not found:', findError?.message);
    return;
  }

  console.log('✅ Found building:', building.name, 'Current unit count:', building.unit_count);

  // Update unit count to 31
  const { data: updated, error: updateError } = await supabase
    .from('buildings')
    .update({ unit_count: 31 })
    .eq('id', building.id)
    .select()
    .single();

  if (updateError) {
    console.error('❌ Failed to update unit count:', updateError.message);
    return;
  }

  console.log('✅ Updated Ashwood House unit count to 31');

  // Check existing units
  const { data: existingUnits, error: unitsError } = await supabase
    .from('units')
    .select('id, unit_number')
    .eq('building_id', building.id)
    .order('unit_number');

  if (unitsError) {
    console.error('❌ Failed to get existing units:', unitsError.message);
    return;
  }

  console.log(`📋 Found ${existingUnits?.length || 0} existing units`);

  // If we need more units, create them
  const currentUnitCount = existingUnits?.length || 0;
  if (currentUnitCount < 31) {
    const unitsToCreate = [];
    for (let i = currentUnitCount + 1; i <= 31; i++) {
      unitsToCreate.push({
        building_id: building.id,
        unit_number: `Flat ${i}`,
        floor: Math.floor((i - 1) / 4) + 1, // Assuming 4 units per floor
        type: 'apartment'
      });
    }

    const { data: newUnits, error: createError } = await supabase
      .from('units')
      .insert(unitsToCreate)
      .select();

    if (createError) {
      console.error('❌ Failed to create additional units:', createError.message);
      return;
    }

    console.log(`✅ Created ${newUnits?.length || 0} additional units`);
  }

  // Verify final count
  const { data: finalUnits, error: finalError } = await supabase
    .from('units')
    .select('id')
    .eq('building_id', building.id);

  if (!finalError && finalUnits) {
    console.log(`🎉 Ashwood House now has ${finalUnits.length} units in the database`);
  }
}

// Run the update
updateAshwoodUnitCount().catch(console.error);