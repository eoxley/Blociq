import { NextResponse } from "next/server";
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient(cookies());
    
    // Check authentication
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const buildingId = params.id;

    if (!buildingId) {
      return NextResponse.json({ error: "Building ID is required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("building_compliance_assets")
      .select(`
        id as bca_id,
        compliance_asset_id as asset_id,
        next_due_date,
        status,
        notes,
        last_renewed_date,
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

    if (error) {
      console.error('Error fetching compliance data:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Transform the data to flatten the nested compliance_assets
    const transformedData = (data || []).map(row => ({
      bca_id: row.bca_id,
      asset_id: row.asset_id,
      asset_name: row.compliance_assets?.asset_name || "Unknown",
      category: row.compliance_assets?.category || "Unknown",
      frequency_months: row.compliance_assets?.frequency_months,
      last_renewed_date: row.last_renewed_date,
      next_due_date: row.next_due_date,
      status: row.status || "pending",
      notes: row.notes,
      contractor: row.contractor,
      docs_count: 0 // TODO: Calculate this from compliance_documents table
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
