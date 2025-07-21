import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export async function GET(req: NextRequest) {
  try {
    console.log("📋 Fetching major works projects list...");
    
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error("❌ User authentication failed:", userError);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("✅ User authenticated:", user.id);

    // Get all major works projects with building information
    const { data: projects, error: projectsError } = await supabase
      .from("major_works_projects")
      .select(`
        *,
        buildings (
          id,
          name,
          address
        ),
        major_works_logs (
          id,
          action,
          description,
          timestamp,
          metadata
        )
      `)
      .order("created_at", { ascending: false });

    if (projectsError) {
      console.error("❌ Failed to fetch projects:", projectsError);
      return NextResponse.json({ 
        error: "Failed to fetch projects",
        details: (projectsError as any).message || "Unknown error"
      }, { status: 500 });
    }

    console.log("✅ Projects fetched successfully:", projects?.length || 0);

    // Group projects by building
    const projectsByBuilding = projects?.reduce((acc: any, project: any) => {
      const buildingId = project.building_id;
      const buildingName = project.buildings?.name || "Unknown Building";
      
      if (!acc[buildingId]) {
        acc[buildingId] = {
          building_id: buildingId,
          building_name: buildingName,
          building_address: project.buildings?.address || "",
          projects: []
        };
      }
      
      // Get the latest update for this project
      const latestUpdate = project.major_works_logs?.[0] || null;
      
      acc[buildingId].projects.push({
        id: project.id,
        title: project.title || project.name,
        description: project.description,
        status: project.status,
        start_date: project.start_date,
        estimated_cost: project.estimated_cost,
        actual_cost: project.actual_cost,
        completion_percentage: project.completion_percentage || 0,
        priority: project.priority,
        project_type: project.project_type,
        is_active: project.is_active,
        created_at: project.created_at,
        updated_at: project.updated_at,
        latest_update: latestUpdate ? {
          action: latestUpdate.action,
          description: latestUpdate.description,
          timestamp: latestUpdate.timestamp,
          metadata: latestUpdate.metadata
        } : null,
        total_updates: project.major_works_logs?.length || 0
      });
      
      return acc;
    }, {}) || {};

    // Convert to array and sort by building name
    const groupedProjects = Object.values(projectsByBuilding).sort((a: any, b: any) => 
      a.building_name.localeCompare(b.building_name)
    );

    // Calculate summary statistics
    const totalProjects = projects?.length || 0;
    const activeProjects = projects?.filter((p: any) => p.is_active !== false).length || 0;
    const completedProjects = projects?.filter((p: any) => p.status === 'completed').length || 0;
    const totalBudget = projects?.reduce((sum: number, p: any) => sum + (p.estimated_cost || 0), 0) || 0;

    const responseData = {
      message: "Major works projects fetched successfully",
      summary: {
        total_projects: totalProjects,
        active_projects: activeProjects,
        completed_projects: completedProjects,
        total_budget: totalBudget
      },
      projects_by_building: groupedProjects,
      debug_info: {
        user_id: user.id,
        timestamp: new Date().toISOString(),
        projects_count: totalProjects,
        buildings_count: groupedProjects.length
      }
    };

    console.log("🎉 Major works projects list completed successfully");
    console.log("📊 Summary:", {
      total_projects: totalProjects,
      active_projects: activeProjects,
      completed_projects: completedProjects,
      buildings: groupedProjects.length
    });

    return NextResponse.json(responseData);

  } catch (error) {
    console.error("❌ Major works list error:", error);
    return NextResponse.json({ 
      error: "Internal server error during projects fetch",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
} 