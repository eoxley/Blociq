import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function getBuildingData(buildingId: string) {
  try {
    const { data, error } = await supabase
      .from('buildings')
      .select(`
        id,
        name,
        address,
        unit_count,
        building_manager_name,
        building_manager_email,
        service_charge_start,
        service_charge_end,
        access_notes,
        key_access_notes,
        entry_code,
        fire_panel_location
      `)
      .eq('id', buildingId)
      .single();

    if (error) {
      console.error('Error fetching building data:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in getBuildingData:', error);
    return null;
  }
} 