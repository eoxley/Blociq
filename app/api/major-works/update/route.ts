import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  try {
    console.log("📝 Adding major works project update...");
    
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error("❌ User authentication failed:", userError);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("✅ User authenticated:", user.id);

    const body = await req.json();
    const { 
      project_id, 
      update_text, 
      action_type, 
      milestone_date, 
      cost_update, 
      completion_percentage,
      include_ai_suggestion = false 
    } = body;

    console.log("📋 Received update data:", {
      project_id,
      update_text: update_text ? `${update_text.substring(0, 50)}...` : null,
      action_type,
      milestone_date,
      cost_update,
      completion_percentage,
      include_ai_suggestion
    });

    // Validation
    if (!project_id) {
      console.error("❌ Validation failed: Missing project_id");
      return NextResponse.json({ error: "Project ID is required" }, { status: 400 });
    }

    if (!update_text || !update_text.trim()) {
      console.error("❌ Validation failed: Missing or empty update_text");
      return NextResponse.json({ error: "Update text is required" }, { status: 400 });
    }

    // Verify project exists
    const { data: project, error: projectError } = await supabase
      .from("major_works_projects")
      .select("id, title, status, building_id, buildings(name)")
      .eq("id", project_id)
      .single();

    if (projectError || !project) {
      console.error("❌ Project validation failed:", projectError);
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    console.log("✅ Project validated:", project.title);

    // Prepare update data
    const updateData = {
      project_id,
      action: action_type || "update",
      description: update_text.trim(),
      user_id: user.id,
      timestamp: new Date().toISOString(),
      metadata: {
        milestone_date: milestone_date || null,
        cost_update: cost_update || null,
        completion_percentage: completion_percentage || null,
        building_name: project.buildings?.name || null
      }
    };

    console.log("🔄 Inserting update into database...");

    // Insert the update
    const { data: newUpdate, error: insertError } = await supabase
      .from("major_works_logs")
      .insert(updateData)
      .select("*")
      .single();

    if (insertError) {
      console.error("❌ Database insert error:", insertError);
      return NextResponse.json({ 
        error: "Failed to save update",
        details: (insertError as any).message || "Unknown error"
      }, { status: 500 });
    }

    console.log("✅ Update saved successfully");

    // Update project completion percentage if provided
    if (completion_percentage !== undefined && completion_percentage !== null) {
      const { error: updateError } = await supabase
        .from("major_works_projects")
        .update({ 
          completion_percentage,
          updated_at: new Date().toISOString()
        })
        .eq("id", project_id);

      if (updateError) {
        console.warn("⚠️ Failed to update project completion percentage:", updateError);
      } else {
        console.log("✅ Project completion percentage updated to:", completion_percentage);
      }
    }

    // Update project status based on action type
    if (action_type) {
      let newStatus = project.status;
      
      switch (action_type) {
        case 'notice_of_intention':
          newStatus = 'notice_of_intention';
          break;
        case 'statement_of_estimates':
          newStatus = 'statement_of_estimates';
          break;
        case 'contractor_appointed':
          newStatus = 'contractor_appointed';
          break;
        case 'works_started':
          newStatus = 'works_in_progress';
          break;
        case 'works_completed':
          newStatus = 'completed';
          break;
        case 'project_on_hold':
          newStatus = 'on_hold';
          break;
        case 'project_cancelled':
          newStatus = 'cancelled';
          break;
      }

      if (newStatus !== project.status) {
        const { error: statusError } = await supabase
          .from("major_works_projects")
          .update({ 
            status: newStatus,
            updated_at: new Date().toISOString()
          })
          .eq("id", project_id);

        if (statusError) {
          console.warn("⚠️ Failed to update project status:", statusError);
        } else {
          console.log("✅ Project status updated to:", newStatus);
        }
      }
    }

    // AI Integration: Get next milestone suggestion
    let aiSuggestion = null;
    if (include_ai_suggestion) {
      try {
        console.log("🤖 Requesting AI milestone suggestion...");
        
        const aiResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/ask-ai`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: `Based on this major works project update: "${update_text}", what would be the next logical milestone or action for this project? Consider the current status: ${project.status}. Provide a brief, actionable suggestion.`,
            context: `Project: ${project.title}, Building: ${project.buildings?.name}, Current Status: ${project.status}`
          })
        });

        if (aiResponse.ok) {
          const aiResult = await aiResponse.json();
          aiSuggestion = aiResult.response || aiResult.message;
          console.log("✅ AI suggestion received:", aiSuggestion);
        } else {
          console.warn("⚠️ AI suggestion request failed:", aiResponse.status);
        }
      } catch (aiError) {
        console.warn("⚠️ AI suggestion error:", aiError);
      }
    }

    // Get updated project data
    const { data: updatedProject, error: fetchError } = await supabase
      .from("major_works_projects")
      .select("completion_percentage, status, updated_at")
      .eq("id", project_id)
      .single();

    const responseData = {
      message: "Project update added successfully",
      update: {
        id: newUpdate.id,
        action: newUpdate.action,
        description: newUpdate.description,
        timestamp: newUpdate.timestamp,
        metadata: newUpdate.metadata
      },
      project: {
        id: project_id,
        title: project.title,
        status: updatedProject?.status || project.status,
        completion_percentage: updatedProject?.completion_percentage || 0,
        updated_at: updatedProject?.updated_at || new Date().toISOString()
      },
      ai_suggestion: aiSuggestion,
      debug_info: {
        user_id: user.id,
        timestamp: new Date().toISOString(),
        action_type,
        completion_percentage
      }
    };

    console.log("🎉 Project update completed successfully");
    console.log("📊 Update summary:", {
      project_id,
      action_type,
      completion_percentage: updatedProject?.completion_percentage || 0,
      ai_suggestion: !!aiSuggestion
    });

    return NextResponse.json(responseData, { status: 201 });

  } catch (error) {
    console.error("❌ Project update error:", error);
    return NextResponse.json({ 
      error: "Internal server error during project update",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
} 