import { supabaseAdmin } from "@/lib/supabaseAdmin";

export type UnitLeaseholderRow = {
  unit_id: string;
  building_id: string;
  unit_number: string | null;
  unit_label: string | null;
  apportionment_percent: number | null;
  leaseholder_id: string | null;
  leaseholder_name: string | null;
  leaseholder_email: string | null;
  leaseholder_phone: string | null;
  is_director: boolean | null;
  director_role: string | null;
  director_since: string | null;
  director_notes: string | null;
};

export async function getUnitsLeaseholders(buildingId: string) {
  const { data, error } = await supabaseAdmin
    .from("vw_units_leaseholders")
    .select("*")
    .eq("building_id", buildingId)
    .order("unit_number", { ascending: true });

  if (error) throw error;
  return (data || []) as UnitLeaseholderRow[];
}
