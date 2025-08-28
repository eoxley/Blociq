import { NextResponse } from "next/server";
import { getUnitsLeaseholders } from "@/lib/queries/getUnitsLeaseholders";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { safeQuery, ensureRequiredTables } from '@/lib/database-setup';

export async function POST(req: Request) {
  try {
    const { buildingId } = await req.json();
    
    if (!buildingId) {
      return NextResponse.json({ error: "Building ID is required" }, { status: 400 });
    }

    // Ensure required tables exist
    await ensureRequiredTables();

    // Check if buildings table exists
    const { data: buildingsExist, error: buildingsTableError, tableExists: buildingsTableExists } = await safeQuery(
      'buildings',
      async () => {
        const result = await supabaseAdmin
          .from('buildings')
          .select('count', { count: 'exact', head: true });
        return result;
      }
    );

    if (!buildingsTableExists) {
      console.log('🏢 buildings table not found, returning empty context');
      return NextResponse.json({
        building: null,
        buildingSetup: null,
        unitsLeaseholders: [],
        complianceSummary: { total: 0, compliant: 0, pending: 0, overdue: 0 },
        callLogs: [],
        correspondence: [],
        message: 'No buildings table found - database may be empty. Please set up your first building to get started.',
        databaseEmpty: true
      });
    }

    // Check if any buildings exist
    const { data: buildingCount, error: countError } = await supabaseAdmin
      .from('buildings')
      .select('*', { count: 'exact', head: true });

    if (countError || (buildingCount?.length || 0) === 0) {
      console.log('🏢 No buildings found in database, returning empty context');
      return NextResponse.json({
        building: null,
        buildingSetup: null,
        unitsLeaseholders: [],
        complianceSummary: { total: 0, compliant: 0, pending: 0, overdue: 0 },
        callLogs: [],
        correspondence: [],
        message: 'No buildings found in your portfolio yet. Please add your first building to get started.',
        databaseEmpty: false,
        noBuildings: true
      });
    }

    // Fetch building information with safe query
    const { data: building, error: buildingError, tableExists: buildingTableExists } = await safeQuery(
      'buildings',
      async () => {
        const result = await supabaseAdmin
          .from('buildings')
          .select('*')
          .eq('id', buildingId)
          .single();
        return result;
      }
    );

    if (!buildingTableExists || buildingError || !building) {
      console.log(`🏢 Building ${buildingId} not found or table error, returning empty context`);
      return NextResponse.json({
        building: null,
        buildingSetup: null,
        unitsLeaseholders: [],
        complianceSummary: { total: 0, compliant: 0, pending: 0, overdue: 0 },
        callLogs: [],
        correspondence: [],
        message: `Building ${buildingId} not found. Please check the building ID or add the building to your portfolio.`,
        buildingNotFound: true
      });
    }

    // Fetch building setup with safe query
    const { data: buildingSetup, error: setupError } = await safeQuery(
      'building_setup',
      async () => {
        const result = await supabaseAdmin
          .from('building_setup')
          .select('*')
          .eq('building_id', buildingId)
          .single();
        return result;
      }
    );

    // Fetch units and leaseholders
    let unitsLeaseholders = [];
    try {
      unitsLeaseholders = await getUnitsLeaseholders(buildingId);
    } catch (error) {
      console.log('⚠️ Error fetching units/leaseholders, using empty array:', error);
    }

    // Fetch compliance summary with safe query
    const { data: complianceAssets = [], error: complianceError } = await safeQuery(
      'building_compliance_assets',
      async () => {
        const result = await supabaseAdmin
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
        return result;
      }
    );

    // Calculate compliance summary
    const complianceSummary = {
      total: complianceAssets?.length || 0,
      compliant: complianceAssets?.filter(asset => asset.status === 'compliant').length || 0,
      pending: complianceAssets?.filter(asset => asset.status === 'pending').length || 0,
      overdue: complianceAssets?.filter(asset => asset.status === 'overdue').length || 0
    };

    // Fetch recent call logs with safe query
    const { data: callLogs = [], error: callLogsError } = await safeQuery(
      'call_logs',
      async () => {
        const result = await supabaseAdmin
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
        return result;
      }
    );

    // Fetch recent correspondence with safe query
    const { data: correspondence = [], error: correspondenceError } = await safeQuery(
      'correspondence',
      async () => {
        const result = await supabaseAdmin
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
        return result;
      }
    );

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
