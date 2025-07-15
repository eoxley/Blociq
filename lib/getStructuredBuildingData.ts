import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function getStructuredBuildingData(buildingIdOrName: string) {
  // Check if it's a numeric ID or UUID
  const isNumericId = !isNaN(Number(buildingIdOrName)) && buildingIdOrName.length < 36;

  const { data, error } = await supabase
    .from('buildings')
    .select(`
      id,
      name,
      address,
      unit_count,
      created_at
    `)
    .eq(isNumericId ? 'id' : 'name', isNumericId ? Number(buildingIdOrName) : buildingIdOrName)
    .single();

  if (error) {
    console.error('Failed to fetch structured building data:', error.message);
    return null;
  }

  return data;
} 