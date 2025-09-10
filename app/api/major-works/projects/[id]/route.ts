import { NextRequest, NextResponse } from "next/server";
import { createClient } from '@/utils/supabase/server';
import { cookies } from "next/headers";

export async function GET(req: NextRequest, { params }: { params: { id: string }}) {
  try {
    console.log(`📋 Fetching major works project ${params.id}...`);
    
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

    // Get the project with building information
    const { data: project, error: projectError } = await supabase
      .from("major_works_projects")
      .select(`
        *,
        buildings!building_id (
          id,
          name,
          address
        )
      `)
      .eq("id", params.id)
      .single();

    if (projectError || !project) {
      console.error("❌ Project not found:", projectError);
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    console.log("✅ Project fetched successfully:", project.title);

    return NextResponse.json({ 
      success: true,
      data: project
    });

  } catch (error) {
    console.error("❌ Major works project fetch error:", error);
    return NextResponse.json({ 
      success: false,
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string }}) {
  try {
    console.log(`🔄 Updating major works project ${params.id}...`);
    
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
    
    // Add updated_at timestamp
    const updateData = {
      ...body,
      updated_at: new Date().toISOString()
    };

    console.log("🔄 Updating project in database...");

    const { data: updatedProject, error: updateError } = await supabase
      .from("major_works_projects")
      .update(updateData)
      .eq("id", params.id)
      .select("*")
      .single();

    if (updateError) {
      console.error("❌ Database update error:", updateError);
      return NextResponse.json({ 
        error: "Failed to update project",
        details: updateError.message 
      }, { status: 500 });
    }

    console.log("✅ Project updated successfully:", updatedProject.title);

    return NextResponse.json({ 
      success: true,
      data: updatedProject,
      message: "Project updated successfully"
    });

  } catch (error) {
    console.error("❌ Major works project update error:", error);
    return NextResponse.json({ 
      success: false,
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string }}) {
  try {
    console.log(`🗑️ Deleting major works project ${params.id}...`);
    
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

    console.log("🔄 Deleting project from database...");

    const { error: deleteError } = await supabase
      .from("major_works_projects")
      .delete()
      .eq("id", params.id);

    if (deleteError) {
      console.error("❌ Database delete error:", deleteError);
      return NextResponse.json({ 
        error: "Failed to delete project",
        details: deleteError.message 
      }, { status: 500 });
    }

    console.log("✅ Project deleted successfully");

    return NextResponse.json({ 
      success: true,
      message: "Project deleted successfully"
    });

  } catch (error) {
    console.error("❌ Major works project delete error:", error);
    return NextResponse.json({ 
      success: false,
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
