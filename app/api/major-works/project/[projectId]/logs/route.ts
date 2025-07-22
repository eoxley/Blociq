import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    console.log("📝 Logging project event...");
    
    const { projectId } = await params;
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error("❌ User authentication failed:", userError);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("✅ User authenticated:", user.id);
    console.log("🏗️ Project ID:", projectId);

    // Verify the project exists
    const { data: project, error: projectError } = await supabase
      .from("major_works_projects")
      .select("id, title, building_id")
      .eq("id", projectId)
      .single();

    if (projectError || !project) {
      console.error("❌ Project not found:", projectError);
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    console.log("✅ Project verified:", project.title);

    // Parse the request body
    const body = await req.json();
    const { action, description, timestamp, metadata } = body;

    if (!action || !description) {
      return NextResponse.json({ 
        error: "Missing required fields: action and description are required" 
      }, { status: 400 });
    }

    // Insert the log entry
    const { data: logEntry, error: logError } = await supabase
      .from("major_works_logs")
      .insert({
        project_id: projectId,
        action: action,
        description: description,
        timestamp: timestamp || new Date().toISOString(),
        metadata: metadata || null,
        created_by: user.id
      })
      .select()
      .single();

    if (logError) {
      console.error("❌ Failed to create log entry:", logError);
      return NextResponse.json({ 
        error: "Failed to create log entry",
        details: logError.message 
      }, { status: 500 });
    }

    console.log("✅ Log entry created successfully:", logEntry.id);

    // Update project completion percentage if specified in metadata
    if (metadata?.completion_percentage !== undefined) {
      const { error: updateError } = await supabase
        .from("major_works_projects")
        .update({ 
          completion_percentage: metadata.completion_percentage,
          updated_at: new Date().toISOString()
        })
        .eq("id", projectId);

      if (updateError) {
        console.warn("⚠️ Failed to update project completion percentage:", updateError);
      } else {
        console.log("✅ Project completion percentage updated to:", metadata.completion_percentage);
      }
    }

    // Update project status if specified in metadata
    if (metadata?.status) {
      const { error: statusError } = await supabase
        .from("major_works_projects")
        .update({ 
          status: metadata.status,
          updated_at: new Date().toISOString()
        })
        .eq("id", projectId);

      if (statusError) {
        console.warn("⚠️ Failed to update project status:", statusError);
      } else {
        console.log("✅ Project status updated to:", metadata.status);
      }
    }

    const responseData = {
      message: "Project event logged successfully",
      log_entry: {
        id: logEntry.id,
        action: logEntry.action,
        description: logEntry.description,
        timestamp: logEntry.timestamp,
        metadata: logEntry.metadata,
        created_at: logEntry.created_at
      },
      project: {
        id: project.id,
        title: project.title,
        building_id: project.building_id
      },
      debug_info: {
        user_id: user.id,
        timestamp: new Date().toISOString()
      }
    };

    console.log("🎉 Project event logging completed successfully");

    return NextResponse.json(responseData);

  } catch (error) {
    console.error("❌ Project event logging error:", error);
    return NextResponse.json({ 
      error: "Internal server error during project event logging",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    console.log("📝 Fetching project logs...");
    
    const { projectId } = await params;
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error("❌ User authentication failed:", userError);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("✅ User authenticated:", user.id);
    console.log("🏗️ Project ID:", projectId);

    // Get URL parameters for filtering
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build the query
    let query = supabase
      .from("major_works_logs")
      .select("*")
      .eq("project_id", projectId)
      .order("timestamp", { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (action) {
      query = query.eq("action", action);
    }

    const { data: logs, error: logsError } = await query;

    if (logsError) {
      console.error("❌ Failed to fetch logs:", logsError);
      return NextResponse.json({ 
        error: "Failed to fetch project logs",
        details: logsError.message 
      }, { status: 500 });
    }

    console.log("✅ Logs fetched successfully:", logs?.length || 0);

    // Group logs by action type
    const logsByAction = logs?.reduce((acc: any, log: any) => {
      const action = log.action;
      if (!acc[action]) {
        acc[action] = [];
      }
      acc[action].push(log);
      return acc;
    }, {}) || {};

    // Get total count for pagination
    const { count: totalCount } = await supabase
      .from("major_works_logs")
      .select("*", { count: "exact", head: true })
      .eq("project_id", projectId);

    const responseData = {
      message: "Project logs fetched successfully",
      project_id: projectId,
      logs: logs || [],
      logs_by_action: logsByAction,
      pagination: {
        limit,
        offset,
        total_count: totalCount || 0,
        has_more: (offset + limit) < (totalCount || 0)
      },
      summary: {
        total_logs: totalCount || 0,
        action_types: Object.keys(logsByAction),
        recent_activity: logs?.slice(0, 5) || []
      },
      filters_applied: {
        action,
        limit,
        offset
      },
      debug_info: {
        user_id: user.id,
        timestamp: new Date().toISOString(),
        logs_count: logs?.length || 0
      }
    };

    console.log("🎉 Project logs fetch completed successfully");

    return NextResponse.json(responseData);

  } catch (error) {
    console.error("❌ Project logs fetch error:", error);
    return NextResponse.json({ 
      error: "Internal server error during project logs fetch",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
} 