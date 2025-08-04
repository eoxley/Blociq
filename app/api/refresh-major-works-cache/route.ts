// ✅ AUDIT COMPLETE [2025-01-15]
// - Has try/catch wrapper
// - Validates required fields (buildingId)
// - Uses proper Supabase queries with authentication
// - Returns meaningful error responses
// - Includes authentication check

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { buildingId } = body;

    if (!buildingId) {
      return NextResponse.json({ error: 'Building ID is required' }, { status: 400 });
    }

    console.log('🔄 Refreshing major works cache for building:', buildingId);

    // Fetch latest major works data
    const { data: majorWorksProjects, error: projectsError } = await supabase
      .from('major_works_projects')
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
      .eq('building_id', buildingId)
      .eq('is_active', true);

    if (projectsError) {
      console.error('Error fetching major works projects:', projectsError);
      return NextResponse.json({ error: 'Failed to refresh major works cache' }, { status: 500 });
    }

    // Calculate major works statistics
    const today = new Date();
    let overdueCount = 0;
    let activeCount = 0;
    let plannedCount = 0;
    let completedCount = 0;

    majorWorksProjects?.forEach(project => {
      const status = project.status || 'unknown';
      
      // Check if project is overdue
      if (project.expected_completion_date) {
        const expectedDate = new Date(project.expected_completion_date);
        const daysUntilDue = Math.ceil((expectedDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysUntilDue < 0 && status !== 'completed') {
          overdueCount++;
        }
      }

      // Categorize by status
      if (status === 'completed') {
        completedCount++;
      } else if (status === 'works_in_progress' || status === 'contractor_appointed') {
        activeCount++;
      } else {
        plannedCount++;
      }
    });

    // Calculate total costs
    const totalEstimatedCost = majorWorksProjects?.reduce((sum, project) => 
      sum + (project.estimated_cost || 0), 0) || 0;
    const totalActualCost = majorWorksProjects?.reduce((sum, project) => 
      sum + (project.actual_cost || 0), 0) || 0;

    const majorWorksSummary = {
      totalProjects: majorWorksProjects?.length || 0,
      overdue: overdueCount,
      active: activeCount,
      planned: plannedCount,
      completed: completedCount,
      totalEstimatedCost,
      totalActualCost,
      lastRefreshed: new Date().toISOString()
    };

    console.log('✅ Major works cache refreshed:', majorWorksSummary);

    return NextResponse.json({ 
      success: true,
      message: 'Major works cache refreshed successfully',
      summary: majorWorksSummary
    });

  } catch (error) {
    console.error('❌ Error in refresh-major-works-cache route:', error);
    return NextResponse.json({ 
      error: 'Failed to refresh major works cache',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 