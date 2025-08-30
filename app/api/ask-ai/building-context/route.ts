import { NextResponse } from "next/server";
import { getUnitsLeaseholders } from "@/lib/queries/getUnitsLeaseholders";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
  try {
    const { buildingId } = await req.json();
    
    if (!buildingId) {
      return NextResponse.json({ error: "Building ID is required" }, { status: 400 });
    }

    // Fetch building information
    const { data: building, error: buildingError } = await supabaseAdmin
      .from('buildings')
      .select('*')
      .eq('id', buildingId)
      .single();

    if (buildingError) {
      console.error('Error fetching building:', buildingError);
      return NextResponse.json({ error: "Failed to fetch building" }, { status: 500 });
    }

    // Fetch building setup
    const { data: buildingSetup, error: setupError } = await supabaseAdmin
      .from('building_setup')
      .select('*')
      .eq('building_id', buildingId)
      .single();

    // Fetch units and leaseholders
    const unitsLeaseholders = await getUnitsLeaseholders(buildingId);

    // Fetch compliance summary (with defensive handling for missing title column)
    let complianceAssets = [];
    let complianceError = null;
    
    try {
      // Try with title column first
      const { data, error } = await supabaseAdmin
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
      
      complianceAssets = data || [];
      complianceError = error;
    } catch (titleError) {
      console.warn('Title column may not exist, trying fallback query:', titleError);
      
      // Fallback: try without title column
      try {
        const { data, error } = await supabaseAdmin
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
              name,
              description,
              frequency_months
            )
          `)
          .eq('building_id', buildingId);
        
        // Map name to title for consistency
        complianceAssets = (data || []).map(asset => ({
          ...asset,
          compliance_assets: asset.compliance_assets ? {
            ...asset.compliance_assets,
            title: asset.compliance_assets.name || asset.compliance_assets.category || 'Unknown Asset'
          } : null
        }));
        
        complianceError = error;
      } catch (fallbackError) {
        console.error('Both compliance queries failed:', fallbackError);
        complianceAssets = [];
        complianceError = fallbackError;
      }
    }

    // Calculate compliance summary
    const complianceSummary = {
      total: complianceAssets?.length || 0,
      compliant: complianceAssets?.filter(asset => asset.status === 'compliant').length || 0,
      pending: complianceAssets?.filter(asset => asset.status === 'pending').length || 0,
      overdue: complianceAssets?.filter(asset => asset.status === 'overdue').length || 0
    };

    // Fetch recent call logs
    const { data: callLogs = [], error: callLogsError } = await supabaseAdmin
      .from('call_logs')
      .select(`
        id,
        call_type,
        duration_minutes,
        notes,
        follow_up_required,
        follow_up_date,
        logged_at,
        units (unit_number, unit_label),
        leaseholders (name, full_name)
      `)
      .eq('building_id', buildingId)
      .order('logged_at', { ascending: false })
      .limit(10);

    // Fetch recent correspondence
    const { data: correspondence = [], error: correspondenceError } = await supabaseAdmin
      .from('correspondence')
      .select(`
        id,
        type,
        subject,
        direction,
        sent_at,
        received_at,
        status,
        created_at,
        units (unit_number, unit_label),
        leaseholders (name, full_name)
      `)
      .eq('building_id', buildingId)
      .order('created_at', { ascending: false })
      .limit(10);

    return NextResponse.json({
      building,
      buildingSetup,
      unitsLeaseholders,
      complianceSummary,
      complianceAssets,
      callLogs,
      correspondence,
      metadata: {
        totalUnits: unitsLeaseholders.length,
        totalLeaseholders: unitsLeaseholders.filter(u => u.leaseholder_id).length,
        directors: unitsLeaseholders.filter(u => u.is_director).length,
        lastUpdated: new Date().toISOString()
      }
    });

  } catch (error: any) {
    console.error('Error in building context API:', error);
    return NextResponse.json(
      { error: "Failed to fetch building context" },
      { status: 500 }
    );
  }
}
