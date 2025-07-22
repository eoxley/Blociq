import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export async function GET(req: NextRequest) {
  try {
    console.log("📋 Fetching communications log...");
    
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error("❌ User authentication failed:", userError);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("✅ User authenticated:", user.id);

    // Fetch communications sent by this user
    const { data: communications, error: communicationsError } = await supabase
      .from("communications_sent")
      .select(`
        *,
        communication_templates (
          id,
          name,
          type,
          category
        ),
        buildings (
          id,
          name,
          address
        )
      `)
      .eq("sent_by", user.id)
      .order("sent_at", { ascending: false });

    if (communicationsError) {
      console.error("❌ Error fetching communications:", communicationsError);
      return NextResponse.json({ 
        error: "Failed to fetch communications",
        details: communicationsError
      }, { status: 500 });
    }

    // Group communications by building
    const buildingGroups: any[] = [];
    const buildingMap = new Map();

    communications?.forEach((comm) => {
      const buildingId = comm.building_id;
      
      if (!buildingMap.has(buildingId)) {
        const buildingGroup = {
          building_id: buildingId,
          building_name: comm.buildings?.name || 'Unknown Building',
          building_address: comm.buildings?.address || '',
          communications: []
        };
        buildingGroups.push(buildingGroup);
        buildingMap.set(buildingId, buildingGroup);
      }
      
      buildingMap.get(buildingId).communications.push(comm);
    });

    // Calculate summary statistics
    const summary = {
      total_communications: communications?.length || 0,
      email_count: communications?.filter(c => c.method === 'email').length || 0,
      pdf_count: communications?.filter(c => c.method === 'pdf').length || 0,
      both_count: communications?.filter(c => c.method === 'both').length || 0,
      successful_sends: communications?.filter(c => c.status === 'sent').length || 0,
      failed_sends: communications?.filter(c => c.status === 'failed').length || 0,
      buildings_contacted: buildingGroups.length,
      templates_used: new Set(communications?.map(c => c.template_id)).size,
      last_communication_date: communications?.[0]?.sent_at || null
    };

    console.log(`✅ Found ${communications?.length || 0} communications across ${buildingGroups.length} buildings`);

    return NextResponse.json({
      communications: buildingGroups,
      summary,
      count: communications?.length || 0
    });

  } catch (error) {
    console.error("❌ Communications log fetch error:", error);
    return NextResponse.json({ 
      error: "Internal server error during communications log fetch",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
} 