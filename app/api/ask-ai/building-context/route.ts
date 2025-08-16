import { NextResponse } from "next/server";
import { getUnitsLeaseholders } from "@/lib/queries/getUnitsLeaseholders";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
  try {
    const { buildingId } = await req.json();
    
    if (!buildingId) {
      return NextResponse.json({ error: "Building ID is required" }, { status: 400 });
    }

    // Fetch comprehensive building data
    const { data: building, error: buildingError } = await supabaseAdmin
      .from('buildings')
      .select('*')
      .eq('id', buildingId)
      .single();

    if (buildingError) throw buildingError;

    // Fetch building setup data
    const { data: buildingSetup, error: setupError } = await supabaseAdmin
      .from('building_setup')
      .select('*')
      .eq('building_id', buildingId)
      .single();

    // Fetch units and leaseholders data
    const unitsLeaseholders = await getUnitsLeaseholders(buildingId);

    // Fetch compliance summary
    const { data: complianceAssets = [], error: complianceError } = await supabaseAdmin
      .from('building_compliance_assets')
      .select(`
        id,
        status,
        due_date,
        priority,
        notes,
        compliance_assets (
          id,
          category,
          title,
          description,
          frequency_months
        )
      `)
      .eq('building_id', buildingId);

    // Calculate compliance summary
    const complianceSummary = {
      total: complianceAssets?.length || 0,
      compliant: complianceAssets?.filter(asset => asset.status === 'compliant').length || 0,
      pending: complianceAssets?.filter(asset => asset.status === 'pending').length || 0,
      overdue: complianceAssets?.filter(asset => asset.status === 'overdue').length || 0
    };

    // Fetch recent call logs (if you have a call_logs table)
    const { data: callLogs = [], error: callLogsError } = await supabaseAdmin
      .from('call_logs')
      .select('*')
      .eq('building_id', buildingId)
      .order('logged_at', { ascending: false })
      .limit(10);

    // Fetch recent correspondence (if you have a correspondence table)
    const { data: correspondence = [], error: correspondenceError } = await supabaseAdmin
      .from('correspondence')
      .select('*')
      .eq('building_id', buildingId)
      .order('created_at', { ascending: false })
      .limit(10);

    // Fetch financial data (if you have financial tables)
    const { data: financialData = [], error: financialError } = await supabaseAdmin
      .from('unit_financials')
      .select('*')
      .eq('building_id', buildingId)
      .order('period', { ascending: false })
      .limit(20);

    return NextResponse.json({
      building,
      buildingSetup,
      unitsLeaseholders,
      complianceSummary,
      complianceAssets,
      callLogs,
      correspondence,
      financialData,
      metadata: {
        totalUnits: unitsLeaseholders.length,
        unitsWithLeaseholders: unitsLeaseholders.filter(u => u.leaseholder_id).length,
        directors: unitsLeaseholders.filter(u => u.is_director).length,
        lastUpdated: new Date().toISOString()
      }
    });

  } catch (error: any) {
    console.error('Error fetching building context:', error);
    return NextResponse.json(
      { error: "Failed to fetch building context" },
      { status: 500 }
    );
  }
}
