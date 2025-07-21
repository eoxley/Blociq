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

    // Get query parameters for filtering
    const { searchParams } = new URL(req.url);
    const building_id = searchParams.get('building_id');
    const template_id = searchParams.get('template_id');
    const method = searchParams.get('method');
    const status = searchParams.get('status');
    const date_from = searchParams.get('date_from');
    const date_to = searchParams.get('date_to');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Build query
    let query = supabase
      .from("communications_log")
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
      .order("sent_at", { ascending: false })
      .limit(limit);

    // Apply filters
    if (building_id) {
      query = query.eq("building_id", building_id);
    }
    if (template_id) {
      query = query.eq("template_id", template_id);
    }
    if (method) {
      query = query.eq("method", method);
    }
    if (status) {
      query = query.eq("status", status);
    }
    if (date_from) {
      query = query.gte("sent_at", date_from);
    }
    if (date_to) {
      query = query.lte("sent_at", date_to);
    }

    const { data: communications, error: communicationsError } = await query;

    if (communicationsError) {
      console.error("❌ Failed to fetch communications log:", communicationsError);
      return NextResponse.json({ 
        error: "Failed to fetch communications log",
        details: (communicationsError as any).message || "Unknown error"
      }, { status: 500 });
    }

    console.log("✅ Communications log fetched successfully:", communications?.length || 0);

    // Get statistics
    const { data: stats } = await supabase
      .from("communication_stats")
      .select("*")
      .single();

    // Get recipient details for each communication
    const communicationsWithRecipients = await Promise.all(
      (communications || []).map(async (comm) => {
        const { data: recipients } = await supabase
          .from("communication_recipients")
          .select("*")
          .eq("communication_id", comm.id)
          .order("sent_at", { ascending: false });

        return {
          ...comm,
          recipients: recipients || [],
          recipient_count: recipients?.length || 0
        };
      })
    );

    // Group by building for easier frontend consumption
    const groupedByBuilding = communicationsWithRecipients.reduce((acc: any, comm) => {
      const buildingId = comm.building_id;
      const buildingName = comm.buildings?.name || "Unknown Building";
      
      if (!acc[buildingId]) {
        acc[buildingId] = {
          building_id: buildingId,
          building_name: buildingName,
          building_address: comm.buildings?.address || "",
          communications: []
        };
      }
      
      acc[buildingId].communications.push(comm);
      return acc;
    }, {});

    const groupedCommunications = Object.values(groupedByBuilding).sort((a: any, b: any) => 
      a.building_name.localeCompare(b.building_name)
    );

    const responseData = {
      message: "Communications log fetched successfully",
      communications: groupedCommunications,
      summary: {
        total_communications: stats?.total_communications || 0,
        email_count: stats?.email_count || 0,
        pdf_count: stats?.pdf_count || 0,
        both_count: stats?.both_count || 0,
        successful_sends: stats?.successful_sends || 0,
        failed_sends: stats?.failed_sends || 0,
        buildings_contacted: stats?.buildings_contacted || 0,
        templates_used: stats?.templates_used || 0,
        last_communication_date: stats?.last_communication_date
      },
      filters: {
        building_id,
        template_id,
        method,
        status,
        date_from,
        date_to,
        limit
      },
      debug_info: {
        user_id: user.id,
        timestamp: new Date().toISOString(),
        communications_count: communications?.length || 0,
        buildings_count: groupedCommunications.length
      }
    };

    console.log("🎉 Communications log fetch completed successfully");
    console.log("📊 Summary:", {
      total_communications: stats?.total_communications || 0,
      email_count: stats?.email_count || 0,
      pdf_count: stats?.pdf_count || 0,
      buildings: groupedCommunications.length
    });

    return NextResponse.json(responseData);

  } catch (error) {
    console.error("❌ Communications log error:", error);
    return NextResponse.json({ 
      error: "Internal server error during communications log fetch",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
} 