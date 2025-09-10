import { NextRequest, NextResponse } from "next/server";
import { createClient } from '@/utils/supabase/server';
import { cookies } from "next/headers";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ buildingId: string }> }
) {
  try {
    console.log("🏗️ Fetching major works for building...");
    
    const { buildingId } = await params;
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
    console.log("🏢 Building ID:", buildingId);

    // Get URL parameters for filtering
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const consultationStage = searchParams.get('consultation_stage');
    const includeDocuments = searchParams.get('include_documents') === 'true';
    const includeLogs = searchParams.get('include_logs') === 'true';
    const includeObservations = searchParams.get('include_observations') === 'true';

    // Build the select query based on what's requested
    let selectQuery = `
      *,
      buildings (
        id,
        name,
        address
      )
    `;

    if (includeDocuments) {
      selectQuery += `,
        major_works_documents (
          id,
          title,
          description,
          document_type,
          file_url,
          file_size,
          file_type,
          uploaded_at,
          is_public
        )
      `;
    }

    if (includeLogs) {
      selectQuery += `,
        major_works_logs (
          id,
          action,
          description,
          timestamp,
          metadata,
          created_at
        )
      `;
    }

    if (includeObservations) {
      selectQuery += `,
        major_works_observations (
          id,
          observation_type,
          title,
          description,
          location,
          photos,
          weather_conditions,
          personnel_present,
          created_at
        )
      `;
    }

    // Build the query
    let query = supabase
      .from("major_works_projects")
      .select(selectQuery)
      .eq("building_id", buildingId)
      .order("created_at", { ascending: false });

    // Apply filters
    if (status) {
      query = query.eq("status", status);
    }

    if (consultationStage) {
      query = query.eq("consultation_stage", consultationStage);
    }

    const { data: projects, error: projectsError } = await query;

    if (projectsError) {
      console.error("❌ Failed to fetch projects:", projectsError);
      return NextResponse.json({ 
        error: "Failed to fetch major works projects",
        details: (projectsError as any).message || "Unknown error"
      }, { status: 500 });
    }

    console.log("✅ Projects fetched successfully:", projects?.length || 0);

    // Process and enhance the data
    const enhancedProjects = projects?.map((project: any) => {
      // Calculate project statistics
      const totalDocuments = project.major_works_documents?.length || 0;
      const totalLogs = project.major_works_logs?.length || 0;
      const totalObservations = project.major_works_observations?.length || 0;
      
      // Get latest log entry
      const latestLog = project.major_works_logs?.[0] || null;
      
      // Get latest observation
      const latestObservation = project.major_works_observations?.[0] || null;

      // Calculate days since start/estimated completion
      const daysSinceStart = project.actual_start_date 
        ? Math.floor((new Date().getTime() - new Date(project.actual_start_date).getTime()) / (1000 * 60 * 60 * 24))
        : null;
      
      const daysUntilCompletion = project.estimated_completion_date
        ? Math.floor((new Date(project.estimated_completion_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
        : null;

      // Determine project health/status
      let projectHealth = 'good';
      if (project.status === 'ongoing' && daysUntilCompletion !== null && daysUntilCompletion < 0) {
        projectHealth = 'overdue';
      } else if (project.status === 'ongoing' && daysUntilCompletion !== null && daysUntilCompletion < 7) {
        projectHealth = 'urgent';
      } else if (project.completion_percentage < 25 && daysSinceStart !== null && daysSinceStart > 30) {
        projectHealth = 'delayed';
      }

      return {
        id: project.id,
        title: project.title,
        description: project.description,
        status: project.status,
        consultation_stage: project.consultation_stage,
        section20_notice_issued: project.section20_notice_issued,
        estimated_start_date: project.estimated_start_date,
        actual_start_date: project.actual_start_date,
        estimated_completion_date: project.estimated_completion_date,
        actual_completion_date: project.actual_completion_date,
        estimated_cost: project.estimated_cost,
        actual_cost: project.actual_cost,
        completion_percentage: project.completion_percentage,
        priority: project.priority,
        project_type: project.project_type,
        contractor_name: project.contractor_name,
        contractor_email: project.contractor_email,
        contractor_phone: project.contractor_phone,
        is_active: project.is_active,
        created_at: project.created_at,
        updated_at: project.updated_at,
        
        // Enhanced data
        statistics: {
          total_documents: totalDocuments,
          total_logs: totalLogs,
          total_observations: totalObservations,
          days_since_start: daysSinceStart,
          days_until_completion: daysUntilCompletion
        },
        
        project_health: projectHealth,
        
        latest_activity: latestLog ? {
          type: 'log',
          action: latestLog.action,
          description: latestLog.description,
          timestamp: latestLog.timestamp,
          metadata: latestLog.metadata
        } : latestObservation ? {
          type: 'observation',
          observation_type: latestObservation.observation_type,
          title: latestObservation.title,
          description: latestObservation.description,
          timestamp: latestObservation.created_at
        } : null,

        // Include related data if requested
        documents: includeDocuments ? project.major_works_documents || [] : undefined,
        logs: includeLogs ? project.major_works_logs || [] : undefined,
        observations: includeObservations ? project.major_works_observations || [] : undefined
      };
    }) || [];

    // Calculate summary statistics
    const totalProjects = enhancedProjects.length;
    const activeProjects = enhancedProjects.filter(p => p.status === 'ongoing').length;
    const plannedProjects = enhancedProjects.filter(p => p.status === 'planned').length;
    const completedProjects = enhancedProjects.filter(p => p.status === 'completed').length;
    const totalEstimatedCost = enhancedProjects.reduce((sum, p) => sum + (p.estimated_cost || 0), 0);
    const totalActualCost = enhancedProjects.reduce((sum, p) => sum + (p.actual_cost || 0), 0);
    const averageCompletionPercentage = enhancedProjects.length > 0 
      ? Math.round(enhancedProjects.reduce((sum, p) => sum + p.completion_percentage, 0) / enhancedProjects.length)
      : 0;

    // Group by status for timeline view
    const projectsByStatus = {
      planned: enhancedProjects.filter(p => p.status === 'planned'),
      ongoing: enhancedProjects.filter(p => p.status === 'ongoing'),
      completed: enhancedProjects.filter(p => p.status === 'completed'),
      cancelled: enhancedProjects.filter(p => p.status === 'cancelled')
    };

    const responseData = {
      message: "Major works projects fetched successfully",
      building_id: buildingId,
      summary: {
        total_projects: totalProjects,
        active_projects: activeProjects,
        planned_projects: plannedProjects,
        completed_projects: completedProjects,
        total_estimated_cost: totalEstimatedCost,
        total_actual_cost: totalActualCost,
        average_completion_percentage: averageCompletionPercentage
      },
      projects: enhancedProjects,
      projects_by_status: projectsByStatus,
      filters_applied: {
        status,
        consultation_stage: consultationStage,
        include_documents: includeDocuments,
        include_logs: includeLogs,
        include_observations: includeObservations
      },
      debug_info: {
        user_id: user.id,
        timestamp: new Date().toISOString(),
        projects_count: totalProjects,
        query_params: Object.fromEntries(searchParams.entries())
      }
    };

    console.log("🎉 Major works fetch completed successfully");
    console.log("📊 Summary:", {
      total_projects: totalProjects,
      active_projects: activeProjects,
      completed_projects: completedProjects,
      total_estimated_cost: totalEstimatedCost
    });

    return NextResponse.json(responseData);

  } catch (error) {
    console.error("❌ Major works fetch error:", error);
    return NextResponse.json({ 
      error: "Internal server error during major works fetch",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
} 