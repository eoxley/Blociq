import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  try {
    console.log("🏗️ Starting major works project creation...");
    
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error("❌ User authentication failed:", userError);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("✅ User authenticated:", user.id);

    const body = await req.json();
    const { title, description, building_id, start_date, estimated_cost, expected_duration, project_type, priority } = body;

    console.log("📋 Received project data:", {
      title,
      description: description ? `${description.substring(0, 50)}...` : null,
      building_id,
      start_date,
      estimated_cost,
      expected_duration,
      project_type,
      priority
    });

    // Enhanced validation
    if (!title || !title.trim()) {
      console.error("❌ Validation failed: Missing or empty title");
      return NextResponse.json({ error: "Project title is required" }, { status: 400 });
    }

    if (!building_id) {
      console.error("❌ Validation failed: Missing building_id");
      return NextResponse.json({ error: "Building ID is required" }, { status: 400 });
    }

    // Validate building exists and user has access
    const { data: building, error: buildingError } = await supabase
      .from("buildings")
      .select("id, name")
      .eq("id", building_id)
      .single();

    if (buildingError || !building) {
      console.error("❌ Building validation failed:", buildingError);
      return NextResponse.json({ error: "Building not found or access denied" }, { status: 404 });
    }

    console.log("✅ Building validated:", building.name);

    // Prepare project data with enhanced fields
    const projectData = {
      title: title.trim(),
      description: description?.trim() || null,
      building_id,
      start_date: start_date || new Date().toISOString(),
      estimated_cost: estimated_cost || null,
      expected_duration: expected_duration || null,
      project_type: project_type || 'general',
      priority: priority || 'medium',
      status: 'planning', // Default status for new projects
      created_by: user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      // Additional fields for better project management
      completion_percentage: 0,
      is_active: true,
      budget_allocated: estimated_cost || 0,
      actual_cost: 0,
      notes: null,
      attachments: [],
      stakeholders: [],
      milestones: []
    };

    console.log("🔄 Inserting project into database...");

    const { data: newProject, error: insertError } = await supabase
      .from("major_works_projects")
      .insert(projectData)
      .select("*")
      .single();

    if (insertError) {
      console.error("❌ Database insert error:", insertError);
      return NextResponse.json({ 
        error: "Failed to create project",
        details: insertError.message 
      }, { status: 500 });
    }

    console.log("✅ Project created successfully:", {
      id: newProject.id,
      title: newProject.title,
      building_id: newProject.building_id,
      status: newProject.status
    });

    // Create initial project log entry
    try {
      await supabase.from("major_works_logs").insert({
        project_id: newProject.id,
        action: "project_created",
        description: `Project "${newProject.title}" created`,
        user_id: user.id,
        timestamp: new Date().toISOString(),
        metadata: {
          building_name: building.name,
          project_type: newProject.project_type,
          priority: newProject.priority
        }
      });
    } catch (logError) {
      console.warn("⚠️ Failed to create project log entry:", logError);
      // Don't fail the request if logging fails
    }

    const responseData = {
      message: "Major works project created successfully",
      project: {
        id: newProject.id,
        title: newProject.title,
        description: newProject.description,
        building_id: newProject.building_id,
        building_name: building.name,
        start_date: newProject.start_date,
        status: newProject.status,
        project_type: newProject.project_type,
        priority: newProject.priority,
        created_at: newProject.created_at
      },
      debug_info: {
        created_by: user.id,
        timestamp: new Date().toISOString()
      }
    };

    console.log("🎉 Major works project creation completed successfully");
    return NextResponse.json(responseData, { status: 201 });

  } catch (error) {
    console.error("❌ Major works project creation error:", error);
    return NextResponse.json({ 
      error: "Internal server error during project creation",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
} 