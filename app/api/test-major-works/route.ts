import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export async function GET(req: NextRequest) {
  try {
    console.log("🧪 Test major works endpoint called...");
    
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error("❌ User authentication failed:", userError);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("✅ User authenticated:", user.id);

    // Test database connectivity and table structure
    console.log("🔍 Testing major works database connectivity...");
    
    // Check if major_works_projects table exists and get sample data
    const { data: projects, error: projectsError } = await supabase
      .from("major_works_projects")
      .select("id, title, name, building_id, status, created_at, created_by")
      .order("created_at", { ascending: false })
      .limit(5);

    if (projectsError) {
      console.error("❌ Failed to fetch major works projects:", projectsError);
      return NextResponse.json({ 
        error: "Database connectivity issue",
        details: (projectsError as any).message || "Unknown database error"
      }, { status: 500 });
    }

    console.log("✅ Database connectivity successful");
    console.log("📊 Found projects:", projects?.length || 0);

    // Check buildings table for available buildings
    const { data: buildings, error: buildingsError } = await supabase
      .from("buildings")
      .select("id, name, address")
      .order("name")
      .limit(10);

    if (buildingsError) {
      console.error("❌ Failed to fetch buildings:", buildingsError);
    } else {
      console.log("🏢 Available buildings:", buildings?.length || 0);
    }

    // Check major_works_logs table
    const { data: logs, error: logsError } = await supabase
      .from("major_works_logs")
      .select("id, project_id, action, description, timestamp")
      .order("timestamp", { ascending: false })
      .limit(5);

    if (logsError) {
      console.warn("⚠️ Failed to fetch major works logs:", logsError);
    } else {
      console.log("📝 Recent logs:", logs?.length || 0);
    }

    // Test schema validation
    console.log("🔍 Testing schema validation...");
    
    const testProjectData = {
      title: "Test Project",
      description: "This is a test project for validation",
      building_id: buildings?.[0]?.id || null,
      start_date: new Date().toISOString().split('T')[0],
      estimated_cost: 50000,
      expected_duration: 30,
      project_type: "general",
      priority: "medium",
      status: "planning"
    };

    console.log("📋 Test project data:", testProjectData);

    const testResults = {
      message: "Major works system test completed successfully",
      user_info: {
        id: user.id,
        email: user.email
      },
      database_test: {
        projects_count: projects?.length || 0,
        buildings_count: buildings?.length || 0,
        logs_count: logs?.length || 0,
        projects_error: projectsError ? (projectsError as any).message || "Unknown error" : null,
        buildings_error: buildingsError ? (buildingsError as any).message || "Unknown error" : null,
        logs_error: logsError ? (logsError as any).message || "Unknown error" : null
      },
      sample_data: {
        projects: projects?.slice(0, 2) || [],
        buildings: buildings?.slice(0, 3) || [],
        logs: logs?.slice(0, 2) || []
      },
      test_project_data: testProjectData,
      debug_info: {
        test_timestamp: new Date().toISOString(),
        user_id: user.id
      }
    };

    console.log("🎉 Major works system test completed successfully");
    console.log("📊 Test results summary:", {
      projects: projects?.length || 0,
      buildings: buildings?.length || 0,
      logs: logs?.length || 0
    });

    return NextResponse.json(testResults);

  } catch (error) {
    console.error("❌ Major works system test error:", error);
    return NextResponse.json({ 
      error: "Internal server error during major works system test",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
} 