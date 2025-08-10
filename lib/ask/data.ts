import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/lib/database.types";

export async function getUnitCount(supabase: SupabaseClient<Database>, building_id: string) {
  const { count } = await supabase
    .from("units")
    .select("*", { count: "exact", head: true })
    .eq("building_id", parseInt(building_id));
  return count ?? 0;
}

export async function getLeaseholderForUnit(supabase: SupabaseClient<Database>, unit_id: string) {
  // Get leaseholder directly from units table (leaseholder_id is a direct reference)
  const { data: unit } = await supabase
    .from("units")
    .select(`
      id,
      leaseholder_id,
      leaseholders (
        id,
        name,
        email,
        phone
      )
    `)
    .eq("id", parseInt(unit_id))
    .maybeSingle();

  if (!unit || !unit.leaseholder_id) return null;

  const leaseholder = unit.leaseholders;
  if (!leaseholder) return null;

  return { 
    id: leaseholder.id, 
    name: leaseholder.name, 
    email: leaseholder.email, 
    phone: leaseholder.phone 
  };
}

export async function getLeaseholderByUnitNumber(supabase: SupabaseClient<Database>, building_id: string, unit_number: string) {
  const { data: unit } = await supabase
    .from("units")
    .select(`
      id,
      unit_number,
      leaseholder_id,
      leaseholders (
        id,
        name,
        email,
        phone
      )
    `)
    .eq("building_id", parseInt(building_id))
    .eq("unit_number", unit_number)
    .maybeSingle();

  if (!unit || !unit.leaseholder_id) return null;

  const leaseholder = unit.leaseholders;
  if (!leaseholder) return null;

  return { 
    id: leaseholder.id, 
    name: leaseholder.name, 
    email: leaseholder.email, 
    phone: leaseholder.phone 
  };
}

// Note: PII access logging removed as pii_access_logs table doesn't exist in current schema
// To implement this feature, create the table first with columns: user_id, resource, resource_id, fields, accessed_at
