import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const buildingId = params.id;

    if (!buildingId) {
      return NextResponse.json({ error: "Building ID is required" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("building_compliance_assets")
      .select(`
        id as bca_id,
        compliance_asset_id as asset_id,
        last_renewed_date,
        next_due_date,
        status,
        notes,
        contractor,
        compliance_assets (
          id,
          name as asset_name,
          category,
          description,
          frequency_months
        )
      `)
      .eq("building_id", buildingId)
      .order("compliance_assets(category)", { ascending: true })
      .order("compliance_assets(name)", { ascending: true });

    if (error) throw error;

    // Transform the data to flatten the nested compliance_assets
    const transformedData = (data || []).map(row => ({
      bca_id: row.bca_id,
      asset_id: row.asset_id,
      asset_name: row.compliance_assets?.asset_name || "Unknown",
      category: row.compliance_assets?.category || "Unknown",
      frequency_months: row.compliance_assets?.frequency_months,
      last_renewed_date: row.last_renewed_date,
      next_due_date: row.next_due_date,
      status: row.status || "unknown",
      docs_count: 0, // TODO: implement docs count
      notes: row.notes,
      contractor: row.contractor
    }));

    return NextResponse.json({ data: transformedData });
  } catch (error: any) {
    console.error("Error fetching compliance data:", error);
    return NextResponse.json(
      { error: "Failed to fetch compliance data" },
      { status: 500 }
    );
  }
}
