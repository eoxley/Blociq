import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/lib/database.types";

export async function resolveBuilding(
  supabase: SupabaseClient<Database>, 
  queryText: string
): Promise<{ building_id: string; name: string; agency_id?: string } | null> {
  // Extract potential building names from the query
  const buildingKeywords = ['house', 'court', 'building', 'apartment', 'residence', 'manor', 'gardens', 'heights', 'view', 'plaza'];
  const words = queryText.toLowerCase().split(/\s+/);
  
  for (let i = 0; i < words.length - 1; i++) {
    const potentialName = words.slice(i, i + 2).join(' '); // Check 2-word combinations
    if (buildingKeywords.some(keyword => potentialName.includes(keyword))) {
      console.log('🔍 Searching for building:', potentialName);
      
      const { data: building } = await supabase
        .from('buildings')
        .select('id, name, agency_id')
        .ilike('name', `%${potentialName}%`)
        .maybeSingle();
      
      if (building) {
        return {
          building_id: building.id,
          name: building.name,
          agency_id: building.agency_id || undefined
        };
      }
    }
  }
  
  return null;
}

export async function resolveUnit(
  supabase: SupabaseClient<Database>,
  building_id: string, 
  unitText: string
): Promise<{ unit_id: string; label: string } | null> {
  // Extract unit number from text (e.g., "unit 5", "flat 3", "apartment 2")
  const unitMatch = unitText.toLowerCase().match(/(?:unit|flat|apartment|suite)\s*(\d+)/i);
  if (!unitMatch) return null;
  
  const unitNumber = unitMatch[1];
  
  const { data: unit } = await supabase
    .from('units')
    .select('id, unit_number')
    .eq('building_id', building_id)
    .eq('unit_number', unitNumber)
    .maybeSingle();
  
  if (unit) {
    return {
      unit_id: unit.id.toString(),
      label: unit.unit_number
    };
  }
  
  return null;
}
