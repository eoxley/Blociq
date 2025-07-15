import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function getStructuredBuildingData(buildingIdOrName: string) {
  const isId = buildingIdOrName.length === 36; // basic UUID check

  const { data, error } = await supabase
    .from('buildings')
    .select(`
      id,
      name,
      address,
      access_notes,
      service_charge_start,
      service_charge_end,
      upcoming_events,
      upcoming_works,
      units (
        id,
        unit_number,
        type,
        floor,
        leaseholders (
          name,
          email,
          phone
        )
      )
    `)
    .eq(isId ? 'id' : 'name', buildingIdOrName)
    .single();

  if (error) {
    console.error('Failed to fetch structured building data:', error.message);
    return null;
  }

  return data;
} 