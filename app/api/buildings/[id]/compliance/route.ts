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

    // First, get the building compliance assets with document counts
    const { data: bcaData, error: bcaError } = await supabase
      .from("building_compliance_assets")
      .select(`
        id as bca_id,
        compliance_asset_id,
        next_due_date,
        status,
        notes,
        last_renewed_date,
        last_carried_out,
        inspector_provider,
        certificate_reference,
        contractor,
        frequency_months,
        document_count,
        latest_upload_date
      `)
      .eq("building_id", buildingId);

    if (bcaError) {
      console.error('Error fetching building compliance assets:', bcaError);
      return NextResponse.json({ error: bcaError.message }, { status: 500 });
    }

    if (!bcaData || bcaData.length === 0) {
      return NextResponse.json({ data: [] });
    }

    // Get the compliance assets details
    const assetIds = bcaData.map(row => row.compliance_asset_id);
    const { data: assetData, error: assetError } = await supabase
      .from("compliance_assets")
      .select(`
        id,
        name,
        category,
        description,
        frequency_months
      `)
      .in("id", assetIds)
      .order("category", { ascending: true })
      .order("name", { ascending: true });

    if (assetError) {
      console.error('Error fetching compliance assets:', assetError);
      return NextResponse.json({ error: assetError.message }, { status: 500 });
    }

    // Create a map for quick lookup
    const assetMap = new Map(assetData?.map(asset => [asset.id, asset]) || []);

    // Transform the data to combine both datasets
    const transformedData = bcaData.map(row => {
      const asset = assetMap.get(row.compliance_asset_id);
      return {
        bca_id: row.bca_id,
        asset_id: row.compliance_asset_id,
        asset_name: asset?.name || "Unknown",
        category: asset?.category || "Unknown",
        frequency_months: asset?.frequency_months || row.frequency_months,
        last_renewed_date: row.last_renewed_date,
        last_carried_out: row.last_carried_out,
        next_due_date: row.next_due_date,
        status: row.status || "pending",
        notes: row.notes,
        contractor: row.contractor,
        inspector_provider: row.inspector_provider,
        certificate_reference: row.certificate_reference,
        docs_count: row.document_count || 0,
        latest_upload_date: row.latest_upload_date
      };
    });

    // Safe response format - ensure data is always an array
    const safeData = Array.isArray(transformedData) ? transformedData : [];
    
    return NextResponse.json({ 
      data: safeData,
      count: safeData.length,
      success: true
    });
  } catch (error: any) {
    console.error("Error fetching compliance data:", error);
    return NextResponse.json(
      { error: "Failed to fetch compliance data" },
      { status: 500 }
    );
  }
}
