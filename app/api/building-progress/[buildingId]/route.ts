import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  req: NextRequest,
  { params }: { params: { buildingId: string } }
) {
  try {
    const buildingId = params.buildingId;

    if (!buildingId) {
      return NextResponse.json({ error: 'Building ID is required' }, { status: 400 });
    }

    // Fetch task progress
    const { data: tasks, error: tasksError } = await supabase
      .from('building_tasks')
      .select('id, status, due_date')
      .eq('building_id', buildingId);

    if (tasksError) {
      console.error('Error fetching tasks:', tasksError);
      return NextResponse.json({ error: 'Failed to fetch task data' }, { status: 500 });
    }

    // Calculate task metrics
    const totalTasks = tasks?.length || 0;
    const completedTasks = tasks?.filter(task => task.status === 'Complete').length || 0;
    const overdueTasks = tasks?.filter(task => {
      if (!task.due_date || task.status === 'Complete') return false;
      return new Date(task.due_date) < new Date();
    }).length || 0;

    // Fetch latest inspection
    const { data: latestInspection, error: inspectionError } = await supabase
      .from('site_inspections')
      .select(`
        id,
        inspection_date,
        status,
        inspection_items (
          id,
          status
        )
      `)
      .eq('building_id', buildingId)
      .order('inspection_date', { ascending: false })
      .limit(1)
      .single();

    if (inspectionError && inspectionError.code !== 'PGRST116') {
      console.error('Error fetching inspection:', inspectionError);
      return NextResponse.json({ error: 'Failed to fetch inspection data' }, { status: 500 });
    }

    // Calculate inspection metrics
    let inspectionProgress = {
      totalItems: 0,
      okItems: 0,
      failedItems: 0,
      needsAttentionItems: 0,
      lastInspectionDate: null,
      lastInspectionStatus: null
    };

    if (latestInspection) {
      const items = latestInspection.inspection_items || [];
      inspectionProgress = {
        totalItems: items.length,
        okItems: items.filter(item => item.status === 'OK').length,
        failedItems: items.filter(item => item.status === 'Issue Found').length,
        needsAttentionItems: items.filter(item => item.status === 'Needs Attention').length,
        lastInspectionDate: latestInspection.inspection_date,
        lastInspectionStatus: latestInspection.status
      };
    }

    // Calculate percentages
    const taskCompletionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const inspectionCompletionPercentage = inspectionProgress.totalItems > 0 
      ? Math.round((inspectionProgress.okItems / inspectionProgress.totalItems) * 100) 
      : 0;

    // Determine overall status
    const hasWarnings = overdueTasks > 0 || inspectionProgress.failedItems > 0 || inspectionProgress.needsAttentionItems > 0;
    const overallStatus = hasWarnings ? 'warning' : 'good';

    const progressData = {
      tasks: {
        total: totalTasks,
        completed: completedTasks,
        overdue: overdueTasks,
        percentage: taskCompletionPercentage
      },
      inspection: {
        totalItems: inspectionProgress.totalItems,
        okItems: inspectionProgress.okItems,
        failedItems: inspectionProgress.failedItems,
        needsAttentionItems: inspectionProgress.needsAttentionItems,
        percentage: inspectionCompletionPercentage,
        lastInspectionDate: inspectionProgress.lastInspectionDate,
        lastInspectionStatus: inspectionProgress.lastInspectionStatus
      },
      overall: {
        status: overallStatus,
        hasWarnings
      }
    };

    return NextResponse.json({ success: true, data: progressData });

  } catch (error) {
    console.error('Building progress GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 