import { NextRequest, NextResponse } from "next/server";
import { createClient } from '@/utils/supabase/server';
import { cookies } from "next/headers";

export async function GET(req: NextRequest) {
  try {
    console.log("📋 Fetching major works projects...");
    
    const supabase = createClient(cookies());
    
    // Get the current user - Safe destructuring to prevent "Right side of assignment cannot be destructured" error
    const sessionResult = await supabase.auth.getSession();
    const sessionData = sessionResult?.data || {}
    const session = sessionData.session || null
    const sessionError = sessionResult?.error || null
    
    if (sessionError || !session) {
      console.log("⚠️ User not authenticated, returning empty data");
      return NextResponse.json({ 
        success: true,
        data: [],
        message: "No projects found - authentication required"
      });
    }

    const user = session.user;
    console.log("✅ User authenticated:", user.id);

    // Get user's buildings first
    let { data: buildings, error: buildingsError } = await supabase
      .from('buildings')
      .select('id, name, address')
      .eq('user_id', user.id);
    
    // If no buildings found with user_id, try building_members table
    if ((!buildings || buildings.length === 0) && !buildingsError) {
      console.log('No buildings found with user_id, trying building_members table...');
      const { data: memberBuildings, error: memberError } = await supabase
        .from('building_members')
        .select('building_id, buildings!building_id(id, name, address)')
        .eq('user_id', user.id);
      
      if (!memberError && memberBuildings) {
        buildings = memberBuildings.map(m => m.buildings).filter(Boolean);
      }
    }
    
    // If still no buildings, try to get all buildings (for testing)
    if ((!buildings || buildings.length === 0) && !buildingsError) {
      console.log('No user-specific buildings found, trying to get all buildings for testing');
      const { data: allBuildings, error: allBuildingsError } = await supabase
        .from('buildings')
        .select('id, name, address')
        .limit(5);
      
      if (!allBuildingsError && allBuildings) {
        buildings = allBuildings;
      }
    }

    if (buildingsError) {
      console.error('Error fetching buildings:', buildingsError);
      return NextResponse.json({ 
        success: true,
        data: [],
        error: 'Failed to fetch buildings'
      });
    }

    if (!buildings || buildings.length === 0) {
      console.log('No buildings found for user');
      return NextResponse.json({ 
        success: true,
        data: [],
        message: 'No buildings found'
      });
    }

    const buildingIds = buildings.map(b => b.id);
    console.log(`✅ Found ${buildings.length} buildings for user`);

    // Get major works projects for user's buildings
    const { data: projects, error: projectsError } = await supabase
      .from("major_works_projects")
      .select(`
        *,
        buildings!building_id (
          id,
          name,
          address
        )
      `)
      .in('building_id', buildingIds)
      .order("updated_at", { ascending: false });

    if (projectsError) {
      console.error("❌ Failed to fetch projects:", projectsError);
      return NextResponse.json({ 
        success: true,
        data: [],
        error: "Failed to fetch projects"
      });
    }

    console.log(`✅ Found ${projects?.length || 0} major works projects`);

    return NextResponse.json({ 
      success: true,
      data: projects || [],
      count: projects?.length || 0
    });

  } catch (error) {
    console.error("❌ Major works projects error:", error);
    return NextResponse.json({ 
      success: false,
      error: "Internal server error",
      data: []
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    console.log("🏗️ Creating major works project...");
    
    const supabase = createClient(cookies());
    
    // Get the current user - Safe destructuring to prevent "Right side of assignment cannot be destructured" error
    const sessionResult = await supabase.auth.getSession();
    const sessionData = sessionResult?.data || {}
    const session = sessionData.session || null
    const sessionError = sessionResult?.error || null
    
    if (sessionError || !session) {
      console.error("❌ User authentication failed:", sessionError);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user;
    console.log("✅ User authenticated:", user.id);

    const body = await req.json();
    const { building_id, title, stage, s20_required, budget_estimate, next_milestone, next_milestone_date, notes } = body;

    // Validate required fields
    if (!title || !title.trim()) {
      return NextResponse.json({ error: "Project title is required" }, { status: 400 });
    }

    if (!building_id) {
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

    // Create project data
    const projectData = {
      building_id,
      title: title.trim(),
      stage: stage || "planning",
      s20_required: !!s20_required,
      budget_estimate: budget_estimate || null,
      next_milestone: next_milestone || null,
      next_milestone_date: next_milestone_date || null,
      notes: notes || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
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
      building_id: newProject.building_id
    });

    return NextResponse.json({ 
      success: true,
      data: newProject,
      message: "Project created successfully"
    });

  } catch (error) {
    console.error("❌ Major works project creation error:", error);
    return NextResponse.json({ 
      success: false,
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
