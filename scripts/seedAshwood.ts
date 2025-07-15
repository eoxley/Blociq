// File: scripts/seedAshwood.ts
// Run this inside Cursor to create a clean Ashwood House demo

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Use service role key for insert access
);

export async function seedAshwood() {
  const { data: building, error: buildingError } = await supabase
    .from('buildings')
    .insert([
      {
        name: 'Ashwood House',
        unit_count: 10,
        key_access_notes: 'Keys held in office key safe 3.',
        parking_notes: '1 permit bay per unit. No visitor parking.',
        entry_code: '1942#',
        meter_location: 'Cupboard opposite Flat 5',
        bin_location: 'Rear alley, accessed via side gate.',
        fire_panel_location: 'Ground floor entrance lobby',
        demo_ready: true,
      },
    ])
    .select()
    .single();

  if (buildingError || !building) {
    console.error('Failed to create building:', buildingError?.message);
    return;
  }

  console.log('🏢 Created building:', building.name);

  const units = Array.from({ length: 10 }).map((_, i) => ({
    building_id: building.id,
    unit_number: `Flat ${i + 1}`,
  }));

  const { data: insertedUnits, error: unitError } = await supabase
    .from('units')
    .insert(units)
    .select();

  if (unitError || !insertedUnits) {
    console.error('❌ Failed to insert units:', unitError?.message);
    return;
  }

  console.log(`🏠 Inserted ${insertedUnits.length} units`);

  const leaseholders = insertedUnits.map((unit, i) => ({
    unit_id: unit.id,
    leaseholder_name: `Leaseholder ${i + 1}`,
    contact_number: `07123 000${100 + i}`,
    email: `leaseholder${i + 1}@ashwood.demo`,
  }));

  const { data: leases, error: leaseError } = await supabase
    .from('leases')
    .insert(leaseholders)
    .select();

  if (leaseError) {
    console.error('❌ Failed to insert leases:', leaseError.message);
    return;
  }

  console.log(`✅ Inserted ${leases.length} leaseholders linked to units`);
}

// Also run directly if this file is executed
if (require.main === module) {
  seedAshwood();
} 